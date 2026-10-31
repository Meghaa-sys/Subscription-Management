from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from billing.services import generate_invoice
from common.testing import (
    make_admin,
    make_customer,
    make_plan,
    make_product,
    make_staff,
    make_subscription,
)
from subscriptions.models import Subscription

from .models import Discount, DiscountRequest, SubscriptionDiscount


class DiscountTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = make_admin()
        cls.staff = make_staff()
        cls.customer_user, cls.customer = make_customer()
        cls.other_user, cls.other_customer = make_customer("other@example.com", "Other")
        cls.plan = make_plan()
        cls.product = make_product()
        cls.subscription = make_subscription(cls.customer, cls.plan, [(cls.product, 1)])
        today = timezone.localdate()
        cls.discount = Discount.objects.create(
            name="Promo",
            discount_type=Discount.DiscountType.PERCENT,
            value=Decimal("10.00"),
            start_date=today - timedelta(days=10),
            end_date=today + timedelta(days=10),
            created_by=cls.admin,
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def body(self, **overrides):
        return {
            "name": "New",
            "discount_type": "percent",
            "value": "15.00",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            **overrides,
        }

    def attach(self, discount=None):
        return self.client.post(
            f"/api/subscriptions/{self.subscription.id}/discounts/",
            {"discount_id": (discount or self.discount).id},
            format="json",
        )


class DiscountRuleTests(DiscountTestCase):
    def test_admin_creates_and_gets_remaining_uses(self):
        response = self.client.post("/api/discounts/", self.body(usage_limit=3), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["created_by"], self.admin.id)
        self.assertEqual(response.data["remaining_uses"], 3)

    def test_unlimited_has_null_remaining_uses(self):
        response = self.client.post("/api/discounts/", self.body(), format="json")
        self.assertIsNone(response.data["remaining_uses"])

    def test_staff_read_only(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get("/api/discounts/").status_code, 200)
        self.assertEqual(self.client.post("/api/discounts/", self.body(), format="json").status_code, 403)

    def test_customer_has_no_access(self):
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.client.get("/api/discounts/").status_code, 403)

    def test_delete_is_soft(self):
        self.assertEqual(self.client.delete(f"/api/discounts/{self.discount.id}/").status_code, 204)
        self.discount.refresh_from_db()
        self.assertFalse(self.discount.is_active)

    def test_validation(self):
        cases = [
            ({"end_date": "2025-01-01"}, "end_date"),
            ({"value": "101.00"}, "value"),
            ({"applies_to": "product"}, "products"),
            ({"value": "-1.00"}, "value"),
        ]
        for overrides, field in cases:
            response = self.client.post("/api/discounts/", self.body(**overrides), format="json")
            self.assertEqual(response.status_code, 400, overrides)
            self.assertIn(field, response.data)

    def test_times_used_cannot_be_written(self):
        response = self.client.post("/api/discounts/", self.body(times_used=99), format="json")
        self.assertEqual(response.data["times_used"], 0)


class AttachTests(DiscountTestCase):
    def test_staff_attach_then_detail_and_invoice_show_it(self):
        self.client.force_authenticate(self.staff)
        response = self.attach()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["discounts"][0]["name"], "Promo")
        self.assertEqual(response.data["discounts"][0]["added_by_name"], "Staff")
        invoice, _ = generate_invoice(self.subscription.id, timezone.localdate())
        self.assertEqual(invoice.discount_total, Decimal("100.00"))

    def test_detach(self):
        self.attach()
        response = self.client.delete(f"/api/subscriptions/{self.subscription.id}/discounts/{self.discount.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["discounts"], [])

    def test_detach_unknown_is_404(self):
        response = self.client.delete(f"/api/subscriptions/{self.subscription.id}/discounts/{self.discount.id}/")
        self.assertEqual(response.status_code, 404)

    def test_double_attach_rejected(self):
        self.attach()
        self.assertEqual(self.attach().status_code, 400)

    def test_inactive_expired_or_used_up_rejected(self):
        for field, value in (
            ("is_active", False),
            ("end_date", date(2020, 1, 1)),
            ("usage_limit", 0),
        ):
            discount = Discount.objects.create(
                name="X",
                discount_type="fixed",
                value=Decimal("1.00"),
                start_date=date(2020, 1, 1),
                end_date=date(2030, 1, 1),
                created_by=self.admin,
            )
            setattr(discount, field, value)
            discount.save()
            self.assertEqual(self.attach(discount).status_code, 400, field)

    def test_closed_subscription_rejected(self):
        Subscription.objects.filter(pk=self.subscription.pk).update(status="closed")
        self.assertEqual(self.attach().status_code, 400)

    def test_customer_cannot_attach(self):
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.attach().status_code, 403)


