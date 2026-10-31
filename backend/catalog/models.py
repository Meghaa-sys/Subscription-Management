"""What Brightloop sells: products, variants, taxes, plans and payment terms."""
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q

NON_NEGATIVE = [MinValueValidator(Decimal("0"))]


def money_field(**kwargs):
    """Every money column in this system has the same precision."""
    return models.DecimalField(max_digits=12, decimal_places=2, **kwargs)


class Tax(models.Model):
    """An admin-defined tax rule. Products point at the taxes that apply to them."""

    class TaxType(models.TextChoices):
        PERCENT = "percent", "Percentage"
        FIXED = "fixed", "Fixed amount"

    name = models.CharField(max_length=100)
    tax_type = models.CharField(max_length=10, choices=TaxType, default=TaxType.PERCENT)
    rate = money_field(validators=NON_NEGATIVE, help_text="Percent, or a fixed amount per line.")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-id"]
        verbose_name_plural = "taxes"
        constraints = [
            models.CheckConstraint(condition=Q(rate__gte=0), name="tax_rate_non_negative"),
        ]

    def __str__(self):
        return self.name


class Product(models.Model):
    """Something Brightloop sells on subscription: a service, goods or an add-on."""

    class ProductType(models.TextChoices):
        SERVICE = "service", "Service"
        GOODS = "goods", "Goods"
        ADDON = "addon", "Add-on"

    name = models.CharField(max_length=150)
    product_type = models.CharField(max_length=10, choices=ProductType, default=ProductType.SERVICE)
    sales_price = money_field(validators=NON_NEGATIVE)
    cost_price = money_field(validators=NON_NEGATIVE, default=0)
    notes = models.TextField(blank=True)
    taxes = models.ManyToManyField(Tax, blank=True, related_name="products")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(sales_price__gte=0, cost_price__gte=0),
                name="product_prices_non_negative",
            ),
        ]

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    """A choice on a product, such as Brand = Odoo, that adds an extra price."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    attribute = models.CharField(max_length=100)
    value = models.CharField(max_length=100)
    extra_price = money_field(validators=NON_NEGATIVE, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(extra_price__gte=0), name="variant_extra_price_non_negative"
            ),
        ]

    def __str__(self):
        return f"{self.product.name} ({self.label})"

    @property
    def label(self):
        return f"{self.attribute}: {self.value}"


class RecurringPlan(models.Model):
    """How often a subscription bills, plus the switches for its allowed lifecycle."""

    class BillingPeriod(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    name = models.CharField(max_length=150)
    price = money_field(validators=NON_NEGATIVE)
    billing_period = models.CharField(
        max_length=10, choices=BillingPeriod, default=BillingPeriod.MONTHLY
    )
    min_quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    auto_close = models.BooleanField(default=False, help_text="Close automatically at expiry.")
    closable = models.BooleanField(default=True, help_text="Can be closed before expiry.")
    pausable = models.BooleanField(default=True)
    renewable = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-id"]
        constraints = [
            models.CheckConstraint(condition=Q(price__gte=0), name="plan_price_non_negative"),
            models.CheckConstraint(condition=Q(min_quantity__gte=1), name="plan_min_quantity_min_1"),
            models.CheckConstraint(
                condition=Q(end_date__isnull=True) | Q(end_date__gt=F("start_date")),
                name="plan_end_after_start",
            ),
        ]

    def __str__(self):
        return self.name

    @property
    def period_delta(self):
        """The length of one billing period, using calendar months and years."""
        return {
            self.BillingPeriod.DAILY: relativedelta(days=1),
            self.BillingPeriod.WEEKLY: relativedelta(weeks=1),
            self.BillingPeriod.MONTHLY: relativedelta(months=1),
            self.BillingPeriod.YEARLY: relativedelta(years=1),
        }[self.billing_period]

    def is_available_on(self, date):
        """True if a new subscription may start on this date."""
        if not self.is_active or date < self.start_date:
            return False
        return self.end_date is None or date <= self.end_date


class PaymentTerm(models.Model):
    """How many days a customer has to pay an invoice."""

    name = models.CharField(max_length=100)
    due_days = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.name
