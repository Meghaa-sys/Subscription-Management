"""Catalogue endpoints. Admin writes, staff reads, customers read active plans and products."""
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import AdminWriteStaffRead
from common.viewsets import SoftDeleteMixin

from . import services
from .models import PaymentTerm, Product, ProductVariant, RecurringPlan, Tax
from .serializers import (
    CustomerProductSerializer,
    PaymentTermSerializer,
    ProductSerializer,
    RecurringPlanSerializer,
    TaxSerializer,
)


def crud_schema(tag, label, soft_delete=True):
    """Standard Swagger tags and summaries for a CRUD viewset."""
    delete_summary = f"Deactivate {label}" if soft_delete else f"Delete {label}"
    delete_description = "Soft delete: sets `is_active` to false." if soft_delete else ""
    return extend_schema_view(
        list=extend_schema(tags=[tag], summary=f"List {tag}"),
        retrieve=extend_schema(tags=[tag], summary=f"Get {label}"),
        create=extend_schema(tags=[tag], summary=f"Create {label}"),
        update=extend_schema(tags=[tag], summary=f"Replace {label}"),
        partial_update=extend_schema(tags=[tag], summary=f"Update {label}"),
        destroy=extend_schema(tags=[tag], summary=delete_summary, description=delete_description),
    )


def is_customer(request):
    return getattr(request.user, "is_customer_role", False)


@crud_schema("taxes", "a tax")
class TaxViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    queryset = Tax.objects.all()
    serializer_class = TaxSerializer
    permission_classes = [AdminWriteStaffRead]
    filterset_fields = ["tax_type", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["id", "name", "rate"]
    ordering = ["-id"]


@crud_schema("products", "a product")
class ProductViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [AdminWriteStaffRead]
    customers_can_read = True
    filterset_fields = ["product_type", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["id", "name", "sales_price", "created_at"]
    ordering = ["-id"]

    def get_queryset(self):
        queryset = Product.objects.prefetch_related("taxes")
        if is_customer(self.request):
            active_variants = ProductVariant.objects.filter(is_active=True)
            return queryset.filter(is_active=True).prefetch_related(
                Prefetch("variants", queryset=active_variants)
            )
        return queryset.prefetch_related("variants")

    def get_serializer_class(self):
        return CustomerProductSerializer if is_customer(self.request) else ProductSerializer

    @extend_schema(
        tags=["products"],
        summary="Deactivate one variant",
        parameters=[OpenApiParameter("variant_id", int, OpenApiParameter.PATH)],
        request=None,
        responses={204: None},
    )
    @action(detail=True, methods=["delete"], url_path=r"variants/(?P<variant_id>\d+)")
    def delete_variant(self, request, pk=None, variant_id=None):
        variant = get_object_or_404(self.get_object().variants, pk=variant_id)
        services.retire_variant(variant)
        return Response(status=status.HTTP_204_NO_CONTENT)


@crud_schema("plans", "a recurring plan")
class RecurringPlanViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    serializer_class = RecurringPlanSerializer
    permission_classes = [AdminWriteStaffRead]
    customers_can_read = True
    filterset_fields = ["billing_period", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["id", "name", "price", "start_date"]
    ordering = ["-id"]

    def get_queryset(self):
        queryset = RecurringPlan.objects.all()
        return queryset.filter(is_active=True) if is_customer(self.request) else queryset


@crud_schema("payment terms", "a payment term", soft_delete=False)
class PaymentTermViewSet(viewsets.ModelViewSet):
    queryset = PaymentTerm.objects.all()
    serializer_class = PaymentTermSerializer
    permission_classes = [AdminWriteStaffRead]
    search_fields = ["name"]
    ordering_fields = ["id", "name", "due_days"]
    ordering = ["-id"]
