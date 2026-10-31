"""Serializers for discount rules and discount requests."""
from decimal import Decimal

from rest_framework import serializers

from catalog.models import Product
from catalog.serializers import merged_value

from .models import Discount, DiscountRequest


class ProductNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name"]
        read_only_fields = fields


class DiscountSerializer(serializers.ModelSerializer):
    """`products` is a list of product ids, used when applies_to is `product`."""

    discount_type_display = serializers.CharField(source="get_discount_type_display", read_only=True)
    applies_to_display = serializers.CharField(source="get_applies_to_display", read_only=True)
    products = serializers.PrimaryKeyRelatedField(
        many=True, required=False, queryset=Product.objects.all()
    )
    product_details = ProductNameSerializer(source="products", many=True, read_only=True)
    remaining_uses = serializers.IntegerField(
        read_only=True, allow_null=True, help_text="Null means unlimited."
    )
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)

    class Meta:
        model = Discount
        fields = [
            "id",
            "name",
            "discount_type",
            "discount_type_display",
            "value",
            "min_purchase",
            "min_quantity",
            "start_date",
            "end_date",
            "usage_limit",
            "times_used",
            "remaining_uses",
            "applies_to",
            "applies_to_display",
            "products",
            "product_details",
            "is_active",
            "created_by",
            "created_by_name",
        ]
        read_only_fields = ["id", "times_used", "created_by"]

    def validate(self, attrs):
        start_date = merged_value(self, attrs, "start_date")
        end_date = merged_value(self, attrs, "end_date")
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": ["End date cannot be before the start date."]})

        discount_type = merged_value(self, attrs, "discount_type")
        value = merged_value(self, attrs, "value")
        if discount_type == Discount.DiscountType.PERCENT and value is not None and value > Decimal("100"):
            raise serializers.ValidationError({"value": ["A percentage discount cannot exceed 100."]})

        if merged_value(self, attrs, "applies_to") == Discount.AppliesTo.PRODUCT:
            if "products" in attrs:
                has_products = bool(attrs["products"])
            else:
                has_products = bool(self.instance and self.instance.products.exists())
            if not has_products:
                raise serializers.ValidationError(
                    {"products": ["Choose at least one product for a product discount."]}
                )
        return attrs


class AttachDiscountSerializer(serializers.Serializer):
    discount_id = serializers.PrimaryKeyRelatedField(
        queryset=Discount.objects.all(), source="discount"
    )


class DiscountRequestSerializer(serializers.ModelSerializer):
    """A customer's request. `ref_name` keeps it apart from DiscountSerializer in Swagger."""

    customer_name = serializers.CharField(source="customer.name", read_only=True)
    subscription_number = serializers.CharField(source="subscription.number", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    handled_by_name = serializers.CharField(source="handled_by.name", read_only=True, default=None)
    discount_name = serializers.CharField(source="discount.name", read_only=True, default=None)

    class Meta:
        model = DiscountRequest
        fields = [
            "id",
            "customer",
            "customer_name",
            "subscription",
            "subscription_number",
            "message",
            "status",
            "status_display",
            "handled_by",
            "handled_by_name",
            "discount",
            "discount_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
        ref_name = "CustomerDiscountRequest"


class DiscountRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountRequest
        fields = ["subscription", "message"]


class ApproveRequestSerializer(serializers.Serializer):
    discount_id = serializers.PrimaryKeyRelatedField(
        queryset=Discount.objects.all(),
        source="discount",
        required=False,
        allow_null=True,
        help_text="Optional: also attach this discount to the subscription.",
    )
