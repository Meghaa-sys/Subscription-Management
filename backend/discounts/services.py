"""Discount business logic."""
from decimal import Decimal

from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone
from rest_framework.exceptions import NotFound

from common.exceptions import BusinessRuleError
from common.money import ZERO, money
from subscriptions.models import Subscription

from .models import Discount, DiscountRequest, DiscountUsage, SubscriptionDiscount

RequestStatus = DiscountRequest.Status


def line_base(line):
    """A line's value before discount and tax."""
    return money(line.unit_price * line.quantity)


def eligible_lines(discount, lines):
    """The lines a discount can touch."""
    if discount.applies_to == Discount.AppliesTo.SUBSCRIPTION:
        return list(lines)
    product_ids = {product.id for product in discount.products.all()}
    return [line for line in lines if line.product_id in product_ids]


def get_applicable_discounts(sub, lines, subtotal, today):
    """
    Return [(discount, amount)] for the discounts that apply to this billing run:
    attached, active, in date, under their usage limit, and meeting the minimums.
    Must run inside a transaction: the rows stay locked until usage is recorded, so
    concurrent billing cannot push a discount past its usage limit.
    """
    candidates = (
        Discount.objects.select_for_update(of=("self",))
        .filter(
            subscription_discounts__subscription=sub,
            is_active=True,
            start_date__lte=today,
            end_date__gte=today,
        )
        .filter(Q(usage_limit__isnull=True) | Q(times_used__lt=F("usage_limit")))
        .prefetch_related("products")
        .order_by("id")
    )
    total_quantity = sum(line.quantity for line in lines)

    applied = []
    for discount in candidates:
        if discount.min_purchase is not None and subtotal < discount.min_purchase:
            continue
        if discount.min_quantity is not None and total_quantity < discount.min_quantity:
            continue

        base = sum((line_base(line) for line in eligible_lines(discount, lines)), ZERO)
        if discount.discount_type == Discount.DiscountType.PERCENT:
            amount = money(base * discount.value / Decimal("100"))
        else:
            amount = money(min(discount.value, base))
        if amount > ZERO:
            applied.append((discount, amount))
    return applied


def mark_discount_used(discount, invoice, amount):
    """Record that a discount was used on an invoice and count it against the limit."""
    DiscountUsage.objects.create(discount=discount, invoice=invoice, amount=amount)
    Discount.objects.filter(pk=discount.pk).update(times_used=F("times_used") + 1)


def release_discount_usage(invoice):
    """Give back the uses of a cancelled invoice, since nothing was charged."""
    usages = list(invoice.discount_usages.all())
    for usage in usages:
        Discount.objects.filter(pk=usage.discount_id, times_used__gt=0).update(
            times_used=F("times_used") - 1
        )
    invoice.discount_usages.all().delete()


# --- Attaching discounts to subscriptions ------------------------------------


@transaction.atomic
def attach_discount(subscription_id, discount, actor):
    """Attach a usable discount. It then applies to invoices automatically."""
    subscription = Subscription.objects.select_for_update().get(pk=subscription_id)
    today = timezone.localdate()
    if subscription.status == Subscription.Status.CLOSED:
        raise BusinessRuleError("Discounts cannot be added to a closed subscription.")
    if not discount.is_active or discount.end_date < today:
        raise BusinessRuleError(f"{discount.name} is not active.")
    if discount.remaining_uses == 0:
        raise BusinessRuleError(f"{discount.name} has reached its usage limit.")
    link, created = SubscriptionDiscount.objects.get_or_create(
        subscription=subscription, discount=discount, defaults={"added_by": actor}
    )
    if not created:
        raise BusinessRuleError(f"{discount.name} is already on this subscription.")
    return link


def detach_discount(subscription_id, discount_id):
    """Remove a discount. Invoices already issued keep theirs."""
    deleted, _ = SubscriptionDiscount.objects.filter(
        subscription_id=subscription_id, discount_id=discount_id
    ).delete()
    if not deleted:
        raise NotFound("This discount is not on the subscription.")


# --- Discount requests -------------------------------------------------------


def create_discount_request(user, subscription, message):
    """A customer asks for a discount on one of their own subscriptions."""
    customer = getattr(user, "customer_profile", None)
    if customer is None or subscription.customer_id != customer.id:
        raise NotFound("Subscription not found.")
    return DiscountRequest.objects.create(
        customer=customer, subscription=subscription, message=message
    )


def _lock_request(request_id, allowed_from, action):
    discount_request = DiscountRequest.objects.select_for_update().get(pk=request_id)
    if discount_request.status not in allowed_from:
        raise BusinessRuleError(
            f"A {discount_request.get_status_display()} request cannot be {action}."
        )
    return discount_request


def _finish(discount_request, status, actor):
    discount_request.status = status
    discount_request.handled_by = actor
    discount_request.save()
    return discount_request


@transaction.atomic
def forward_request(request_id, actor):
    """Staff pass a pending request to the admin."""
    discount_request = _lock_request(request_id, (RequestStatus.PENDING,), "forwarded")
    return _finish(discount_request, RequestStatus.FORWARDED, actor)


@transaction.atomic
def reject_request(request_id, actor):
    """Staff or admin turn down an open request."""
    discount_request = _lock_request(
        request_id, (RequestStatus.PENDING, RequestStatus.FORWARDED), "rejected"
    )
    return _finish(discount_request, RequestStatus.REJECTED, actor)


@transaction.atomic
def approve_request(request_id, actor, discount=None):
    """Admin approves an open request, optionally attaching a discount with it."""
    discount_request = _lock_request(
        request_id, (RequestStatus.PENDING, RequestStatus.FORWARDED), "approved"
    )
    if discount is not None:
        attach_discount(discount_request.subscription_id, discount, actor)
        discount_request.discount = discount
    return _finish(discount_request, RequestStatus.APPROVED, actor)
