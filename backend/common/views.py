"""Shared endpoints: dropdown choices and JSON error pages."""
from django.http import JsonResponse
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from catalog.models import Product, RecurringPlan, Tax


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


class MetaChoicesView(APIView):
    """Every choice list the frontend needs, so dropdowns are never hard coded."""

    @extend_schema(
        tags=["meta"],
        summary="All dropdown choices",
        responses=MetaChoicesSerializer,
    )
    def get(self, request):
        return Response(
            {
                "roles": _options(User.Role),
                "product_types": _options(Product.ProductType),
                "tax_types": _options(Tax.TaxType),
                "billing_periods": _options(RecurringPlan.BillingPeriod),
            }
        )


def json_not_found(request, exception=None):
    """Unknown URLs answer in the API error shape, not as an HTML page."""
    return JsonResponse({"detail": "Not found."}, status=404)


def json_server_error(request):
    """Errors raised outside DRF answer in the API error shape too."""
    return JsonResponse(
        {"detail": "Something went wrong on our side. Please try again."}, status=500
    )
