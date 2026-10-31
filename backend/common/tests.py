from decimal import Decimal
from io import StringIO
from unittest import mock

from django.core.management import CommandError, call_command
from django.db.models import F, Sum
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from accounts.models import Customer, User
from billing.models import Invoice, Payment
from billing.services import run_billing
from catalog.models import PaymentTerm, Product, RecurringPlan, Tax
from discounts.models import Discount, DiscountRequest
from subscriptions.models import QuotationTemplate, Subscription

from .exceptions import BusinessRuleError, _normalise
from .money import money


class MoneyTests(SimpleTestCase):
    def test_rounds_half_up(self):
        self.assertEqual(money(Decimal("0.125")), Decimal("0.13"))
        self.assertEqual(money(Decimal("2.675")), Decimal("2.68"))
        self.assertEqual(money(Decimal("-0.125")), Decimal("-0.13"))


class ErrorShapeTests(TestCase):
    def test_field_errors_keep_their_keys_and_gain_detail(self):
        body = _normalise({"email": ["Bad email."], "name": ["Required."]})
        self.assertEqual(body["detail"], "Bad email.")
        self.assertEqual(body["email"], ["Bad email."])

    def test_non_field_errors_become_detail(self):
        self.assertEqual(_normalise({"non_field_errors": ["Nope."]}), {"detail": "Nope."})

    def test_list_errors_become_detail(self):
        self.assertEqual(_normalise(["Nope."]), {"detail": "Nope."})

    def test_nested_errors_find_a_message(self):
        body = _normalise({"lines": [{"quantity": ["Too low."]}]})
        self.assertEqual(body["detail"], "Too low.")

    def test_business_rule_error_is_400(self):
        self.assertEqual(BusinessRuleError("x").status_code, 400)

    def test_unknown_api_url_is_json(self):
        client = APIClient()
        response = client.get("/api/not-a-real-endpoint/")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Not found."})

    def test_unexpected_error_is_json_500(self):
        client = APIClient()
        client.force_authenticate(User.objects.create_user(email="a@example.com", password="x", name="A"))
        with mock.patch("common.views._options", side_effect=RuntimeError("boom")), self.assertLogs(
            "common.exceptions", level="ERROR"
        ):
            response = client.get("/api/meta/choices/")
        self.assertEqual(response.status_code, 500)
        self.assertIn("detail", response.json())


class MetaChoicesTests(TestCase):
    def test_every_list_is_present(self):
        client = APIClient()
        client.force_authenticate(User.objects.create_user(email="a@example.com", password="x", name="A"))
        data = client.get("/api/meta/choices/").data
        self.assertEqual(
            set(data),
            {
                "roles", "product_types", "tax_types", "billing_periods", "subscription_statuses",
                "invoice_statuses", "payment_methods", "discount_types", "discount_applies_to",
                "discount_request_statuses",
            },
        )
        self.assertIn({"value": "upi", "label": "UPI"}, data["payment_methods"])


class SeedTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed", stdout=StringIO())

    def test_catalogue_counts(self):
        self.assertEqual(Tax.objects.count(), 2)
        self.assertEqual(PaymentTerm.objects.count(), 3)
        self.assertEqual(Product.objects.count(), 5)
        self.assertEqual(RecurringPlan.objects.count(), 3)
        self.assertEqual(QuotationTemplate.objects.count(), 2)
        self.assertEqual(Discount.objects.count(), 2)

    def test_logins_work(self):
        client = APIClient()
        logins = {
            "admin@brightloop.test": ("Admin@12345!", "admin"),
            "staff1@brightloop.test": ("Staff@12345!", "staff"),
            "staff2@brightloop.test": ("Staff@12345!", "staff"),
            "customer1@brightloop.test": ("Customer@12345!", "customer"),
        }
        for email, (password, role) in logins.items():
            response = client.post("/api/auth/login/", {"email": email, "password": password}, format="json")
            self.assertEqual(response.status_code, 200, email)
            self.assertEqual(response.data["user"]["role"], role)

    def test_customers_include_some_without_logins(self):
        self.assertEqual(Customer.objects.count(), 20)
        self.assertTrue(Customer.objects.filter(user__isnull=True).exists())
        self.assertTrue(Customer.objects.filter(user__isnull=False).exists())

    def test_fifty_subscriptions_in_every_status(self):
        self.assertEqual(Subscription.objects.count(), 50)
        statuses = set(Subscription.objects.values_list("status", flat=True))
        self.assertEqual(statuses, set(Subscription.Status.values))

    def test_invoices_are_paid_part_paid_and_overdue(self):
        self.assertTrue(Invoice.objects.filter(status="paid").exists())
        self.assertTrue(Invoice.objects.filter(status="confirmed", amount_paid__gt=0).exists())
        client = APIClient()
        client.force_authenticate(User.objects.get(email="staff1@brightloop.test"))
        self.assertGreater(client.get("/api/invoices/?overdue=true").data["count"], 0)

    def test_payments_add_up_to_amount_paid(self):
        paid = Invoice.objects.aggregate(total=Sum("amount_paid"))["total"]
        self.assertEqual(Payment.objects.aggregate(total=Sum("amount"))["total"], paid)

    def test_paid_invoices_are_fully_paid(self):
        self.assertFalse(Invoice.objects.filter(status="paid").exclude(amount_paid=F("total")).exists())

    def test_discounts_were_used_and_limit_respected(self):
        welcome = Discount.objects.get(name="Welcome 500")
        self.assertEqual(welcome.times_used, 3)
        self.assertGreater(Discount.objects.get(name="Bulk 10%").times_used, 0)

    def test_discount_requests_in_every_status(self):
        for status in DiscountRequest.Status.values:
            self.assertTrue(DiscountRequest.objects.filter(status=status).exists(), status)

    def test_nothing_left_to_bill_today(self):
        self.assertEqual(run_billing()["created"], 0)

    def test_running_again_adds_nothing(self):
        before = Subscription.objects.count()
        call_command("seed", stdout=StringIO())
        self.assertEqual(Subscription.objects.count(), before)

    def test_reset_needs_debug_or_force(self):
        with self.assertRaises(CommandError):
            call_command("seed", "--reset", stdout=StringIO())
        self.assertEqual(Subscription.objects.count(), 50)

    def test_reset_with_force_rebuilds_the_same_data(self):
        totals = list(Invoice.objects.order_by("period_start", "total").values_list("total", flat=True))
        call_command("seed", "--reset", "--force", stdout=StringIO())
        self.assertEqual(Subscription.objects.count(), 50)
        rebuilt = list(Invoice.objects.order_by("period_start", "total").values_list("total", flat=True))
        self.assertEqual(totals, rebuilt)

    @mock.patch("common.management.commands.seed.BIG_COUNT", 40)
    @mock.patch("common.management.commands.seed.BIG_CUSTOMERS", 5)
    def test_big_adds_consistent_rows_once(self):
        call_command("seed", "--big", stdout=StringIO())
        bulk = Subscription.objects.filter(notes="Bulk performance data")
        self.assertEqual(bulk.count(), 40)
        self.assertFalse(bulk.filter(number__isnull=True).exists())
        self.assertFalse(bulk.filter(lines__isnull=True).exists())
        self.assertFalse(Invoice.objects.filter(number__isnull=True).exists())
        paid = Invoice.objects.aggregate(total=Sum("amount_paid"))["total"]
        self.assertEqual(Payment.objects.aggregate(total=Sum("amount"))["total"], paid)
        self.assertEqual(run_billing()["created"], 0)

        call_command("seed", "--big", stdout=StringIO())
        self.assertEqual(bulk.count(), 40)
