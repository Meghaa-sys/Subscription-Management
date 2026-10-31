from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from billing.models import Invoice, Payment
from common.testing import (
    make_admin,
    make_customer,
    make_plan,
    make_product,
    make_staff,
    make_subscription,
)
from subscriptions.models import Subscription


class ReportTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = make_admin()
        cls.staff = make_staff()
        cls.customer_user, cls.customer = make_customer()
        cls.today = timezone.localdate()
        cls.product = make_product("CRM", "1200.00")

        # MRR: monthly 1200 + yearly 12000/12 + weekly 300*52/12 + daily 10*365/12
        monthly = make_subscription(cls.customer, make_plan(name="M"), [(cls.product, 1)])
        make_subscription(
            cls.customer,
            make_plan(name="Y", billing_period="yearly"),
            [(make_product("Y", "12000.00"), 1)],
        )
        make_subscription(
            cls.customer,
            make_plan(name="W", billing_period="weekly"),
            [(make_product("W", "300.00"), 1)],
        )
        make_subscription(
            cls.customer,
            make_plan(name="D", billing_period="daily"),
            [(make_product("D", "10.00"), 1)],
        )
        # Not active, so never counted.
        make_subscription(cls.customer, make_plan(name="P"), [(cls.product, 9)], status="paused")
        make_subscription(cls.customer, make_plan(name="C"), [(cls.product, 9)], status="closed")

        cls.paid = cls.invoice(monthly, 1, "paid", days_late=-5, total="1000.00", paid="1000.00")
        cls.partial = cls.invoice(monthly, 2, "confirmed", days_late=10, total="500.00", paid="100.00")
        cls.older = cls.invoice(monthly, 3, "confirmed", days_late=45, total="300.00", paid="0.00")
        cls.oldest = cls.invoice(monthly, 4, "confirmed", days_late=90, total="200.00", paid="0.00")
        cls.not_due = cls.invoice(monthly, 5, "confirmed", days_late=-20, total="150.00", paid="50.00")
        cls.draft = cls.invoice(monthly, 6, "draft", days_late=30, total="7777.00", paid="0.00")
        cls.cancelled = cls.invoice(monthly, 7, "cancelled", days_late=30, total="7777.00", paid="0.00")

        cls.payment(cls.paid, "1000.00", date(2026, 3, 15))
        cls.payment(cls.partial, "100.00", date(2026, 4, 1))
        cls.payment(cls.not_due, "50.00", date(2026, 4, 20))

    @classmethod
    def invoice(cls, subscription, month, status, days_late, total, paid):
        due = cls.today - timedelta(days=days_late)
        return Invoice.objects.create(
            subscription=subscription,
            customer=cls.customer,
            period_start=date(2025, month, 1),
            period_end=date(2025, month, 28),
            invoice_date=date(2026, 1, month),
            due_date=due,
            subtotal=Decimal(total),
            total=Decimal(total),
            amount_paid=Decimal(paid),
            status=status,
        )

    @classmethod
    def payment(cls, invoice, amount, on):
        Payment.objects.create(
            invoice=invoice, method="cash", amount=Decimal(amount), payment_date=on, recorded_by=cls.staff
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.staff)


class SummaryTests(ReportTestCase):
    def test_summary_on_known_data(self):
        response = self.client.get("/api/reports/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            dict(response.data),
            {
                "active_subscriptions": 4,
                "revenue_collected": "1150.00",
                "outstanding": "1000.00",  # 400 + 300 + 200 + 100
                "overdue_count": 3,
                "overdue_amount": "900.00",
                "mrr": "3804.17",  # 1200 + 1000 + 1300 + 304.1666...
                "arr": "45650.04",
            },
        )

    def test_date_range_limits_revenue_and_invoices(self):
        response = self.client.get("/api/reports/summary/?date_from=2026-04-01&date_to=2026-04-30")
        self.assertEqual(response.data["revenue_collected"], "150.00")
        self.assertEqual(response.data["outstanding"], "0.00")
        self.assertEqual(response.data["active_subscriptions"], 4)

    def test_empty_database_gives_zero_not_null(self):
        Payment.objects.all().delete()
        Invoice.objects.all().delete()
        data = self.client.get("/api/reports/summary/").data
        self.assertEqual(data["revenue_collected"], "0.00")
        self.assertEqual(data["outstanding"], "0.00")
        self.assertEqual(data["overdue_amount"], "0.00")

    def test_stays_in_a_few_queries(self):
        with self.assertNumQueries(4):
            self.client.get("/api/reports/summary/")


class OtherReportTests(ReportTestCase):
    def test_revenue_by_month(self):
        response = self.client.get("/api/reports/revenue/")
        self.assertEqual(
            response.data,
            [{"month": "2026-03", "amount": "1000.00"}, {"month": "2026-04", "amount": "150.00"}],
        )

    def test_overdue_buckets_and_list(self):
        data = self.client.get("/api/reports/overdue/").data
        self.assertEqual(
            data["buckets"],
            [
                {"label": "0-30", "count": 1, "amount": "400.00"},
                {"label": "31-60", "count": 1, "amount": "300.00"},
                {"label": "61+", "count": 1, "amount": "200.00"},
            ],
        )
        self.assertEqual(data["count"], 3)
        self.assertEqual(data["results"][0]["id"], self.oldest.id)
        self.assertEqual(data["results"][0]["days_overdue"], 90)

    def test_overdue_is_paginated(self):
        data = self.client.get("/api/reports/overdue/?page_size=1").data
        self.assertEqual(len(data["results"]), 1)
        self.assertIsNotNone(data["next"])
        self.assertEqual(len(data["buckets"]), 3)

    def test_bucket_edges(self):
        Payment.objects.all().delete()
        Invoice.objects.all().delete()
        subscription = Subscription.objects.first()
        for month, days in ((1, 30), (2, 31), (3, 60), (4, 61)):
            self.invoice(subscription, month, "confirmed", days_late=days, total="10.00", paid="0.00")
        counts = [b["count"] for b in self.client.get("/api/reports/overdue/").data["buckets"]]
        self.assertEqual(counts, [1, 2, 1])

    def test_subscriptions_by_status_includes_zero_counts(self):
        data = self.client.get("/api/reports/subscriptions-by-status/").data
        counts = {row["status"]: row["count"] for row in data}
        self.assertEqual(
            counts,
            {"draft": 0, "quotation": 0, "confirmed": 0, "active": 4, "paused": 1, "closed": 1},
        )

    def test_invalid_dates_rejected(self):
        self.assertEqual(self.client.get("/api/reports/summary/?date_from=nonsense").status_code, 400)
        response = self.client.get("/api/reports/summary/?date_from=2026-02-01&date_to=2026-01-01")
        self.assertEqual(response.status_code, 400)

    def test_customers_cannot_see_reports(self):
        self.client.force_authenticate(self.customer_user)
        for path in ("summary", "revenue", "overdue", "subscriptions-by-status"):
            self.assertEqual(self.client.get(f"/api/reports/{path}/").status_code, 403)

    def test_admin_can_see_reports(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get("/api/reports/summary/").status_code, 200)
