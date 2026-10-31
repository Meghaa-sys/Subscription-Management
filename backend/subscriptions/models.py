"""Quotation templates and the subscriptions at the centre of the business."""
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from catalog.models import PaymentTerm, Product, ProductVariant, RecurringPlan, money_field
from accounts.models import Customer

MIN_ONE = [MinValueValidator(1)]


class QuotationTemplate(models.Model):
    """A preset plan and product lines that sales reps start a quotation from."""

    name = models.CharField(max_length=150)
    plan = models.ForeignKey(RecurringPlan, on_delete=models.PROTECT, related_name="templates")
    validity_days = models.PositiveIntegerField(default=30)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.name


class QuotationTemplateLine(models.Model):
    """One preset product line on a quotation template."""

    template = models.ForeignKey(QuotationTemplate, on_delete=models.CASCADE, related_name="lines")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="+")
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    quantity = models.PositiveIntegerField(default=1, validators=MIN_ONE)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gte=1), name="template_line_quantity_min_1"),
        ]

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"


class Subscription(models.Model):
    """
    A customer's ongoing contract. `status` moves only through
    services.transition_subscription and `next_billing_date` drives the billing engine.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        QUOTATION = "quotation", "Quotation"
        CONFIRMED = "confirmed", "Confirmed"
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        CLOSED = "closed", "Closed"

    number = models.CharField(max_length=20, unique=True, null=True, blank=True, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="subscriptions")
    plan = models.ForeignKey(RecurringPlan, on_delete=models.PROTECT, related_name="subscriptions")
    template = models.ForeignKey(
        QuotationTemplate,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="subscriptions",
    )
    salesperson = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sold_subscriptions",
    )
    start_date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    next_billing_date = models.DateField(null=True, blank=True, db_index=True)
    quote_valid_until = models.DateField(null=True, blank=True)
    payment_term = models.ForeignKey(
        PaymentTerm, on_delete=models.PROTECT, null=True, blank=True, related_name="subscriptions"
    )
    status = models.CharField(
        max_length=10, choices=Status, default=Status.DRAFT, db_index=True
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.number or f"Subscription #{self.pk}"

    def save(self, *args, **kwargs):
        """The number comes from the id, so it is assigned right after the first save."""
        super().save(*args, **kwargs)
        if self.number is None:
            self.number = f"SUB-{self.pk:05d}"
            super().save(update_fields=["number"])

    @property
    def subtotal(self):
        return sum((line.amount for line in self.lines.all()), Decimal("0.00"))

    @property
    def tax_total(self):
        return sum((line.tax_amount for line in self.lines.all()), Decimal("0.00"))

    @property
    def total(self):
        return self.subtotal + self.tax_total


class SubscriptionLine(models.Model):
    """
    A product on a subscription. `amount` is quantity x unit_price before tax and
    `tax_amount` is the tax on it, so recurring revenue never counts tax.
    """

    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="lines")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="+")
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    quantity = models.PositiveIntegerField(default=1, validators=MIN_ONE)
    unit_price = money_field()
    tax_amount = money_field(default=0)
    amount = money_field()

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gte=1), name="sub_line_quantity_min_1"),
            models.CheckConstraint(
                condition=Q(unit_price__gte=0, tax_amount__gte=0, amount__gte=0),
                name="sub_line_amounts_non_negative",
            ),
        ]

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"

    @property
    def line_total(self):
        return self.amount + self.tax_amount


class SubscriptionStatusHistory(models.Model):
    """Audit trail: who moved a subscription, when, and why."""

    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="history")
    from_status = models.CharField(max_length=10, choices=Subscription.Status, blank=True)
    to_status = models.CharField(max_length=10, choices=Subscription.Status)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-id"]
        verbose_name_plural = "subscription status history"

    def __str__(self):
        return f"{self.subscription_id}: {self.from_status or 'new'} -> {self.to_status}"
