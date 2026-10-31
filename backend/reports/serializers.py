"""Query parameters and response shapes of the reports."""
from rest_framework import serializers

from billing.serializers import InvoiceListSerializer


def money_field():
    return serializers.DecimalField(max_digits=14, decimal_places=2)


class DateRangeSerializer(serializers.Serializer):
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        date_from, date_to = attrs.get("date_from"), attrs.get("date_to")
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError({"date_to": ["date_to cannot be before date_from."]})
        return attrs


class SummarySerializer(serializers.Serializer):
    active_subscriptions = serializers.IntegerField()
    revenue_collected = money_field()
    outstanding = money_field()
    overdue_count = serializers.IntegerField()
    overdue_amount = money_field()
    mrr = money_field()
    arr = money_field()


class RevenueMonthSerializer(serializers.Serializer):
    month = serializers.CharField(help_text="YYYY-MM")
    amount = money_field()


class OverdueBucketSerializer(serializers.Serializer):
    label = serializers.CharField(help_text="0-30, 31-60 or 61+ days overdue")
    count = serializers.IntegerField()
    amount = money_field()


class OverdueReportSerializer(serializers.Serializer):
    """Ageing buckets beside the usual paginated invoice list."""

    buckets = OverdueBucketSerializer(many=True)
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = InvoiceListSerializer(many=True)


class StatusCountSerializer(serializers.Serializer):
    status = serializers.CharField()
    status_display = serializers.CharField()
    count = serializers.IntegerField()
