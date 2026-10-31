"""Shared endpoints: dropdown choices and JSON error pages."""
from django.http import JsonResponse
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from billing.models import Invoice, Payment
from catalog.models import Product, RecurringPlan, Tax
from discounts.models import Discount, DiscountRequest
from subscriptions.models import Subscription

CHOICE_LISTS = {
    "roles": User.Role,
    "product_types": Product.ProductType,
    "tax_types": Tax.TaxType,
    "billing_periods": RecurringPlan.BillingPeriod,
    "subscription_statuses": Subscription.Status,
    "invoice_statuses": Invoice.Status,
    "payment_methods": Payment.Method,
    "discount_types": Discount.DiscountType,
    "discount_applies_to": Discount.AppliesTo,
    "discount_request_statuses": DiscountRequest.Status,
}


def _options(choices):
    """Convert a TextChoices class into [{value, label}, ...]."""
    return [{"value": value, "label": str(label)} for value, label in choices.choices]


class ChoiceSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


class MetaChoicesSerializer(serializers.Serializer):
    roles = ChoiceSerializer(many=True)
    product_types = ChoiceSerializer(many=True)
    tax_types = ChoiceSerializer(many=True)
    billing_periods = ChoiceSerializer(many=True)
    subscription_statuses = ChoiceSerializer(many=True)
    invoice_statuses = ChoiceSerializer(many=True)
    payment_methods = ChoiceSerializer(many=True)
    discount_types = ChoiceSerializer(many=True)
    discount_applies_to = ChoiceSerializer(many=True)
    discount_request_statuses = ChoiceSerializer(many=True)


class MetaChoicesView(APIView):
    """Every choice list the frontend needs, so dropdowns are never hard coded."""

    @extend_schema(
        tags=["meta"],
        summary="All dropdown choices",
        responses=MetaChoicesSerializer,
    )
    def get(self, request):
        return Response({name: _options(choices) for name, choices in CHOICE_LISTS.items()})


def json_not_found(request, exception=None):
    """Unknown URLs answer in the API error shape, not as an HTML page."""
    return JsonResponse({"detail": "Not found."}, status=404)


def json_server_error(request):
    """Errors raised outside DRF answer in the API error shape too."""
    return JsonResponse(
        {"detail": "Something went wrong on our side. Please try again."}, status=500
    )
