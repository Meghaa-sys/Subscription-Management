"""
The billing engine, the heart of the system.

The rule that keeps billing correct: one period is billed inside one transaction
with the subscription row locked, and next_billing_date always moves forward. The
unique constraint on (subscription, period_start) backs this up at database level.
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from common.exceptions import BusinessRuleError
from common.money import ZERO, money
from discounts.services import (
    eligible_lines,
    get_applicable_discounts,
    line_base,
    mark_discount_used,
    release_discount_usage,
)
from subscriptions.models import Subscription
from subscriptions.services import tax_for

from .models import Invoice, InvoiceLine, Payment

logger = logging.getLogger(__name__)


def allocate_discounts(applied, lines):
    """
    Spread discounts over lines in proportion to each line's value, only touching
    the lines a discount is eligible for. No line can go below zero, so a discount
    is trimmed if it exceeds what is left. Returns (shares by line id, [(discount,
    amount actually used)]).
    """
    remaining = {line.pk: line_base(line) for line in lines}
    shares = {line.pk: ZERO for line in lines}
    used = []

    for discount, amount in applied:
        weights = {
            line.pk: remaining[line.pk]
            for line in eligible_lines(discount, lines)
            if remaining[line.pk] > ZERO
        }
        room = sum(weights.values(), ZERO)
        amount = min(amount, room)
        if amount <= ZERO:
            continue

        left = amount
        for line_id, weight in weights.items():
            share = min(money(amount * weight / room), remaining[line_id], left)
            shares[line_id] += share
            remaining[line_id] -= share
            left -= share
        # Rounding can leave a few paise; give them to lines that still have room.
        for line_id in weights:
            share = min(left, remaining[line_id])
            shares[line_id] += share
            remaining[line_id] -= share
            left -= share
        used.append((discount, amount))

    return shares, used


def _describe(line):
    if line.variant:
        return f"{line.product.name} ({line.variant.label})"
    return line.product.name


def _fill_invoice(invoice, subscription, today):
    """Copy lines, apply discounts and taxes, and set the invoice totals."""
    lines = list(
        subscription.lines.select_related("product", "variant").prefetch_related("product__taxes")
    )
    subtotal = sum((line_base(line) for line in lines), ZERO)
    applied = get_applicable_discounts(subscription, lines, subtotal, today)
    shares, used = allocate_discounts(applied, lines)

    rows = []
    tax_total = ZERO
    for line in lines:
        taxable = line_base(line) - shares[line.pk]
        tax = tax_for(line.product, taxable)
        tax_total += tax
        rows.append(
            InvoiceLine(
                invoice=invoice,
                product=line.product,
                description=_describe(line),
                quantity=line.quantity,
                unit_price=line.unit_price,
                discount_amount=shares[line.pk],
                tax_amount=tax,
                line_total=taxable + tax,
            )
        )
    InvoiceLine.objects.bulk_create(rows)

    invoice.number = f"INV/{invoice.invoice_date.year}/{invoice.pk:05d}"
    invoice.subtotal = subtotal
    invoice.discount_total = sum((amount for _, amount in used), ZERO)
    invoice.tax_total = tax_total
    invoice.total = invoice.subtotal - invoice.discount_total + invoice.tax_total
    invoice.save()

    for discount, amount in used:
        mark_discount_used(discount, invoice, amount)


@transaction.atomic
def generate_invoice(subscription_id, today):
    """
    Bill the subscription's next period if it is due. Returns (invoice, created), or
    None when nothing is due. An invoice is never written for a period past
    expiry_date: the contract has ended, and renewing lets billing continue.
    """
    subscription = (
        Subscription.objects.select_for_update(of=("self",))
        .select_related("plan", "customer", "payment_term")
        .get(pk=subscription_id)
    )
    period_start = subscription.next_billing_date
    if subscription.status != Subscription.Status.ACTIVE or period_start is None or period_start > today:
        return None
    if subscription.expiry_date and period_start > subscription.expiry_date:
        return None

    period_end = period_start + subscription.plan.period_delta - timedelta(days=1)
    due_days = subscription.payment_term.due_days if subscription.payment_term else 0

    invoice, created = Invoice.objects.get_or_create(
        subscription=subscription,
        period_start=period_start,
        defaults={
            "customer": subscription.customer,
            "period_end": period_end,
            "invoice_date": today,
            "due_date": today + timedelta(days=due_days),
            "status": Invoice.Status.DRAFT,
        },
    )
    if created:
        _fill_invoice(invoice, subscription, today)

    # Always advance, even if the invoice existed, so catch-up loops terminate.
    subscription.next_billing_date = period_end + timedelta(days=1)
    subscription.save(update_fields=["next_billing_date", "updated_at"])
    return invoice, created


def run_billing(today=None):
    """
    Bill everything due, catching up any missed periods. Safe to run repeatedly: a
    second run for the same date creates nothing. One failing subscription is logged
    and counted without stopping the rest, and is picked up by the next run.
    """
    today = today or timezone.localdate()
    due_ids = list(
        Subscription.objects.filter(status=Subscription.Status.ACTIVE, next_billing_date__lte=today)
        .order_by("id")
        .values_list("id", flat=True)
    )

    created = skipped = failed = 0
    for subscription_id in due_ids:
        try:
            while True:
                result = generate_invoice(subscription_id, today)
                if result is None:
                    break
                if result[1]:
                    created += 1
                else:
                    skipped += 1
        except Exception:
            logger.exception("Billing failed for subscription %s", subscription_id)
            failed += 1

    return {
        "created": created,
        "skipped": skipped,
        "subscriptions_processed": len(due_ids),
        "failed": failed,
    }


# --- Invoice actions --------------------------------------------------------


def _lock_invoice(invoice_id):
    return Invoice.objects.select_for_update().get(pk=invoice_id)


@transaction.atomic
def confirm_invoice(invoice_id):
    """Draft to confirmed. An invoice fully covered by discounts has nothing to collect."""
    invoice = _lock_invoice(invoice_id)
    if invoice.status != Invoice.Status.DRAFT:
        raise BusinessRuleError(
            f"Only draft invoices can be confirmed; this one is {invoice.get_status_display()}."
        )
    invoice.status = Invoice.Status.PAID if invoice.total == ZERO else Invoice.Status.CONFIRMED
    invoice.save(update_fields=["status"])
    return invoice


@transaction.atomic
def cancel_invoice(invoice_id):
    """Cancel a draft or unpaid confirmed invoice and give back its discount uses."""
    invoice = _lock_invoice(invoice_id)
    if invoice.status not in (Invoice.Status.DRAFT, Invoice.Status.CONFIRMED):
        raise BusinessRuleError(f"A {invoice.get_status_display()} invoice cannot be cancelled.")
    if invoice.amount_paid != ZERO:
        raise BusinessRuleError("An invoice with payments cannot be cancelled.")
    invoice.status = Invoice.Status.CANCELLED
    invoice.save(update_fields=["status"])
    release_discount_usage(invoice)
    return invoice


def send_invoice(invoice_id):
    """Email the customer a summary and link. No row is locked while the email goes out."""
    invoice = Invoice.objects.select_related("customer").get(pk=invoice_id)
    if invoice.status not in (Invoice.Status.CONFIRMED, Invoice.Status.PAID):
        raise BusinessRuleError("Only confirmed or paid invoices can be sent.")

    link = f"{settings.FRONTEND_URL}/portal/invoices/{invoice.pk}"
    message = (
        f"Hi {invoice.customer.name},\n\n"
        f"Invoice {invoice.number} for the period {invoice.period_start} to {invoice.period_end}.\n\n"
        f"Total: {invoice.total}\n"
        f"Paid: {invoice.amount_paid}\n"
        f"Balance due: {invoice.balance}\n"
        f"Due date: {invoice.due_date}\n\n"
        f"View your invoice: {link}"
    )
    try:
        send_mail(f"Invoice {invoice.number} from Brightloop", message, None, [invoice.customer.email])
    except Exception:
        logger.exception("Could not send invoice %s", invoice.pk)
        raise BusinessRuleError("The invoice email could not be sent. Please try again.")

    invoice.sent_at = timezone.now()
    invoice.save(update_fields=["sent_at"])
    return invoice


BULK_ACTIONS = {"confirm": confirm_invoice, "send": send_invoice}


def bulk_invoice_action(action, ids):
    """Run an action on many invoices. Each one succeeds or fails on its own."""
    results = []
    for invoice_id in dict.fromkeys(ids):
        try:
            invoice = BULK_ACTIONS[action](invoice_id)
        except Invoice.DoesNotExist:
            results.append(
                {"id": invoice_id, "success": False, "status": None, "error": "Invoice not found."}
            )
        except BusinessRuleError as error:
            results.append(
                {"id": invoice_id, "success": False, "status": None, "error": str(error.detail)}
            )
        else:
            results.append({"id": invoice_id, "success": True, "status": invoice.status, "error": None})

    succeeded = sum(1 for row in results if row["success"])
    return {"succeeded": succeeded, "failed": len(results) - succeeded, "results": results}


# --- Payments ---------------------------------------------------------------


@transaction.atomic
def record_payment(invoice_id, method, amount, payment_date, actor, note=""):
    """
    Record money received. The invoice row is locked so two simultaneous payments
    cannot both pass the balance check.
    """
    invoice = _lock_invoice(invoice_id)
    if invoice.status != Invoice.Status.CONFIRMED:
        raise BusinessRuleError(
            "Payments can only be recorded on confirmed invoices; "
            f"this one is {invoice.get_status_display()}."
        )
    if amount <= ZERO or amount > invoice.balance:
        raise BusinessRuleError(
            f"The payment amount must be more than 0 and at most the balance of {invoice.balance}."
        )

    payment = Payment.objects.create(
        invoice=invoice,
        method=method,
        amount=amount,
        payment_date=payment_date,
        note=note,
        recorded_by=actor,
    )
    invoice.amount_paid += amount
    if invoice.amount_paid >= invoice.total:
        invoice.status = Invoice.Status.PAID
    invoice.save(update_fields=["amount_paid", "status"])
    return payment
