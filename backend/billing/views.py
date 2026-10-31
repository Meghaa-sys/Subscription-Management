"""Billing run, invoice and payment endpoints. Rules live in services.py."""
import django_filters
from django.db.models import Prefetch
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsStaffOrAdmin

from . import services
from .models import Invoice, Payment
from .serializers import (
    BulkInvoiceActionSerializer,
    BulkInvoiceResultSerializer,
    InvoiceDetailSerializer,
    InvoiceListSerializer,
    PaymentSerializer,
    RecordPaymentSerializer,
)

INVOICE_TAG = "invoices"
PAYMENT_TAG = "payments"


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
        return Response(services.run_billing())


class InvoiceFilter(django_filters.FilterSet):
    customer = django_filters.NumberFilter(field_name="customer_id")
    subscription = django_filters.NumberFilter(field_name="subscription_id")
    invoice_date_from = django_filters.DateFilter(field_name="invoice_date", lookup_expr="gte")
    invoice_date_to = django_filters.DateFilter(field_name="invoice_date", lookup_expr="lte")
    overdue = django_filters.BooleanFilter(
        method="filter_overdue", label="Confirmed invoices past their due date"
    )

    class Meta:
        model = Invoice
        fields = ["status", "customer", "subscription", "invoice_date_from", "invoice_date_to", "overdue"]

    def filter_overdue(self, queryset, name, value):
        overdue = {"status": Invoice.Status.CONFIRMED, "due_date__lt": timezone.localdate()}
        return queryset.filter(**overdue) if value else queryset.exclude(**overdue)


@extend_schema_view(
    list=extend_schema(tags=[INVOICE_TAG], summary="List invoices"),
    retrieve=extend_schema(
        tags=[INVOICE_TAG], summary="Get an invoice", responses=InvoiceDetailSerializer
    ),
)
class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """Staff and admin see every invoice and act on them. Customers read their own."""

    filterset_class = InvoiceFilter
    search_fields = ["number", "customer__name", "subscription__number"]
    ordering_fields = ["id", "number", "invoice_date", "due_date", "total", "status"]
    ordering = ["-id"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsStaffOrAdmin()]

    def get_serializer_class(self):
        return InvoiceListSerializer if self.action == "list" else InvoiceDetailSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Invoice.objects.none()

        queryset = Invoice.objects.select_related("customer", "subscription")
        if self.request.user.is_customer_role:
            queryset = queryset.filter(customer__user=self.request.user)
        if self.action == "list":
            return queryset
        return queryset.select_related("subscription__plan").prefetch_related(
            "lines__product",
            "discount_usages__discount",
            Prefetch(
                "payments",
                queryset=Payment.objects.select_related("invoice__customer", "recorded_by"),
            ),
        )

    def _detail_response(self, invoice_id, status_code=status.HTTP_200_OK):
        invoice = self.get_queryset().get(pk=invoice_id)
        return Response(InvoiceDetailSerializer(invoice).data, status=status_code)

    def _run(self, service):
        invoice = self.get_object()
        service(invoice.pk)
        return self._detail_response(invoice.pk)

    @extend_schema(
        tags=[INVOICE_TAG],
        summary="Confirm a draft invoice",
        request=None,
        responses=InvoiceDetailSerializer,
    )
    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        return self._run(services.confirm_invoice)

    @extend_schema(
        tags=[INVOICE_TAG],
        summary="Cancel an invoice",
        description="Allowed for draft invoices and confirmed invoices with no payments.",
        request=None,
        responses=InvoiceDetailSerializer,
    )
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._run(services.cancel_invoice)

    @extend_schema(
        tags=[INVOICE_TAG],
        summary="Email an invoice to the customer",
        description="Confirmed or paid invoices only. Sets `sent_at`.",
        request=None,
        responses=InvoiceDetailSerializer,
    )
    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        return self._run(services.send_invoice)

    @extend_schema(
        tags=[INVOICE_TAG],
        summary="Confirm or send many invoices",
        description="Each id succeeds or fails on its own. Always 200; check `results`.",
        request=BulkInvoiceActionSerializer,
        responses=BulkInvoiceResultSerializer,
    )
    @action(detail=False, methods=["post"])
    def bulk(self, request):
        serializer = BulkInvoiceActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(services.bulk_invoice_action(**serializer.validated_data))

    @extend_schema(
        tags=[INVOICE_TAG],
        summary="Record a payment",
        description=(
            "Confirmed invoices only. The amount must be more than 0 and at most the balance. "
            "The invoice becomes paid once fully covered. Returns the updated invoice."
        ),
        request=RecordPaymentSerializer,
        responses={201: InvoiceDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def payments(self, request, pk=None):
        invoice = self.get_object()
        serializer = RecordPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.record_payment(invoice.pk, actor=request.user, **serializer.validated_data)
        return self._detail_response(invoice.pk, status.HTTP_201_CREATED)


class PaymentFilter(django_filters.FilterSet):
    invoice = django_filters.NumberFilter(field_name="invoice_id")
    customer = django_filters.NumberFilter(field_name="invoice__customer_id")
    payment_date_from = django_filters.DateFilter(field_name="payment_date", lookup_expr="gte")
    payment_date_to = django_filters.DateFilter(field_name="payment_date", lookup_expr="lte")

    class Meta:
        model = Payment
        fields = ["method", "invoice", "customer", "payment_date_from", "payment_date_to"]


@extend_schema_view(
    list=extend_schema(tags=[PAYMENT_TAG], summary="List payments"),
    retrieve=extend_schema(tags=[PAYMENT_TAG], summary="Get a payment"),
)
class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """Payment history. Customers see only payments on their own invoices."""

    serializer_class = PaymentSerializer
    filterset_class = PaymentFilter
    search_fields = ["invoice__number", "invoice__customer__name", "note"]
    ordering_fields = ["id", "payment_date", "amount"]
    ordering = ["-id"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Payment.objects.none()

        queryset = Payment.objects.select_related("invoice__customer", "recorded_by")
        if self.request.user.is_customer_role:
            queryset = queryset.filter(invoice__customer__user=self.request.user)
        return queryset
