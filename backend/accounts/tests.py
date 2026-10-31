from datetime import timedelta

from django.core import mail
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from .models import Customer, PasswordResetToken, User
from .validators import StrongPasswordValidator
from django.core.exceptions import ValidationError

GOOD_PASSWORD = "Valid@1234"


def make_user(email, role=User.Role.CUSTOMER, **extra):
    return User.objects.create_user(email=email, password=GOOD_PASSWORD, name="Test", role=role, **extra)


class PasswordValidatorTests(TestCase):
    def setUp(self):
        self.validator = StrongPasswordValidator()

    def test_accepts_strong_password(self):
        self.validator.validate("Abcdefg@1")

    def test_exactly_eight_characters_is_too_short(self):
        with self.assertRaisesMessage(ValidationError, "more than 8 characters"):
            self.validator.validate("Abcdef@1")

    def test_single_message_lists_everything_missing(self):
        with self.assertRaises(ValidationError) as caught:
            self.validator.validate("abc")
        message = caught.exception.messages[0]
        self.assertEqual(len(caught.exception.messages), 1)
        for expected in ("more than 8 characters", "an uppercase letter", "a special character"):
            self.assertIn(expected, message)
        self.assertNotIn("lowercase", message)


class SignupLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def signup(self, **overrides):
        body = {"name": "Asha", "email": "asha@example.com", "password": GOOD_PASSWORD, **overrides}
        return self.client.post("/api/auth/signup/", body, format="json")

    def test_signup_creates_customer_and_returns_tokens(self):
        response = self.signup()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.data), {"access", "refresh", "user"})
        user = User.objects.get(email="asha@example.com")
        self.assertEqual(user.role, User.Role.CUSTOMER)
        self.assertEqual(user.customer_profile.name, "Asha")

    def test_duplicate_email_is_case_insensitive(self):
        self.signup()
        response = self.signup(email="ASHA@example.com")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "An account with this email already exists.")
        self.assertEqual(Customer.objects.count(), 1)

    def test_weak_password_rejected_with_field_error(self):
        response = self.signup(password="weak")
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)
        self.assertIn("Password must have", response.data["detail"])

    def test_login_returns_role_and_token_claims(self):
        make_user("staff@example.com", role=User.Role.STAFF)
        response = self.client.post(
            "/api/auth/login/",
            {"email": "STAFF@example.com", "password": GOOD_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["role"], "staff")
        claims = AccessToken(response.data["access"])
        self.assertEqual(claims["role"], "staff")
        self.assertEqual(claims["name"], "Test")

    def test_inactive_user_cannot_log_in(self):
        make_user("gone@example.com", is_active=False)
        response = self.client.post(
            "/api/auth/login/",
            {"email": "gone@example.com", "password": GOOD_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertIsInstance(response.data["detail"], str)

    def test_customer_updates_profile(self):
        self.signup()
        user = User.objects.get(email="asha@example.com")
        self.client.force_authenticate(user)
        response = self.client.patch(
            "/api/auth/me/", {"name": "New", "phone": "123", "company": "Acme"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["phone"], "123")
        self.assertEqual(response.data["customer_id"], user.customer_profile.id)
        self.assertEqual(Customer.objects.get().name, "New")


class PasswordResetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user("reset@example.com")

    def request_token(self):
        response = self.client.post(
            "/api/auth/forgot-password/", {"email": self.user.email}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        return mail.outbox[-1].body.split("token=")[1].split()[0]

    def reset(self, token, password="Brand@New1"):
        return self.client.post(
            "/api/auth/reset-password/", {"token": token, "new_password": password}, format="json"
        )

    def test_unknown_email_gets_same_response_and_no_email(self):
        known = self.client.post("/api/auth/forgot-password/", {"email": self.user.email}, format="json")
        mail.outbox.clear()
        unknown = self.client.post("/api/auth/forgot-password/", {"email": "no@example.com"}, format="json")
        self.assertEqual(known.data, unknown.data)
        self.assertEqual(unknown.status_code, 200)
        self.assertEqual(mail.outbox, [])

    def test_token_is_stored_hashed(self):
        token = self.request_token()
        self.assertFalse(PasswordResetToken.objects.filter(token_hash=token).exists())

    def test_token_works_once(self):
        token = self.request_token()
        self.assertEqual(self.reset(token).status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Brand@New1"))
        self.assertEqual(self.reset(token, "Other@Pass1").status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Brand@New1"))

    def test_expired_token_fails(self):
        token = self.request_token()
        PasswordResetToken.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.reset(token).status_code, 400)

    def test_requesting_again_invalidates_older_link(self):
        first = self.request_token()
        self.request_token()
        self.assertEqual(self.reset(first).status_code, 400)

    def test_new_password_is_validated_and_token_survives(self):
        token = self.request_token()
        self.assertEqual(self.reset(token, "weak").status_code, 400)
        self.assertEqual(self.reset(token).status_code, 200)


class StaffManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(email="admin@example.com", password=GOOD_PASSWORD, name="A")
        self.staff = make_user("staff@example.com", role=User.Role.STAFF)

    def test_create_superuser_is_admin_role(self):
        self.assertEqual(self.admin.role, User.Role.ADMIN)
        self.assertTrue(self.admin.is_staff and self.admin.is_superuser)

    def test_only_admin_can_add_staff(self):
        body = {"name": "New", "email": "new@example.com", "password": GOOD_PASSWORD}
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post("/api/users/staff/", body, format="json").status_code, 403)
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/users/staff/", body, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["role"], "staff")
        self.assertNotIn("password", response.data)
        self.assertTrue(User.objects.get(email="new@example.com").check_password(GOOD_PASSWORD))

    def test_deactivated_staff_loses_access_immediately(self):
        login = self.client.post(
            "/api/auth/login/", {"email": self.staff.email, "password": GOOD_PASSWORD}, format="json"
        )
        self.client.force_authenticate(self.admin)
        response = self.client.post(f"/api/users/staff/{self.staff.id}/deactivate/")
        self.assertFalse(response.data["is_active"])

        self.client.force_authenticate(None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)


class ConventionsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_unauthenticated_is_401_with_detail(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.data)

    def test_meta_choices_shape(self):
        self.client.force_authenticate(make_user("c@example.com"))
        response = self.client.get("/api/meta/choices/")
        self.assertEqual(response.status_code, 200)
        self.assertIn({"value": "admin", "label": "Admin"}, response.data["roles"])

    def test_schema_generates_and_docs_are_public(self):
        self.assertEqual(self.client.get("/api/schema/").status_code, 200)
        self.assertEqual(self.client.get("/api/docs/").status_code, 200)
