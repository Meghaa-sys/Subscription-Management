"""Serializers for the catalogue."""
from decimal import Decimal

from rest_framework import serializers

from . import services
from .models import PaymentTerm, Product, ProductVariant, RecurringPlan, Tax


def merged_value(serializer, attrs, field):
    """A field's incoming value, falling back to the instance on PATCH."""
    if field in attrs:
        return attrs[field]
    return getattr(serializer.instance, field, None)


class TaxSerializer(serializers.ModelSerializer):
    tax_type_display = serializers.CharField(source="get_tax_type_display", read_only=True)

    class Meta:
        model = Tax
        fields = ["id", "name", "tax_type", "tax_type_display", "rate", "is_active"]
        read_only_fields = ["id", "tax_type_display"]

    def validate(self, attrs):
        tax_type = merged_value(self, attrs, "tax_type")
        rate = merged_value(self, attrs, "rate")
        if tax_type == Tax.TaxType.PERCENT and rate is not None and rate > Decimal("100"):
            raise serializers.ValidationError({"rate": ["A percentage tax cannot exceed 100."]})
        return attrs


class TaxSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Tax
        fields = ["id", "name", "tax_type", "rate"]
        read_only_fields = fields


class ProductVariantSerializer(serializers.ModelSerializer):
    """Nested inside products. Send `id` to update a variant, omit it to create one."""

    id = serializers.IntegerField(required=False)
    label = serializers.CharField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "attribute", "value", "extra_price", "label", "is_active"]


class ProductSerializer(serializers.ModelSerializer):
    """
    Full product for staff and admin. On write, `variants` replaces the whole list:
    existing variants left out of it are deactivated. `taxes` is a list of tax ids.
    """

    product_type_display = serializers.CharField(source="get_product_type_display", read_only=True)
    variants = ProductVariantSerializer(many=True, required=False)
    taxes = serializers.PrimaryKeyRelatedField(many=True, required=False, queryset=Tax.objects.all())
    tax_details = TaxSummarySerializer(source="taxes", many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "product_type",
            "product_type_display",
            "sales_price",
            "cost_price",
            "notes",
            "taxes",
            "tax_details",
            "variants",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        return services.save_product(Product(), validated_data)

    def update(self, instance, validated_data):
        return services.save_product(instance, validated_data)


class CustomerProductVariantSerializer(serializers.ModelSerializer):
    label = serializers.CharField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "attribute", "value", "extra_price", "label"]
        read_only_fields = fields


class CustomerProductSerializer(serializers.ModelSerializer):
    """What a customer may see: no cost price and no internal notes."""

    product_type_display = serializers.CharField(source="get_product_type_display", read_only=True)
    variants = CustomerProductVariantSerializer(many=True, read_only=True)
    tax_details = TaxSummarySerializer(source="taxes", many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "product_type",
            "product_type_display",
            "sales_price",
            "tax_details",
            "variants",
        ]
        read_only_fields = fields


class RecurringPlanSerializer(serializers.ModelSerializer):
    billing_period_display = serializers.CharField(
        source="get_billing_period_display", read_only=True
    )

    class Meta:
        model = RecurringPlan
        fields = [
            "id",
            "name",
            "price",
            "billing_period",
            "billing_period_display",
            "min_quantity",
            "start_date",
            "end_date",
            "auto_close",
            "closable",
            "pausable",
            "renewable",
            "is_active",
        ]
        read_only_fields = ["id", "billing_period_display"]

    def validate(self, attrs):
        start_date = merged_value(self, attrs, "start_date")
        end_date = merged_value(self, attrs, "end_date")
        if end_date and start_date and end_date <= start_date:
            raise serializers.ValidationError({"end_date": ["End date must be after the start date."]})
        return attrs


class PaymentTermSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTerm
        fields = ["id", "name", "due_days"]
        read_only_fields = ["id"]
