"""Serializers for subscriptions and quotation templates."""
from rest_framework import serializers

from accounts.models import Customer
from catalog.models import PaymentTerm
from discounts.models import SubscriptionDiscount

from .models import (
    QuotationTemplate,
    QuotationTemplateLine,
    Subscription,
    SubscriptionLine,
    SubscriptionStatusHistory,
)
from .services import ALLOWED_TRANSITIONS, save_template


def label_of(variant):
    return variant.label if variant else None


class SubscriptionLineSerializer(serializers.ModelSerializer):
    """
    One product line. On write send product, variant (optional), quantity and
    optionally unit_price; the default price is sales price plus variant extra.
    `amount` is before tax and `line_total` is amount plus tax.
    """

    product_name = serializers.CharField(source="product.name", read_only=True)
    product_type = serializers.CharField(source="product.product_type", read_only=True)
    variant_label = serializers.SerializerMethodField()
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0, required=False, allow_null=True
    )
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SubscriptionLine
        fields = [
            "id",
            "product",
            "product_name",
            "product_type",
            "variant",
            "variant_label",
            "quantity",
            "unit_price",
            "tax_amount",
            "amount",
            "line_total",
        ]
        read_only_fields = ["id", "tax_amount", "amount"]

    def get_variant_label(self, obj) -> str | None:
        return label_of(obj.variant)


class SubscriptionHistorySerializer(serializers.ModelSerializer):
    from_status_display = serializers.CharField(source="get_from_status_display", read_only=True)
    to_status_display = serializers.CharField(source="get_to_status_display", read_only=True)
    changed_by_name = serializers.CharField(source="changed_by.name", read_only=True, default=None)

    class Meta:
        model = SubscriptionStatusHistory
        fields = [
            "id",
            "from_status",
            "from_status_display",
            "to_status",
            "to_status_display",
            "changed_by",
            "changed_by_name",
            "changed_at",
            "note",
        ]
        read_only_fields = fields


class AttachedDiscountSerializer(serializers.ModelSerializer):
    """A discount attached to a subscription."""

    name = serializers.CharField(source="discount.name", read_only=True)
    discount_type = serializers.CharField(source="discount.discount_type", read_only=True)
    value = serializers.DecimalField(
        source="discount.value", max_digits=12, decimal_places=2, read_only=True
    )
    end_date = serializers.DateField(source="discount.end_date", read_only=True)
    added_by_name = serializers.CharField(source="added_by.name", read_only=True)

    class Meta:
        model = SubscriptionDiscount
        fields = [
            "id",
            "discount",
            "name",
            "discount_type",
            "value",
            "end_date",
            "added_by",
            "added_by_name",
            "added_at",
        ]
        read_only_fields = fields


class SubscriptionListSerializer(serializers.ModelSerializer):
    """Row shown in subscription tables."""

    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_email = serializers.CharField(source="customer.email", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    billing_period = serializers.CharField(source="plan.billing_period", read_only=True)
    salesperson_name = serializers.CharField(source="salesperson.name", read_only=True, default=None)
    payment_term_name = serializers.CharField(source="payment_term.name", read_only=True, default=None)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    quantity = serializers.SerializerMethodField()
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    tax_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "number",
            "customer",
            "customer_name",
            "customer_email",
            "quantity",
            "plan",
            "plan_name",
            "billing_period",
            "salesperson",
            "salesperson_name",
            "start_date",
            "expiry_date",
            "next_billing_date",
            "quote_valid_until",
            "payment_term",
            "payment_term_name",
            "status",
            "status_display",
            "subtotal",
            "tax_total",
            "total",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_quantity(self, obj) -> int:
        return sum(line.quantity for line in obj.lines.all())


class SubscriptionDetailSerializer(SubscriptionListSerializer):
    """Full subscription with lines and history, plus what the UI may offer next."""

    template_name = serializers.CharField(source="template.name", read_only=True, default=None)
    lines = SubscriptionLineSerializer(many=True, read_only=True)
    history = SubscriptionHistorySerializer(many=True, read_only=True)
    discounts = AttachedDiscountSerializer(source="subscription_discounts", many=True, read_only=True)
    allowed_transitions = serializers.SerializerMethodField()
    plan_pausable = serializers.BooleanField(source="plan.pausable", read_only=True)
    plan_closable = serializers.BooleanField(source="plan.closable", read_only=True)
    plan_renewable = serializers.BooleanField(source="plan.renewable", read_only=True)

    class Meta(SubscriptionListSerializer.Meta):
        fields = SubscriptionListSerializer.Meta.fields + [
            "template",
            "template_name",
            "notes",
            "plan_pausable",
            "plan_closable",
            "plan_renewable",
            "allowed_transitions",
            "lines",
            "discounts",
            "history",
        ]
        read_only_fields = fields

    def get_allowed_transitions(self, obj) -> list[str]:
        return [str(status.value) for status in ALLOWED_TRANSITIONS[Subscription.Status(obj.status)]]


class SubscriptionWriteSerializer(serializers.ModelSerializer):
    """
    Create or edit a subscription (draft and quotation only). `lines`, when sent,
    replaces all lines. Status never changes here: use the transition endpoint.
    """

    lines = SubscriptionLineSerializer(many=True, required=False)

    class Meta:
        model = Subscription
        fields = [
            "customer",
            "plan",
            "salesperson",
            "start_date",
            "expiry_date",
            "quote_valid_until",
            "payment_term",
            "notes",
            "lines",
        ]


class TransitionSerializer(serializers.Serializer):
    to_status = serializers.ChoiceField(choices=Subscription.Status.choices)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class RenewSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class TemplateLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    variant_label = serializers.SerializerMethodField()

    class Meta:
        model = QuotationTemplateLine
        fields = ["id", "product", "product_name", "variant", "variant_label", "quantity"]
        read_only_fields = ["id"]

    def get_variant_label(self, obj) -> str | None:
        return label_of(obj.variant)


class QuotationTemplateSerializer(serializers.ModelSerializer):
    """A template with nested lines. `lines`, when sent, replaces all lines."""

    plan_name = serializers.CharField(source="plan.name", read_only=True)
    lines = TemplateLineSerializer(many=True, required=False)

    class Meta:
        model = QuotationTemplate
        fields = ["id", "name", "plan", "plan_name", "validity_days", "notes", "is_active", "lines"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        return save_template(QuotationTemplate(), validated_data)

    def update(self, instance, validated_data):
        return save_template(instance, validated_data)


class CreateFromTemplateSerializer(serializers.Serializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(), source="customer"
    )
    start_date = serializers.DateField()
    payment_term_id = serializers.PrimaryKeyRelatedField(
        queryset=PaymentTerm.objects.all(),
        source="payment_term",
        required=False,
        allow_null=True,
    )
