"""Subscription business logic: pricing, lifecycle, add-ons and templates."""
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from catalog.models import Product, Tax
from common.exceptions import BusinessRuleError
from common.money import ZERO, money

from .models import (
    QuotationTemplate,
    QuotationTemplateLine,
    Subscription,
    SubscriptionLine,
    SubscriptionStatusHistory,
)

Status = Subscription.Status

ALLOWED_TRANSITIONS = {
    Status.DRAFT: [Status.QUOTATION],
    Status.QUOTATION: [Status.CONFIRMED, Status.DRAFT],
    Status.CONFIRMED: [Status.ACTIVE],
    Status.ACTIVE: [Status.PAUSED, Status.CLOSED],
    Status.PAUSED: [Status.ACTIVE, Status.CLOSED],
    Status.CLOSED: [],
}

EDITABLE_STATUSES = (Status.DRAFT, Status.QUOTATION)
CUSTOMER_TRANSITIONS = {(Status.ACTIVE, Status.PAUSED), (Status.PAUSED, Status.ACTIVE)}


# --- Pricing ---------------------------------------------------------------


def tax_for(product, base):
    """Total of the product's active taxes on `base`. Fixed taxes apply once per line."""
    total = Decimal("0")
    for tax in product.taxes.all():
        if not tax.is_active:
            continue
        if tax.tax_type == Tax.TaxType.PERCENT:
            total += base * tax.rate / Decimal("100")
        else:
            total += tax.rate
    return money(total)


def compute_line(product, variant, quantity, unit_price=None):
    """
    Price one line. Returns (unit_price, tax_amount, amount). The default unit price
    is the product's sales price plus the variant's extra price; amount excludes tax.
    """
    if unit_price is None:
        unit_price = product.sales_price + (variant.extra_price if variant else ZERO)
    unit_price = money(unit_price)
    amount = money(unit_price * quantity)
    return unit_price, tax_for(product, amount), amount


# --- Validation ------------------------------------------------------------


def validate_line_product(product, variant):
    """A line needs an active product, and a variant must belong to that product."""
    if not product.is_active:
        raise BusinessRuleError(f"{product.name} is no longer available.")
    if variant is None:
        return
    if variant.product_id != product.id:
        raise BusinessRuleError(f"{variant.label} is not a variant of {product.name}.")
    if not variant.is_active:
        raise BusinessRuleError(f"{variant.label} is no longer available.")


def validate_lines(plan, lines):
    """Validate line dicts against the plan. Add-ons are exempt from the plan minimum."""
    for line in lines:
        product = line["product"]
        validate_line_product(product, line.get("variant"))
        is_addon = product.product_type == Product.ProductType.ADDON
        if not is_addon and line["quantity"] < plan.min_quantity:
            raise BusinessRuleError(
                f"{product.name}: quantity must be at least {plan.min_quantity} on the {plan.name} plan."
            )


def _validate_terms(plan, start_date, expiry_date):
    if not plan.is_available_on(start_date):
        raise BusinessRuleError(f"The {plan.name} plan is not available on {start_date}.")
    if expiry_date and expiry_date <= start_date:
        raise BusinessRuleError("Expiry date must be after the start date.")


# --- Create and edit -------------------------------------------------------


def _write_history(subscription, from_status, to_status, actor, note=""):
    SubscriptionStatusHistory.objects.create(
        subscription=subscription,
        from_status=from_status,
        to_status=to_status,
        changed_by=actor,
        note=note,
    )


def _create_lines(subscription, lines):
    rows = []
    for line in lines:
        unit_price, tax_amount, amount = compute_line(
            line["product"], line.get("variant"), line["quantity"], line.get("unit_price")
        )
        rows.append(
            SubscriptionLine(
                subscription=subscription,
                product=line["product"],
                variant=line.get("variant"),
                quantity=line["quantity"],
                unit_price=unit_price,
                tax_amount=tax_amount,
                amount=amount,
            )
        )
    SubscriptionLine.objects.bulk_create(rows)


