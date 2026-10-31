"""Discount rule and discount request endpoints. Rules live in services.py."""
import django_filters
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import AdminWriteStaffRead, IsAdmin, IsCustomer, IsStaffOrAdmin
from common.viewsets import SoftDeleteMixin

from . import services
from .models import Discount, DiscountRequest
from .serializers import (
    ApproveRequestSerializer,
    DiscountRequestCreateSerializer,
    DiscountRequestSerializer,
    DiscountSerializer,
)

TAG = "discounts"
REQUEST_TAG = "discount requests"


@extend_schema_view(
    list=extend_schema(tags=[TAG], summary="List discounts"),
    retrieve=extend_schema(tags=[TAG], summary="Get a discount"),
    create=extend_schema(tags=[TAG], summary="Create a discount"),
    update=extend_schema(tags=[TAG], summary="Replace a discount"),
    partial_update=extend_schema(tags=[TAG], summary="Update a discount"),
    destroy=extend_schema(
        tags=[TAG],
        summary="Deactivate a discount",
        description="Soft delete: sets `is_active` to false.",
    ),
)
class DiscountViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """Only the admin defines discounts. Staff can read them to attach them."""

    queryset = Discount.objects.select_related("created_by").prefetch_related("products")
    serializer_class = DiscountSerializer
    permission_classes = [AdminWriteStaffRead]
    filterset_fields = ["discount_type", "applies_to", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["id", "name", "start_date", "end_date", "times_used"]
    ordering = ["-id"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DiscountRequestFilter(django_filters.FilterSet):
    customer = django_filters.NumberFilter(field_name="customer_id")
    subscription = django_filters.NumberFilter(field_name="subscription_id")

    class Meta:
        model = DiscountRequest
        fields = ["status", "customer", "subscription"]


@extend_schema_view(
    list=extend_schema(tags=[REQUEST_TAG], summary="List discount requests"),
    retrieve=extend_schema(tags=[REQUEST_TAG], summary="Get a discount request"),
)
class DiscountRequestViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """Customers ask, staff forward or reject, the admin approves or rejects."""

    serializer_class = DiscountRequestSerializer
    filterset_class = DiscountRequestFilter
    search_fields = ["customer__name", "subscription__number", "message"]
    ordering_fields = ["id", "status", "created_at"]
    ordering = ["-id"]

    def get_permissions(self):
        if self.action == "create":
            return [IsCustomer()]
        if self.action == "approve":
            return [IsAdmin()]
        if self.action in ("forward", "reject"):
            return [IsStaffOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return DiscountRequest.objects.none()

        queryset = DiscountRequest.objects.select_related(
            "customer", "subscription", "handled_by", "discount"
        )
        if self.request.user.is_customer_role:
            queryset = queryset.filter(customer__user=self.request.user)
        return queryset

    def _response(self, request_id, status_code=status.HTTP_200_OK):
        instance = self.get_queryset().get(pk=request_id)
        return Response(DiscountRequestSerializer(instance).data, status=status_code)

    @extend_schema(
        tags=[REQUEST_TAG],
        summary="Ask for a discount (customers)",
        description="The subscription must be your own, otherwise 404.",
        request=DiscountRequestCreateSerializer,
        responses={201: DiscountRequestSerializer},
    )
    def create(self, request):
        serializer = DiscountRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        created = services.create_discount_request(request.user, **serializer.validated_data)
        return self._response(created.pk, status.HTTP_201_CREATED)

    @extend_schema(
        tags=[REQUEST_TAG],
        summary="Forward to the admin",
        description="Pending requests only.",
        request=None,
        responses=DiscountRequestSerializer,
    )
    @action(detail=True, methods=["post"])
    def forward(self, request, pk=None):
        instance = self.get_object()
        services.forward_request(instance.pk, request.user)
        return self._response(instance.pk)

    @extend_schema(
        tags=[REQUEST_TAG],
        summary="Reject a request",
        description="Pending or forwarded requests only.",
        request=None,
        responses=DiscountRequestSerializer,
    )
    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        instance = self.get_object()
        services.reject_request(instance.pk, request.user)
        return self._response(instance.pk)

    @extend_schema(
        tags=[REQUEST_TAG],
        summary="Approve a request (admin)",
        description=(
            "Pending or forwarded requests only. With `discount_id`, the discount is also "
            "attached to the subscription."
        ),
        request=ApproveRequestSerializer,
        responses=DiscountRequestSerializer,
    )
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        instance = self.get_object()
        serializer = ApproveRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.approve_request(instance.pk, request.user, **serializer.validated_data)
        return self._response(instance.pk)
