"""Serializers for authentication, profiles, staff and customers."""
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Customer, User
from .services import DUPLICATE_EMAIL_MESSAGE


def _validate_new_email(value):
    email = value.lower()
    if User.objects.filter(email=email).exists():
        raise serializers.ValidationError(DUPLICATE_EMAIL_MESSAGE)
    return email


class UserSummarySerializer(serializers.ModelSerializer):
    """The user object returned with tokens."""

    class Meta:
        model = User
        fields = ["id", "name", "email", "role"]
        read_only_fields = fields


class AuthTokensSerializer(serializers.Serializer):
    """Response of login and signup."""

    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSummarySerializer()


class LoginSerializer(TokenObtainPairSerializer):
    """Email + password login. The access token also carries role and name."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["name"] = user.name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSummarySerializer(self.user).data
        return data


def tokens_for(user):
    """Build the same response as login for a user who is already verified."""
    refresh = LoginSerializer.get_token(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSummarySerializer(user).data,
    }


class SignupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        return _validate_new_email(value)

    def validate_password(self, value):
        validate_password(value)
        return value


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class MeSerializer(serializers.ModelSerializer):
    """The logged-in user. Customer fields are null for staff and admin."""

    role_display = serializers.CharField(source="get_role_display", read_only=True)
    customer_id = serializers.IntegerField(source="customer_profile.id", read_only=True, default=None)
    phone = serializers.CharField(source="customer_profile.phone", read_only=True, default=None)
    company = serializers.CharField(source="customer_profile.company", read_only=True, default=None)
    billing_address = serializers.CharField(
        source="customer_profile.billing_address", read_only=True, default=None
    )

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "role",
            "role_display",
            "is_active",
            "created_at",
            "customer_id",
            "phone",
            "company",
            "billing_address",
        ]
        read_only_fields = fields


class MeUpdateSerializer(serializers.Serializer):
    """PATCH /api/auth/me/. Phone, company and address only apply to customers."""

    name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    company = serializers.CharField(max_length=150, required=False, allow_blank=True)
    billing_address = serializers.CharField(required=False, allow_blank=True)


class StaffUserSerializer(serializers.ModelSerializer):
    """Admin view of a staff login."""

    role_display = serializers.CharField(source="get_role_display", read_only=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "password",
            "role",
            "role_display",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "role", "role_display", "is_active", "created_at"]
        # The default unique validator is replaced by the friendlier check below.
        extra_kwargs = {"email": {"validators": []}}

    def validate_email(self, value):
        return _validate_new_email(value)

    def validate_password(self, value):
        validate_password(value)
        return value


class CustomerSerializer(serializers.ModelSerializer):
    """The totals come from the viewset's annotations, so they are left out on create."""

    has_login = serializers.SerializerMethodField()
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    active_subscriptions = serializers.IntegerField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "company",
            "email",
            "phone",
            "billing_address",
            "tax_id",
            "has_login",
            "total_paid",
            "balance",
            "active_subscriptions",
            "created_at",
        ]
        read_only_fields = ["id", "has_login", "created_at"]

    def get_has_login(self, obj) -> bool:
        return obj.user_id is not None
