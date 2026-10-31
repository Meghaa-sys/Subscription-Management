"""Discount rules, where they are attached, and every time one was used."""
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q

from accounts.models import Customer
from billing.models import Invoice
from catalog.models import NON_NEGATIVE, Product, money_field
from subscriptions.models import Subscription


class Discount(models.Model):
    """An admin-defined rule: how much off, on what, when, and how many times."""

    class DiscountType(models.TextChoices):
        FIXED = "fixed", "Fixed amount"
        PERCENT = "percent", "Percentage"

    class AppliesTo(models.TextChoices):
        PRODUCT = "product", "Specific products"
        SUBSCRIPTION = "subscription", "Whole subscription"

    name = models.CharField(max_length=150)
    discount_type = models.CharField(max_length=10, choices=DiscountType)
    value = money_field(validators=NON_NEGATIVE)
    min_purchase = money_field(null=True, blank=True, validators=NON_NEGATIVE)
    min_quantity = models.PositiveIntegerField(null=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    usage_limit = models.PositiveIntegerField(
        null=True, blank=True, help_text="Empty means unlimited."
    )
    times_used = models.PositiveIntegerField(default=0)
    applies_to = models.CharField(max_length=15, choices=AppliesTo, default=AppliesTo.SUBSCRIPTION)
    products = models.ManyToManyField(Product, blank=True, related_name="discounts")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )

    class Meta:
        ordering = ["-id"]
        constraints = [
            models.CheckConstraint(condition=Q(value__gte=0), name="discount_value_non_negative"),
            models.CheckConstraint(
                condition=Q(min_purchase__isnull=True) | Q(min_purchase__gte=0),
                name="discount_min_purchase_non_negative",
            ),
            models.CheckConstraint(
                condition=Q(end_date__gte=F("start_date")), name="discount_end_not_before_start"
            ),
        ]

    def __str__(self):
        return self.name

    @property
    def remaining_uses(self):
        """Uses left, or None when the discount is unlimited."""
        if self.usage_limit is None:
            return None
        return max(self.usage_limit - self.times_used, 0)


class SubscriptionDiscount(models.Model):
    """A discount attached to a subscription. Billing applies it to each eligible invoice."""

    subscription = models.ForeignKey(
        Subscription, on_delete=models.PROTECT, related_name="subscription_discounts"
    )
    discount = models.ForeignKey(
        Discount, on_delete=models.PROTECT, related_name="subscription_discounts"
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["subscription", "discount"], name="unique_subscription_discount"
            ),
        ]

    def __str__(self):
        return f"{self.discount_id} on {self.subscription_id}"


class DiscountUsage(models.Model):
    """One discount applied on one invoice. Keeps usage counts auditable."""

    discount = models.ForeignKey(Discount, on_delete=models.PROTECT, related_name="usages")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="discount_usages")
    amount = money_field(validators=NON_NEGATIVE)
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        constraints = [
            models.UniqueConstraint(fields=["discount", "invoice"], name="unique_discount_invoice"),
            models.CheckConstraint(condition=Q(amount__gte=0), name="discount_usage_non_negative"),
        ]

    def __str__(self):
        return f"{self.amount} of {self.discount_id} on {self.invoice_id}"


class DiscountRequest(models.Model):
    """A customer asking for a discount. Staff forward or reject; admin decides."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        FORWARDED = "forwarded", "Forwarded"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="discount_requests")
    subscription = models.ForeignKey(
        Subscription, on_delete=models.PROTECT, related_name="discount_requests"
    )
    message = models.TextField()
    status = models.CharField(max_length=10, choices=Status, default=Status.PENDING, db_index=True)
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    discount = models.ForeignKey(
        Discount, on_delete=models.PROTECT, null=True, blank=True, related_name="requests"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"Request #{self.pk} ({self.status})"
