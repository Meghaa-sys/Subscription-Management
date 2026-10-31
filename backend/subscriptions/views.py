"""Subscription and quotation template endpoints. Rules live in services.py."""
import django_filters
from django.db.models import Prefetch
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsStaffOrAdmin
from common.viewsets import SoftDeleteMixin

from . import services
from .models import QuotationTemplate, QuotationTemplateLine, Subscription, SubscriptionLine
from .serializers import (
    CreateFromTemplateSerializer,
    QuotationTemplateSerializer,
    RenewSerializer,
    SubscriptionDetailSerializer,
    SubscriptionLineSerializer,
    SubscriptionListSerializer,
    SubscriptionWriteSerializer,
    TransitionSerializer,
)

TAG = "subscriptions"
LINE_ID = OpenApiParameter("line_id", int, OpenApiParameter.PATH)


class SubscriptionFilter(django_filters.FilterSet):
    customer = django_filters.NumberFilter(field_name="customer_id")
    plan = django_filters.NumberFilter(field_name="plan_id")
    start_date_from = django_filters.DateFilter(field_name="start_date", lookup_expr="gte")
    start_date_to = django_filters.DateFilter(field_name="start_date", lookup_expr="lte")

    class Meta:
        model = Subscription
        fields = ["status", "customer", "plan", "start_date_from", "start_date_to"]