@transaction.atomic
def create_subscription(data, actor):
    """Create a draft subscription with its lines. Salesperson defaults to the creator."""
    lines = data.pop("lines", [])
    _validate_terms(data["plan"], data["start_date"], data.get("expiry_date"))
    validate_lines(data["plan"], lines)
    if data.get("salesperson") is None:
        data["salesperson"] = actor
    subscription = Subscription.objects.create(**data)
    _create_lines(subscription, lines)
    _write_history(subscription, "", Status.DRAFT, actor, "Created")
    return subscription


@transaction.atomic
def update_subscription(subscription_id, data, actor):
    """Edit a subscription and its lines. Only drafts and quotations can be edited."""
    subscription = Subscription.objects.select_for_update().get(pk=subscription_id)
    if subscription.status not in EDITABLE_STATUSES:
        raise BusinessRuleError(
            f"A subscription can only be edited in draft or quotation, not {subscription.get_status_display()}."
        )

    lines = data.pop("lines", None)
    for field, value in data.items():
        setattr(subscription, field, value)

    _validate_terms(subscription.plan, subscription.start_date, subscription.expiry_date)
    if lines is None:
        current = subscription.lines.select_related("product", "variant")
        validate_lines(
            subscription.plan,
            [{"product": l.product, "variant": l.variant, "quantity": l.quantity} for l in current],
        )
    else:
        validate_lines(subscription.plan, lines)
        subscription.lines.all().delete()
        _create_lines(subscription, lines)

    subscription.save()
    return subscription


@transaction.atomic
def delete_subscription(subscription_id):
    """Delete a subscription. Only drafts can go; anything later is kept for audit."""
    subscription = Subscription.objects.select_for_update().get(pk=subscription_id)
    if subscription.status != Status.DRAFT:
        raise BusinessRuleError("Only draft subscriptions can be deleted.")
    subscription.subscription_discounts.all().delete()
    subscription.delete()


# --- Lifecycle -------------------------------------------------------------


def _guard_transition(subscription, to_status, actor, today):
    """Raise if this transition is not allowed right now."""
    from_status = subscription.status
    plan = subscription.plan

    if actor is not None and actor.is_customer_role and (from_status, to_status) not in CUSTOMER_TRANSITIONS:
        raise PermissionDenied("Customers can only pause or resume their own subscriptions.")

    if to_status not in ALLOWED_TRANSITIONS[from_status]:
        raise BusinessRuleError(
            f"A {Status(from_status).label} subscription cannot move to {Status(to_status).label}."
        )
    if to_status == Status.PAUSED and not plan.pausable:
        raise BusinessRuleError(f"The {plan.name} plan does not allow pausing.")
    if to_status == Status.CLOSED and not plan.closable:
        if subscription.expiry_date and today < subscription.expiry_date:
            raise BusinessRuleError(
                f"The {plan.name} plan cannot be closed before its expiry date, {subscription.expiry_date}."
            )
    if to_status == Status.CONFIRMED:
        if subscription.quote_valid_until and subscription.quote_valid_until < today:
            raise BusinessRuleError(f"This quotation expired on {subscription.quote_valid_until}.")
        if not subscription.lines.exists():
            raise BusinessRuleError("Add at least one product line before confirming.")


@transaction.atomic
def transition_subscription(subscription_id, to_status, actor=None, note=""):
    """
    The only way a subscription changes status. Applies the rules, sets the billing
    date and writes history in one transaction. `actor=None` means the system.
    """
    subscription = (
        Subscription.objects.select_for_update(of=("self",))
        .select_related("plan")
        .get(pk=subscription_id)
    )
    today = timezone.localdate()
    _guard_transition(subscription, to_status, actor, today)

    from_status = subscription.status
    if to_status == Status.ACTIVE:
        if from_status == Status.CONFIRMED:
            subscription.next_billing_date = subscription.start_date
        else:
            # Resuming: paused time is never billed.
            subscription.next_billing_date = max(subscription.next_billing_date, today)

    subscription.status = to_status
    subscription.save(update_fields=["status", "next_billing_date", "updated_at"])
    _write_history(subscription, from_status, to_status, actor, note)
    return subscription


