"""People who use the system, and the customers Brightloop bills."""
from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Creates users identified by email. Emails are stored in lowercase."""

    use_in_migrations = True

    def get_by_natural_key(self, username):
        return self.get(email=username.lower())

    def _create(self, email, password, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        user = self.model(email=self.normalize_email(email).lower(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields["role"] = User.Role.ADMIN
        extra_fields["is_staff"] = True
        extra_fields["is_superuser"] = True
        return self._create(email, password, **extra_fields)


class User(AbstractUser):
    """A login. `role` decides what the person can do across the whole API."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        STAFF = "staff", "Staff"
        CUSTOMER = "customer", "Customer"

    # Email replaces username, `name` replaces first/last name and created_at
    # replaces date_joined, so these inherited columns are removed.
    username = None
    first_name = None
    last_name = None
    date_joined = None

    email = models.EmailField("email address", unique=True)
    name = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=Role, default=Role.CUSTOMER)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.email

    def get_full_name(self):
        return self.name

    def get_short_name(self):
        return self.name

    @property
    def is_admin_role(self):
        return self.role == self.Role.ADMIN

    @property
    def is_internal(self):
        """True for admins and staff, who can see every customer's data."""
        return self.role in (self.Role.ADMIN, self.Role.STAFF)

    @property
    def is_customer_role(self):
        return self.role == self.Role.CUSTOMER


class PasswordResetToken(models.Model):
    """A single-use password reset link. Only the sha256 hash of the token is stored."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="password_reset_tokens"
    )
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"Reset token #{self.pk} for user {self.user_id}"


class Customer(models.Model):
    """A company or person Brightloop bills. Staff may create one without a login."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="customer_profile",
    )
    name = models.CharField(max_length=150)
    company = models.CharField(max_length=150, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    billing_address = models.TextField(blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.name
