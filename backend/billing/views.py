"""Billing endpoints."""
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin

from .services import run_billing


class BillingRunResultSerializer(serializers.Serializer):
    created = serializers.IntegerField(help_text="New invoices generated.")
    skipped = serializers.IntegerField(help_text="Periods that already had an invoice.")
    subscriptions_processed = serializers.IntegerField()
    failed = serializers.IntegerField(help_text="Subscriptions that errored; retried on the next run.")


class BillingRunView(APIView):
    """Powers the "Run billing now" button."""

    permission_classes = [IsAdmin]

    @extend_schema(
        tags=["billing"],
        summary="Run billing now",
        description="Bills everything due today. Running it twice creates no duplicates.",
        request=None,
        responses=BillingRunResultSerializer,
    )
    def post(self, request):
        return Response(run_billing())