@transaction.atomic
def renew_subscription(subscription_id, actor=None, note=""):
    """Extend the expiry date by one billing period, when the plan allows it."""
    subscription = (
        Subscription.objects.select_for_update(of=("self",))
        .select_related("plan")
        .get(pk=subscription_id)
    )
    if not subscription.plan.renewable:
        raise BusinessRuleError(f"The {subscription.plan.name} plan is not renewable.")
    if subscription.status not in (Status.ACTIVE, Status.PAUSED):
        raise BusinessRuleError("Only active or paused subscriptions can be renewed.")
    if subscription.expiry_date is None:
        raise BusinessRuleError("This subscription has no expiry date, so it does not need renewing.")

    subscription.expiry_date += subscription.plan.period_delta
    subscription.save(update_fields=["expiry_date", "updated_at"])
    _write_history(
        subscription,
        subscription.status,
        subscription.status,
        actor,
        note or f"Renewed until {subscription.expiry_date}",
    )
    return subscription


def close_expired(today=None):
    """Close auto-closing subscriptions past their expiry date. Returns how many closed."""
    today = today or timezone.localdate()
    due = Subscription.objects.filter(
        status__in=(Status.ACTIVE, Status.PAUSED),
        expiry_date__lt=today,
        plan__auto_close=True,
    ).values_list("id", flat=True)

    closed = 0
    for subscription_id in list(due):
        transition_subscription(subscription_id, Status.CLOSED, note="Expired: closed automatically")
        closed += 1
    return closed


# --- Add-ons on active subscriptions ---------------------------------------


def _lock_active(subscription_id):
    subscription = (
        Subscription.objects.select_for_update(of=("self",))
        .select_related("plan")
        .get(pk=subscription_id)
    )
    if subscription.status != Status.ACTIVE:
        raise BusinessRuleError("Add-ons can only be changed on an active subscription.")
    return subscription


@transaction.atomic
def add_addon_line(subscription_id, line):
    """Switch an add-on on. The next invoice picks it up; past invoices never change."""
    subscription = _lock_active(subscription_id)
    if line["product"].product_type != Product.ProductType.ADDON:
        raise BusinessRuleError("Only add-on products can be added to an active subscription.")
    validate_line_product(line["product"], line.get("variant"))
    _create_lines(subscription, [line])
    return subscription


@transaction.atomic
def remove_addon_line(subscription_id, line_id):
    """Switch an add-on off. The next invoice no longer includes it."""
    subscription = _lock_active(subscription_id)
    line = subscription.lines.select_related("product").filter(pk=line_id).first()
    if line is None:
        raise BusinessRuleError("This line is not on the subscription.")
    if line.product.product_type != Product.ProductType.ADDON:
        raise BusinessRuleError("Only add-on lines can be removed from an active subscription.")
    line.delete()
    return subscription


# --- Quotation templates ---------------------------------------------------


@transaction.atomic
def save_template(template, data):
    """Save a template. When `lines` is given it replaces all existing lines."""
    lines = data.pop("lines", None)
    for field, value in data.items():
        setattr(template, field, value)

    plan = template.plan
    if lines is not None:
        validate_lines(plan, lines)
    template.save()
    if lines is not None:
        template.lines.all().delete()
        QuotationTemplateLine.objects.bulk_create(
            QuotationTemplateLine(template=template, **line) for line in lines
        )
    return template


@transaction.atomic
def create_subscription_from_template(template_id, customer, start_date, actor, payment_term=None):
    """Start a quotation from a template, copying its lines at current prices."""
    template = (
        QuotationTemplate.objects.select_related("plan")
        .prefetch_related("lines__product__taxes", "lines__variant")
        .get(pk=template_id)
    )
    if not template.is_active:
        raise BusinessRuleError("This quotation template is no longer active.")

    lines = [
        {"product": line.product, "variant": line.variant, "quantity": line.quantity}
        for line in template.lines.all()
    ]
    _validate_terms(template.plan, start_date, None)
    validate_lines(template.plan, lines)

    subscription = Subscription.objects.create(
        customer=customer,
        plan=template.plan,
        template=template,
        salesperson=actor,
        start_date=start_date,
        payment_term=payment_term,
        quote_valid_until=timezone.localdate() + timedelta(days=template.validity_days),
        status=Status.QUOTATION,
        notes=template.notes,
    )
    _create_lines(subscription, lines)
    _write_history(subscription, "", Status.QUOTATION, actor, f"Created from template {template.name}")
    return subscription
