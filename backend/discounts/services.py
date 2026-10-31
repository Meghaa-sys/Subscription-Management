"""Discount business logic."""
from decimal import Decimal

from django.db.models import F, Q

from common.money import ZERO, money

from .models import Discount, DiscountUsage


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
