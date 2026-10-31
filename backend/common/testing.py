"""Small factories shared by the test suites."""
from datetime import date
from decimal import Decimal

from accounts.models import Customer, User
from catalog.models import Product, RecurringPlan, Tax
from subscriptions.models import Subscription, SubscriptionLine
from subscriptions.services import compute_line

PASSWORD = "Valid@1234"


def make_admin(email="admin@example.com"):
    return User.objects.create_superuser(email=email, password=PASSWORD, name="Admin")


def make_staff(email="staff@example.com"):
    return User.objects.create_user(email=email, password=PASSWORD, name="Staff", role=User.Role.STAFF)


def make_customer(email="customer@example.com", name="Customer"):
    """A portal customer: returns (user, customer record)."""
    user = User.objects.create_user(email=email, password=PASSWORD, name=name)
    return user, Customer.objects.create(user=user, name=name, email=email)


def make_plan(**overrides):
    defaults = {
        "name": "Monthly",
        "price": "100.00",
        "billing_period": RecurringPlan.BillingPeriod.MONTHLY,
        "start_date": date(2020, 1, 1),
    }
    return RecurringPlan.objects.create(**{**defaults, **overrides})


def make_product(name="CRM", price="1000.00", taxes=(), **overrides):
    product = Product.objects.create(name=name, sales_price=Decimal(price), **overrides)
    product.taxes.set(taxes)
    return product


def make_percent_tax(rate="18.00", name="GST"):
    return Tax.objects.create(name=name, tax_type=Tax.TaxType.PERCENT, rate=Decimal(rate))


def make_fixed_tax(rate="50.00", name="Service fee"):
    return Tax.objects.create(name=name, tax_type=Tax.TaxType.FIXED, rate=Decimal(rate))


def make_subscription(customer, plan, lines, status=Subscription.Status.ACTIVE, **overrides):
    """Build a subscription directly in any status. `lines` is [(product, quantity), ...]."""
    start_date = overrides.pop("start_date", date(2026, 1, 1))
    if status == Subscription.Status.ACTIVE:
        overrides.setdefault("next_billing_date", start_date)
    subscription = Subscription.objects.create(
        customer=customer, plan=plan, status=status, start_date=start_date, **overrides
    )
    for product, quantity in lines:
        unit_price, tax_amount, amount = compute_line(product, None, quantity)
        SubscriptionLine.objects.create(
            subscription=subscription,
            product=product,
            quantity=quantity,
            unit_price=unit_price,
            tax_amount=tax_amount,
            amount=amount,
        )
    return subscription
