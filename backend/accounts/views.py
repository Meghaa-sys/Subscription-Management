"""Authentication, profile and staff endpoints."""
from django.db.models import Count, DecimalField, F, OuterRef, Subquery, Sum
from django.db.models.functions import Coalesce
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from billing.models import Invoice, Payment
from common.money import ZERO
from common.schema import DetailSerializer
from subscriptions.models import Subscription

from . import services
from .models import Customer, User
from .permissions import IsAdmin, IsStaffOrAdmin
from .serializers import (
    AuthTokensSerializer,
    CustomerSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    MeSerializer,
    MeUpdateSerializer,
    ResetPasswordSerializer,
    SignupSerializer,
    StaffUserSerializer,
    tokens_for,
)

FORGOT_PASSWORD_MESSAGE = "If an account exists for this email, a reset link has been sent."
MONEY_FIELD = DecimalField(max_digits=12, decimal_places=2)


def customer_totals(queryset):
    """
    Add total_paid, balance and active_subscriptions to customers. These are subqueries
    rather than joins, because joining payments and subscriptions together multiplies rows.
    """
    paid = (
        Payment.objects.filter(invoice__customer=OuterRef("pk"))
        .order_by()
        .values("invoice__customer")
        .annotate(total=Sum("amount"))
        .values("total")
    )
    owed = (
        Invoice.objects.filter(customer=OuterRef("pk"), status=Invoice.Status.CONFIRMED)
        .order_by()
        .values("customer")
        .annotate(total=Sum(F("total") - F("amount_paid"), output_field=MONEY_FIELD))
        .values("total")
    )
    active = (
        Subscription.objects.filter(customer=OuterRef("pk"), status=Subscription.Status.ACTIVE)
        .order_by()
        .values("customer")
        .annotate(total=Count("id"))
        .values("total")
    )
    return queryset.annotate(
        total_paid=Coalesce(Subquery(paid, output_field=MONEY_FIELD), ZERO, output_field=MONEY_FIELD),
        balance=Coalesce(Subquery(owed, output_field=MONEY_FIELD), ZERO, output_field=MONEY_FIELD),
        active_subscriptions=Coalesce(Subquery(active), 0),
    )


class PublicAuthView(APIView):
    """Base for endpoints used before logging in. Rate limited per client."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class SignupView(PublicAuthView):
    @extend_schema(
        tags=["auth"],
        summary="Create a customer account",
        request=SignupSerializer,
        responses={201: AuthTokensSerializer},
    )
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = services.register_customer(**serializer.validated_data)
        return Response(tokens_for(user), status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @extend_schema(
        tags=["auth"],
        summary="Log in with email and password",
        responses={200: AuthTokensSerializer},
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


@extend_schema_view(post=extend_schema(tags=["auth"], summary="Get a new access token"))
class RefreshView(TokenRefreshView):
    pass


class MeView(APIView):
    @extend_schema(tags=["auth"], summary="Current user", responses=MeSerializer)
    def get(self, request):
        return Response(MeSerializer(request.user).data)

    @extend_schema(
        tags=["auth"],
        summary="Update current user",
        description="`phone`, `company` and `billing_address` are ignored for staff and admin.",
        request=MeUpdateSerializer,
        responses=MeSerializer,
    )
    def patch(self, request):
        serializer = MeUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = services.update_profile(request.user, **serializer.validated_data)
        return Response(MeSerializer(user).data)


class ForgotPasswordView(PublicAuthView):
    @extend_schema(
        tags=["auth"],
        summary="Email a password reset link",
        description="Always returns the same 200 message, whether or not the account exists.",
        request=ForgotPasswordSerializer,
        responses=DetailSerializer,
    )
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.request_password_reset(serializer.validated_data["email"])
        return Response({"detail": FORGOT_PASSWORD_MESSAGE})


class ResetPasswordView(PublicAuthView):
    @extend_schema(
        tags=["auth"],
        summary="Set a new password using a reset token",
        request=ResetPasswordSerializer,
        responses=DetailSerializer,
    )
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.reset_password(**serializer.validated_data)
        return Response({"detail": "Your password has been reset. You can now log in."})


@extend_schema_view(
    list=extend_schema(tags=["customers"], summary="List customers"),
    retrieve=extend_schema(tags=["customers"], summary="Get a customer"),
    create=extend_schema(tags=["customers"], summary="Create a customer"),
    update=extend_schema(tags=["customers"], summary="Replace a customer"),
    partial_update=extend_schema(tags=["customers"], summary="Update a customer"),
    destroy=extend_schema(
        tags=["customers"],
        summary="Delete a customer",
        description="Refused with 400 if the customer has a login or any subscriptions.",
    ),
)
class CustomerViewSet(viewsets.ModelViewSet):
    """Customer records, managed by staff and admin."""

    queryset = customer_totals(Customer.objects.all())
    serializer_class = CustomerSerializer
    permission_classes = [IsStaffOrAdmin]
    search_fields = ["name", "company", "email", "phone"]
    ordering_fields = ["id", "name", "company", "created_at", "total_paid", "balance"]
    ordering = ["-id"]

    def perform_destroy(self, instance):
        services.delete_customer(instance)


@extend_schema_view(
    list=extend_schema(tags=["staff users"], summary="List staff"),
    retrieve=extend_schema(tags=["staff users"], summary="Get a staff user"),
    create=extend_schema(tags=["staff users"], summary="Create a staff user"),
)
class StaffUserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """Staff accounts. Only an admin can add or deactivate them."""

    queryset = User.objects.filter(role=User.Role.STAFF)
    serializer_class = StaffUserSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ["is_active"]
    search_fields = ["name", "email"]
    ordering_fields = ["id", "name", "email", "created_at"]
    ordering = ["-id"]

    def perform_create(self, serializer):
        serializer.instance = services.create_staff_user(**serializer.validated_data)

    @extend_schema(
        tags=["staff users"],
        summary="Activate a staff user",
        request=None,
        responses=StaffUserSerializer,
    )
    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        user = services.set_user_active(self.get_object(), True)
        return Response(self.get_serializer(user).data)

    @extend_schema(
        tags=["staff users"],
        summary="Deactivate a staff user",
        description="The user can no longer log in and existing tokens stop working.",
        request=None,
        responses=StaffUserSerializer,
    )
    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        user = services.set_user_active(self.get_object(), False)
        return Response(self.get_serializer(user).data)
