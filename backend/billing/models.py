"""Invoices and payments: the money side of a subscription."""
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from accounts.models import Customer
from catalog.models import Product, money_field
from subscriptions.models import Subscription


class Invoice(models.Model):
    """
    One billing period of a subscription. The unique constraint on
    (subscription, period_start) is the database-level guarantee against double billing.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        CONFIRMED = "confirmed", "Confirmed"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    number = models.CharField(max_length=30, unique=True, null=True, blank=True, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.PROTECT, related_name="invoices")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="invoices")
    period_start = models.DateField()
    period_end = models.DateField()
    invoice_date = models.DateField(db_index=True)
    due_date = models.DateField(db_index=True)
    subtotal = money_field(default=0)
    discount_total = money_field(default=0)
    tax_total = money_field(default=0)
    total = money_field(default=0)
    amount_paid = money_field(default=0)
    status = models.CharField(max_length=10, choices=Status, default=Status.DRAFT, db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["subscription", "period_start"], name="unique_invoice_per_period"
            ),
            models.CheckConstraint(
                condition=Q(amount_paid__gte=0, amount_paid__lte=F("total")),
                name="invoice_amount_paid_within_total",
            ),
            models.CheckConstraint(
                condition=Q(
                    subtotal__gte=0, discount_total__gte=0, tax_total__gte=0, total__gte=0
                ),
                name="invoice_amounts_non_negative",
            ),
        ]

    def __str__(self):
        return self.number or f"Invoice #{self.pk}"

    @property
    def balance(self):
        return self.total - self.amount_paid

    @property
    def is_overdue(self):
        """Computed from today's date, never stored."""
        return self.status == self.Status.CONFIRMED and self.due_date < timezone.localdate()

    @property
    def days_overdue(self):
        return (timezone.localdate() - self.due_date).days if self.is_overdue else 0


class InvoiceLine(models.Model):
    """
    A billed line. Every value is copied at billing time and never recomputed,
    so old invoices do not change when prices change.
    """

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="lines")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="+")
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = money_field()
    discount_amount = money_field(default=0)
    tax_amount = money_field(default=0)
    line_total = money_field()

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gte=1), name="invoice_line_quantity_min_1"),
            models.CheckConstraint(
                condition=Q(
                    unit_price__gte=0, discount_amount__gte=0, tax_amount__gte=0, line_total__gte=0
                ),
                name="invoice_line_amounts_non_negative",
            ),
        ]

    def __str__(self):
        return self.description


class Payment(models.Model):
    """Money received against one invoice. An invoice can have several payments."""

    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        BANK_TRANSFER = "bank_transfer", "Bank transfer"
        CARD = "card", "Card"
        UPI = "upi", "UPI"
        CHEQUE = "cheque", "Cheque"

    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="payments")
    method = models.CharField(max_length=20, choices=Method)
    amount = money_field()
    payment_date = models.DateField(db_index=True)
    note = models.CharField(max_length=255, blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="payment_amount_positive"),
        ]

    def __str__(self):
        return f"{self.amount} on {self.invoice_id}"
