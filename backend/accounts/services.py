"""Account business logic: sign up, staff accounts and password reset."""
import hashlib
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils import timezone

from common.exceptions import BusinessRuleError

from .models import Customer, PasswordResetToken, User

logger = logging.getLogger(__name__)

DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists."
INVALID_RESET_MESSAGE = "This reset link is invalid or has expired."


def hash_token(token):
    """Hash a reset token; only this hash is ever stored."""
    return hashlib.sha256(token.encode()).hexdigest()


def _create_user(**fields):
    """Create a user, turning the unique-email race into the normal message."""
    try:
        with transaction.atomic():
            return User.objects.create_user(**fields)
    except IntegrityError:
        raise BusinessRuleError(DUPLICATE_EMAIL_MESSAGE)


@transaction.atomic
def register_customer(name, email, password):
    """Create a customer login and its linked Customer record together."""
    user = _create_user(email=email, password=password, name=name, role=User.Role.CUSTOMER)
    Customer.objects.create(user=user, name=name, email=user.email)
    return user


def create_staff_user(name, email, password):
    """Create an internal staff login."""
    return _create_user(email=email, password=password, name=name, role=User.Role.STAFF)


def set_user_active(user, is_active):
    """Activate or deactivate a login. Deactivated users are refused immediately."""
    user.is_active = is_active
    user.save(update_fields=["is_active"])
    return user


@transaction.atomic
def update_profile(user, **fields):
    """Update the logged-in user. Customers also update their billing details."""
    name = fields.pop("name", None)
    if name is not None:
        user.name = name
        user.save(update_fields=["name"])

    customer = getattr(user, "customer_profile", None)
    if customer is not None:
        if name is not None:
            customer.name = name
        for field, value in fields.items():
            setattr(customer, field, value)
        customer.save()
    return user


def delete_customer(customer):
    """Delete a customer record. Records with a login are kept for that login."""
    if customer.user_id is not None:
        raise BusinessRuleError("This customer has a login and cannot be deleted.")
    customer.delete()


def request_password_reset(email):
    """Email a reset link if an active account exists. Older links stop working."""
    user = User.objects.filter(email=email.lower(), is_active=True).first()
    if user is None:
        return

    token = secrets.token_urlsafe(32)
    now = timezone.now()
    with transaction.atomic():
        PasswordResetToken.objects.filter(user=user, used_at__isnull=True).update(used_at=now)
        PasswordResetToken.objects.create(
            user=user,
            token_hash=hash_token(token),
            expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_MINUTES),
        )

    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    message = (
        f"Hi {user.name},\n\n"
        f"Use this link to reset your Brightloop password:\n{link}\n\n"
        f"It works once and expires in {settings.PASSWORD_RESET_TOKEN_MINUTES} minutes. "
        "If you did not ask for this, you can ignore this email."
    )
    try:
        send_mail("Reset your Brightloop password", message, None, [user.email])
    except Exception:
        # The response must not reveal whether the account exists.
        logger.exception("Could not send password reset email to user %s", user.pk)


@transaction.atomic
def reset_password(token, new_password):
    """Set a new password using an unexpired, unused token, then burn the token."""
    reset = (
        PasswordResetToken.objects.select_for_update()
        .select_related("user")
        .filter(
            token_hash=hash_token(token),
            used_at__isnull=True,
            expires_at__gt=timezone.now(),
            user__is_active=True,
        )
        .first()
    )
    if reset is None:
        raise BusinessRuleError(INVALID_RESET_MESSAGE)

    reset.user.set_password(new_password)
    reset.user.save(update_fields=["password"])
    reset.used_at = timezone.now()
    reset.save(update_fields=["used_at"])