@extend_schema_view(
    list=extend_schema(tags=[TAG], summary="List subscriptions", responses=SubscriptionListSerializer(many=True)),
    retrieve=extend_schema(tags=[TAG], summary="Get a subscription", responses=SubscriptionDetailSerializer),
    create=extend_schema(
        tags=[TAG],
        summary="Create a draft subscription",
        request=SubscriptionWriteSerializer,
        responses={201: SubscriptionDetailSerializer},
    ),
    update=extend_schema(
        tags=[TAG],
        summary="Replace a subscription",
        description="Draft and quotation only.",
        request=SubscriptionWriteSerializer,
        responses=SubscriptionDetailSerializer,
    ),
    partial_update=extend_schema(
        tags=[TAG],
        summary="Update a subscription",
        description="Draft and quotation only.",
        request=SubscriptionWriteSerializer,
        responses=SubscriptionDetailSerializer,
    ),
    destroy=extend_schema(tags=[TAG], summary="Delete a draft subscription"),
)
class SubscriptionViewSet(viewsets.ModelViewSet):
    """Staff and admin manage every subscription. Customers see only their own."""

    filterset_class = SubscriptionFilter
    search_fields = ["number", "customer__name"]
    ordering_fields = ["id", "number", "start_date", "expiry_date", "next_billing_date", "created_at"]
    ordering = ["-id"]
    customer_actions = {"list", "retrieve", "transition", "renew"}

    def get_permissions(self):
        if self.action in self.customer_actions:
            return [IsAuthenticated()]
        return [IsStaffOrAdmin()]

    def get_serializer_class(self):
        if self.action == "list":
            return SubscriptionListSerializer
        return SubscriptionDetailSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Subscription.objects.none()

        queryset = Subscription.objects.select_related(
            "customer", "plan", "salesperson", "payment_term", "template"
        )
        if self.request.user.is_customer_role:
            queryset = queryset.filter(customer__user=self.request.user)
        if self.action == "list":
            return queryset.prefetch_related("lines")
        return queryset.prefetch_related(
            Prefetch("lines", queryset=SubscriptionLine.objects.select_related("product", "variant")),
            "history__changed_by",
        )

    def _detail_response(self, subscription_id, status_code=status.HTTP_200_OK):
        subscription = self.get_queryset().get(pk=subscription_id)
        return Response(SubscriptionDetailSerializer(subscription).data, status=status_code)

    def create(self, request, *args, **kwargs):
        serializer = SubscriptionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscription = services.create_subscription(serializer.validated_data, request.user)
        return self._detail_response(subscription.pk, status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = SubscriptionWriteSerializer(
            instance, data=request.data, partial=kwargs.get("partial", False)
        )
        serializer.is_valid(raise_exception=True)
        services.update_subscription(instance.pk, serializer.validated_data, request.user)
        return self._detail_response(instance.pk)

    def perform_destroy(self, instance):
        services.delete_subscription(instance.pk)

    @extend_schema(
        tags=[TAG],
        summary="Move a subscription to another status",
        description=(
            "Allowed moves: draft to quotation; quotation to confirmed or draft; confirmed to "
            "active; active to paused or closed; paused to active or closed. Customers may only "
            "pause and resume their own subscriptions."
        ),
        request=TransitionSerializer,
        responses=SubscriptionDetailSerializer,
    )
    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        subscription = self.get_object()
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.transition_subscription(
            subscription.pk,
            serializer.validated_data["to_status"],
            actor=request.user,
            note=serializer.validated_data["note"],
        )
        return self._detail_response(subscription.pk)

    @extend_schema(
        tags=[TAG],
        summary="Renew for one more billing period",
        description="Extends expiry_date by one billing period. The plan must be renewable.",
        request=RenewSerializer,
        responses=SubscriptionDetailSerializer,
    )
    @action(detail=True, methods=["post"])
    def renew(self, request, pk=None):
        subscription = self.get_object()
        serializer = RenewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.renew_subscription(
            subscription.pk, actor=request.user, note=serializer.validated_data["note"]
        )
        return self._detail_response(subscription.pk)

    @extend_schema(
        tags=[TAG],
        summary="Switch an add-on on",
        description="Active subscriptions only, add-on products only. Affects the next invoice.",
        request=SubscriptionLineSerializer,
        responses={201: SubscriptionDetailSerializer},
    )
    @action(detail=True, methods=["post"], url_path="lines")
    def add_line(self, request, pk=None):
        subscription = self.get_object()
        serializer = SubscriptionLineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.add_addon_line(subscription.pk, serializer.validated_data)
        return self._detail_response(subscription.pk, status.HTTP_201_CREATED)

    @extend_schema(
        tags=[TAG],
        summary="Switch an add-on off",
        description="Active subscriptions only, add-on lines only. Affects the next invoice.",
        parameters=[LINE_ID],
        request=None,
        responses=SubscriptionDetailSerializer,
    )
    @action(detail=True, methods=["delete"], url_path=r"lines/(?P<line_id>\d+)")
    def remove_line(self, request, pk=None, line_id=None):
        subscription = self.get_object()
        services.remove_addon_line(subscription.pk, line_id)
        return self._detail_response(subscription.pk)


TEMPLATE_TAG = "quotation templates"


@extend_schema_view(
    list=extend_schema(tags=[TEMPLATE_TAG], summary="List quotation templates"),
    retrieve=extend_schema(tags=[TEMPLATE_TAG], summary="Get a quotation template"),
    create=extend_schema(tags=[TEMPLATE_TAG], summary="Create a quotation template"),
    update=extend_schema(tags=[TEMPLATE_TAG], summary="Replace a quotation template"),
    partial_update=extend_schema(tags=[TEMPLATE_TAG], summary="Update a quotation template"),
    destroy=extend_schema(
        tags=[TEMPLATE_TAG],
        summary="Deactivate a quotation template",
        description="Soft delete: sets `is_active` to false.",
    ),
)
class QuotationTemplateViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    """Preset quotations, managed by staff and admin."""

    queryset = QuotationTemplate.objects.select_related("plan").prefetch_related(
        Prefetch(
            "lines", queryset=QuotationTemplateLine.objects.select_related("product", "variant")
        )
    )
    serializer_class = QuotationTemplateSerializer
    permission_classes = [IsStaffOrAdmin]
    filterset_fields = ["plan", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["id", "name", "validity_days"]
    ordering = ["-id"]

    @extend_schema(
        tags=[TEMPLATE_TAG],
        summary="Start a quotation from this template",
        description=(
            "Creates a subscription in quotation status with quote_valid_until set to today "
            "plus validity_days, copying the lines at current prices."
        ),
        request=CreateFromTemplateSerializer,
        responses={201: SubscriptionDetailSerializer},
    )
    @action(detail=True, methods=["post"], url_path="create-subscription")
    def create_subscription(self, request, pk=None):
        template = self.get_object()
        serializer = CreateFromTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscription = services.create_subscription_from_template(
            template.pk, actor=request.user, **serializer.validated_data
        )
        subscription = (
            Subscription.objects.select_related("customer", "plan", "salesperson", "payment_term", "template")
            .prefetch_related("lines__product", "lines__variant", "history__changed_by")
            .get(pk=subscription.pk)
        )
        return Response(SubscriptionDetailSerializer(subscription).data, status=status.HTTP_201_CREATED)
