"""Serializers for invoices and payments. Money values are serialized as strings."""
from rest_framework import serializers

from accounts.models import Customer

from .models import Invoice, InvoiceLine, Payment


class InvoiceLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = InvoiceLine
        fields = [
            "id",
            "product",
            "product_name",
            "description",
            "quantity",
            "unit_price",
            "discount_amount",
            "tax_amount",
            "line_total",
        ]
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.number", read_only=True)
    customer = serializers.IntegerField(source="invoice.customer_id", read_only=True)
    customer_name = serializers.CharField(source="invoice.customer.name", read_only=True)
    method_display = serializers.CharField(source="get_method_display", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.name", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "invoice",
            "invoice_number",
            "customer",
            "customer_name",
            "method",
            "method_display",
            "amount",
            "payment_date",
            "note",
            "recorded_by",
            "recorded_by_name",
            "created_at",
        ]
        read_only_fields = fields


class RecordPaymentSerializer(serializers.ModelSerializer):
    """Amount limits are checked by the service, which knows the invoice balance."""

    class Meta:
        model = Payment
        fields = ["method", "amount", "payment_date", "note"]


class InvoiceListSerializer(serializers.ModelSerializer):
    """Row shown in invoice tables. `balance`, `is_overdue` and `days_overdue` are computed."""

    subscription_number = serializers.CharField(source="subscription.number", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_overdue = serializers.IntegerField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "number",
            "subscription",
            "subscription_number",
            "customer",
            "customer_name",
            "period_start",
            "period_end",
            "invoice_date",
            "due_date",
            "subtotal",
            "discount_total",
            "tax_total",
            "total",
            "amount_paid",
            "balance",
            "status",
            "status_display",
            "is_overdue",
            "days_overdue",
            "sent_at",
            "created_at",
        ]
        read_only_fields = fields


class InvoiceCustomerSerializer(serializers.ModelSerializer):
    """Billing details printed on an invoice."""

    class Meta:
        model = Customer
        fields = ["id", "name", "company", "email", "phone", "billing_address", "tax_id"]
        read_only_fields = fields


class AppliedDiscountSerializer(serializers.Serializer):
    name = serializers.CharField(source="discount.name")
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class InvoiceDetailSerializer(InvoiceListSerializer):
    """Everything needed to render a printable invoice."""

    customer_details = InvoiceCustomerSerializer(source="customer", read_only=True)
    plan_name = serializers.CharField(source="subscription.plan.name", read_only=True)
    lines = InvoiceLineSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    discounts = AppliedDiscountSerializer(source="discount_usages", many=True, read_only=True)

    class Meta(InvoiceListSerializer.Meta):
        fields = InvoiceListSerializer.Meta.fields + [
            "customer_details",
            "plan_name",
            "lines",
            "discounts",
            "payments",
        ]
        read_only_fields = fields


class BulkInvoiceActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["confirm", "send"])
    ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), allow_empty=False, max_length=500
    )


class BulkInvoiceRowSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    success = serializers.BooleanField()
    status = serializers.CharField(allow_null=True)
    error = serializers.CharField(allow_null=True)


class BulkInvoiceResultSerializer(serializers.Serializer):
    succeeded = serializers.IntegerField()
    failed = serializers.IntegerField()
    results = BulkInvoiceRowSerializer(many=True)