class DiscountRequestTests(DiscountTestCase):
    def create_request(self):
        self.client.force_authenticate(self.customer_user)
        response = self.client.post(
            "/api/discount-requests/",
            {"subscription": self.subscription.id, "message": "Please?"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response.data["id"]

    def act(self, request_id, action, user, **body):
        self.client.force_authenticate(user)
        return self.client.post(f"/api/discount-requests/{request_id}/{action}/", body, format="json")

    def test_customer_creates_for_own_subscription(self):
        request_id = self.create_request()
        row = DiscountRequest.objects.get(pk=request_id)
        self.assertEqual((row.status, row.customer), ("pending", self.customer))

    def test_customer_cannot_request_on_someone_elses_subscription(self):
        self.client.force_authenticate(self.other_user)
        response = self.client.post(
            "/api/discount-requests/",
            {"subscription": self.subscription.id, "message": "x"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_staff_cannot_create(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/discount-requests/",
            {"subscription": self.subscription.id, "message": "x"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_requests_are_private_to_their_customer(self):
        request_id = self.create_request()
        self.client.force_authenticate(self.other_user)
        self.assertEqual(self.client.get("/api/discount-requests/").data["count"], 0)
        self.assertEqual(self.client.get(f"/api/discount-requests/{request_id}/").status_code, 404)

    def test_forward_then_admin_approves_with_discount(self):
        request_id = self.create_request()
        forwarded = self.act(request_id, "forward", self.staff)
        self.assertEqual(forwarded.data["status"], "forwarded")
        self.assertEqual(forwarded.data["handled_by"], self.staff.id)

        approved = self.act(request_id, "approve", self.admin, discount_id=self.discount.id)
        self.assertEqual(approved.status_code, 200)
        self.assertEqual(approved.data["status"], "approved")
        self.assertEqual(approved.data["discount_name"], "Promo")
        self.assertTrue(SubscriptionDiscount.objects.filter(subscription=self.subscription).exists())

    def test_approve_without_discount(self):
        request_id = self.create_request()
        self.assertEqual(self.act(request_id, "approve", self.admin).data["status"], "approved")
        self.assertFalse(SubscriptionDiscount.objects.exists())

    def test_staff_cannot_approve(self):
        request_id = self.create_request()
        self.assertEqual(self.act(request_id, "approve", self.staff).status_code, 403)

    def test_customer_cannot_handle_requests(self):
        request_id = self.create_request()
        self.assertEqual(self.act(request_id, "forward", self.customer_user).status_code, 403)

    def test_staff_or_admin_can_reject(self):
        first = self.create_request()
        second = self.create_request()
        self.assertEqual(self.act(first, "reject", self.staff).data["status"], "rejected")
        self.assertEqual(self.act(second, "reject", self.admin).data["status"], "rejected")

    def test_invalid_moves_rejected(self):
        request_id = self.create_request()
        self.act(request_id, "reject", self.staff)
        for action in ("forward", "approve", "reject"):
            self.assertEqual(self.act(request_id, action, self.admin).status_code, 400)

    def test_forward_only_from_pending(self):
        request_id = self.create_request()
        self.act(request_id, "forward", self.staff)
        self.assertEqual(self.act(request_id, "forward", self.staff).status_code, 400)

    def test_failed_attach_leaves_request_open(self):
        request_id = self.create_request()
        Discount.objects.filter(pk=self.discount.pk).update(is_active=False)
        response = self.act(request_id, "approve", self.admin, discount_id=self.discount.id)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(DiscountRequest.objects.get(pk=request_id).status, "pending")
