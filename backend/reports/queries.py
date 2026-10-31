"""
Report queries as plain functions, kept apart from the views so they can be tuned
on their own. All aggregation happens in the database. date_from and date_to are
optional: payments filter on payment_date, invoices on invoice_date, and
subscriptions on start_date.
"""
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from billing.models import Invoice, Payment
from catalog.models import RecurringPlan
from common.money import ZERO, money
from subscriptions.models import Subscription, SubscriptionLine

BALANCE = ExpressionWrapper(
    F("total") - F("amount_paid"), output_field=DecimalField(max_digits=12, decimal_places=2)
)

# How many monthly amounts one billing period is worth, as (numerator, denominator).
MONTHLY_FACTORS = {
    RecurringPlan.BillingPeriod.DAILY: (365, 12),
    RecurringPlan.BillingPeriod.WEEKLY: (52, 12),
    RecurringPlan.BillingPeriod.MONTHLY: (1, 1),
    RecurringPlan.BillingPeriod.YEARLY: (1, 12),
}


def _in_range(queryset, field, date_from=None, date_to=None):
    if date_from:
        queryset = queryset.filter(**{f"{field}__gte": date_from})
    if date_to:
        queryset = queryset.filter(**{f"{field}__lte": date_to})
    return queryset


def monthly_recurring_revenue():
    """Pre-tax line amounts of active subscriptions, normalised to one month."""
    totals = (
        SubscriptionLine.objects.filter(subscription__status=Subscription.Status.ACTIVE)
        .values("subscription__plan__billing_period")
        .annotate(amount=Sum("amount"))
        .order_by()
    )
    mrr = Decimal("0")
    for row in totals:
        numerator, denominator = MONTHLY_FACTORS[row["subscription__plan__billing_period"]]
        mrr += row["amount"] * numerator / denominator
    return money(mrr)


def summary(date_from=None, date_to=None):
    """The headline numbers for the finance dashboard."""
    today = timezone.localdate()
    collected = _in_range(Payment.objects.all(), "payment_date", date_from, date_to).aggregate(
        total=Sum("amount")
    )["total"]
    is_overdue = Q(due_date__lt=today)
    invoices = _in_range(
        Invoice.objects.filter(status=Invoice.Status.CONFIRMED), "invoice_date", date_from, date_to
    ).aggregate(
        outstanding=Sum(BALANCE),
        overdue_amount=Sum(BALANCE, filter=is_overdue),
        overdue_count=Count("id", filter=is_overdue),
    )
    mrr = monthly_recurring_revenue()
    return {
        "active_subscriptions": Subscription.objects.filter(status=Subscription.Status.ACTIVE).count(),
        "revenue_collected": money(collected or ZERO),
        "outstanding": money(invoices["outstanding"] or ZERO),
        "overdue_count": invoices["overdue_count"],
        "overdue_amount": money(invoices["overdue_amount"] or ZERO),
        "mrr": mrr,
        "arr": money(mrr * 12),
    }


def revenue_by_month(date_from=None, date_to=None):
    """Payments received per month, oldest first."""
    rows = (
        _in_range(Payment.objects.all(), "payment_date", date_from, date_to)
        .annotate(period=TruncMonth("payment_date"))
        .values("period")
        .annotate(amount=Sum("amount"))
        .order_by("period")
    )
    return [{"month": row["period"].strftime("%Y-%m"), "amount": money(row["amount"])} for row in rows]


def overdue_invoices(date_from=None, date_to=None):
    """Confirmed invoices past their due date, oldest debt first."""
    return _in_range(
        Invoice.objects.filter(status=Invoice.Status.CONFIRMED, due_date__lt=timezone.localdate()),
        "invoice_date",
        date_from,
        date_to,
    )


def overdue_buckets(date_from=None, date_to=None):
    """Ageing of overdue invoices: 0-30, 31-60 and 61+ days late, in one query."""
    today = timezone.localdate()
    day_30 = today - timedelta(days=30)
    day_60 = today - timedelta(days=60)
    buckets = {
        "0-30": Q(due_date__gte=day_30),
        "31-60": Q(due_date__lt=day_30, due_date__gte=day_60),
        "61+": Q(due_date__lt=day_60),
    }
    aggregates = {}
    for index, condition in enumerate(buckets.values()):
        aggregates[f"count_{index}"] = Count("id", filter=condition)
        aggregates[f"amount_{index}"] = Sum(BALANCE, filter=condition)
    result = overdue_invoices(date_from, date_to).aggregate(**aggregates)
    return [
        {
            "label": label,
            "count": result[f"count_{index}"],
            "amount": money(result[f"amount_{index}"] or ZERO),
        }
        for index, label in enumerate(buckets)
    ]


def subscriptions_by_status(date_from=None, date_to=None):
    """Subscription counts per status, including statuses with none."""
    counts = dict(
        _in_range(Subscription.objects.all(), "start_date", date_from, date_to)
        .values_list("status")
        .annotate(total=Count("id"))
        .order_by()
    )
    return [
        {"status": value, "status_display": str(label), "count": counts.get(value, 0)}
        for value, label in Subscription.Status.choices
    ]
