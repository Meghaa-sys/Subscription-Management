from datetime import date, timedelta
from decimal import Decimal
from unittest import mock

from django.core import mail
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APIClient

from common.testing import make_customer, make_plan, make_subscription
from discounts.models import DiscountUsage

from .models import Invoice
from .services import generate_invoice
from .tests import JAN_1, BillingTestCase


class InvoiceApiTestCase(BillingTestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.staff)
        self.subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        self.invoice, _ = generate_invoice(self.subscription.id, JAN_1)  # total 1230.00

    def url(self, suffix=""):
        return f"/api/invoices/{self.invoice.id}/{suffix}"

    def confirm(self):
        self.assertEqual(self.client.post(self.url("confirm/")).status_code, 200)

    def pay(self, amount, **overrides):
        body = {"method": "upi", "amount": amount, "payment_date": "2026-01-10", "note": "ref", **overrides}
        return self.client.post(self.url("payments/"), body, format="json")


class InvoiceActionTests(InvoiceApiTestCase):
    def test_confirm_only_from_draft(self):
        self.confirm()
        self.assertEqual(self.client.post(self.url("confirm/")).status_code, 400)

    def test_cancel_draft(self):
        self.assertEqual(self.client.post(self.url("cancel/")).data["status"], "cancelled")
        self.assertEqual(self.client.post(self.url("cancel/")).status_code, 400)

    def test_cancel_unpaid_confirmed(self):
        self.confirm()
        self.assertEqual(self.client.post(self.url("cancel/")).status_code, 200)

    def test_cancel_blocked_after_payment(self):
        self.confirm()
        self.pay("100.00")
        response = self.client.post(self.url("cancel/"))
        self.assertEqual(response.status_code, 400)
        self.assertIn("payments", response.data["detail"])

    def test_cancel_gives_back_discount_uses(self):
        discount = self.attach(self.subscription, usage_limit=1)
        invoice, _ = generate_invoice(self.subscription.id, date(2026, 2, 1))
        discount.refresh_from_db()
        self.assertEqual(discount.times_used, 1)
        self.client.post(f"/api/invoices/{invoice.id}/cancel/")
        discount.refresh_from_db()
        self.assertEqual(discount.times_used, 0)
        self.assertEqual(DiscountUsage.objects.count(), 0)

    def test_send_requires_confirmed_or_paid(self):
        self.assertEqual(self.client.post(self.url("send/")).status_code, 400)
        self.assertEqual(mail.outbox, [])

    def test_send_emails_customer_and_sets_sent_at(self):
        self.confirm()
        response = self.client.post(self.url("send/"))
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.data["sent_at"])
        self.assertEqual(mail.outbox[0].to, [self.customer.email])
        self.assertIn(self.invoice.number, mail.outbox[0].subject)
        self.assertIn(f"/portal/invoices/{self.invoice.id}", mail.outbox[0].body)

    def test_failed_email_is_a_clean_error_and_leaves_sent_at_empty(self):
        self.confirm()
        with mock.patch("billing.services.send_mail", side_effect=OSError("smtp down")), self.assertLogs(
            "billing.services", level="ERROR"
        ):
            response = self.client.post(self.url("send/"))
        self.assertEqual(response.status_code, 400)
        self.invoice.refresh_from_db()
        self.assertIsNone(self.invoice.sent_at)

    def test_bulk_reports_each_id(self):
        other = make_subscription(self.customer, self.plan, [(self.product, 1)])
        second, _ = generate_invoice(other.id, JAN_1)
        self.confirm()
        response = self.client.post(
            "/api/invoices/bulk/",
            {"action": "confirm", "ids": [self.invoice.id, second.id, 999999]},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual((response.data["succeeded"], response.data["failed"]), (1, 2))
        rows = {row["id"]: row for row in response.data["results"]}
        self.assertFalse(rows[self.invoice.id]["success"])
        self.assertEqual(rows[second.id]["status"], "confirmed")
        self.assertEqual(rows[999999]["error"], "Invoice not found.")

    def test_bulk_send(self):
        self.confirm()
        response = self.client.post(
            "/api/invoices/bulk/", {"action": "send", "ids": [self.invoice.id]}, format="json"
        )
        self.assertEqual(response.data["succeeded"], 1)
        self.assertEqual(len(mail.outbox), 1)

    def test_bulk_validates_action(self):
        response = self.client.post("/api/invoices/bulk/", {"action": "pay", "ids": [1]}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_fully_discounted_invoice_needs_no_payment(self):
        subscription = make_subscription(self.customer, self.plan, [(self.addon, 1)])
        self.attach(subscription, value=Decimal("100.00"))
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        self.assertEqual(invoice.total, Decimal("0.00"))
        response = self.client.post(f"/api/invoices/{invoice.id}/confirm/")
        self.assertEqual(response.data["status"], "paid")


class InvoiceReadTests(InvoiceApiTestCase):
    def test_detail_has_everything_for_printing(self):
        self.confirm()
        self.pay("100.00")
        data = self.client.get(self.url()).data
        self.assertEqual(data["balance"], "1130.00")
        self.assertEqual(data["customer_details"]["email"], self.customer.email)
        self.assertEqual(data["subscription_number"], self.subscription.number)
        self.assertEqual(data["plan_name"], "Monthly")
        self.assertEqual(data["lines"][0]["product_name"], "CRM")
        self.assertEqual(data["payments"][0]["method_display"], "UPI")
        self.assertEqual(data["payments"][0]["recorded_by_name"], "Staff")

    def test_applied_discounts_are_listed(self):
        self.attach(self.subscription, name="Festive")
        invoice, _ = generate_invoice(self.subscription.id, date(2026, 2, 1))
        data = self.client.get(f"/api/invoices/{invoice.id}/").data
        self.assertEqual(data["discounts"], [{"name": "Festive", "amount": "100.00"}])

    def test_overdue_is_computed_from_today(self):
        Invoice.objects.filter(pk=self.invoice.pk).update(
            status="confirmed", due_date=timezone.localdate() - timedelta(days=5)
        )
        fresh = make_subscription(self.customer, self.plan, [(self.product, 1)])
        generate_invoice(fresh.id, JAN_1)
        response = self.client.get("/api/invoices/?overdue=true")
        self.assertEqual(response.data["count"], 1)
        row = response.data["results"][0]
        self.assertTrue(row["is_overdue"])
        self.assertEqual(row["days_overdue"], 5)
        self.assertEqual(self.client.get("/api/invoices/?overdue=false").data["count"], 1)

    def test_filters(self):
        self.assertEqual(self.client.get("/api/invoices/?status=draft").data["count"], 1)
        self.assertEqual(self.client.get("/api/invoices/?status=paid").data["count"], 0)
        self.assertEqual(self.client.get(f"/api/invoices/?customer={self.customer.id}").data["count"], 1)
        self.assertEqual(self.client.get(f"/api/invoices/?subscription={self.subscription.id}").data["count"], 1)
        self.assertEqual(self.client.get("/api/invoices/?invoice_date_from=2026-01-02").data["count"], 0)
        self.assertEqual(self.client.get("/api/invoices/?invoice_date_to=2026-01-01").data["count"], 1)

    def test_list_has_no_n_plus_one(self):
        for _ in range(10):
            subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
            generate_invoice(subscription.id, JAN_1)
        with self.assertNumQueries(2):  # count, page
            self.client.get("/api/invoices/")

    def test_customer_sees_only_own_invoices_and_payments(self):
        self.confirm()
        self.pay("100.00")
        other_user, other_customer = make_customer("other@example.com", "Other")
        theirs = make_subscription(other_customer, self.plan, [(self.product, 1)])
        their_invoice, _ = generate_invoice(theirs.id, JAN_1)

        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.client.get("/api/invoices/").data["count"], 1)
        self.assertEqual(self.client.get(self.url()).status_code, 200)
        self.assertEqual(self.client.get(f"/api/invoices/{their_invoice.id}/").status_code, 404)
        self.assertEqual(self.client.get("/api/payments/").data["count"], 1)

        self.client.force_authenticate(other_user)
        self.assertEqual(self.client.get(self.url()).status_code, 404)
        self.assertEqual(self.client.get("/api/payments/").data["count"], 0)

    def test_customer_cannot_act_on_invoices(self):
        self.client.force_authenticate(self.customer_user)
        for suffix in ("confirm/", "cancel/", "send/"):
            self.assertEqual(self.client.post(self.url(suffix)).status_code, 403)
        self.assertEqual(self.pay("1.00").status_code, 403)
        response = self.client.post(
            "/api/invoices/bulk/", {"action": "confirm", "ids": [1]}, format="json"
        )
        self.assertEqual(response.status_code, 403)


class PaymentTests(InvoiceApiTestCase):
    def test_partial_then_full_becomes_paid(self):
        self.confirm()
        first = self.pay("230.00")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data["status"], "confirmed")
        self.assertEqual(first.data["balance"], "1000.00")
        second = self.pay("1000.00", method="cash")
        self.assertEqual(second.data["status"], "paid")
        self.assertEqual(second.data["balance"], "0.00")
        self.assertEqual(self.invoice.payments.count(), 2)

    def test_overpayment_rejected_and_states_balance(self):
        self.confirm()
        response = self.pay("1230.01")
        self.assertEqual(response.status_code, 400)
        self.assertIn("1230.00", response.data["detail"])
        self.assertEqual(self.invoice.payments.count(), 0)

    def test_zero_and_negative_rejected(self):
        self.confirm()
        self.assertEqual(self.pay("0.00").status_code, 400)
        self.assertEqual(self.pay("-5.00").status_code, 400)

    def test_payment_on_draft_rejected(self):
        response = self.pay("10.00")
        self.assertEqual(response.status_code, 400)
        self.assertIn("confirmed", response.data["detail"])

    def test_payment_on_paid_invoice_rejected(self):
        self.confirm()
        self.pay("1230.00")
        self.assertEqual(self.pay("1.00").status_code, 400)

    def test_invalid_method_is_a_field_error(self):
        self.confirm()
        response = self.pay("1.00", method="crypto")
        self.assertEqual(response.status_code, 400)
        self.assertIn("method", response.data)

    def test_recorded_by_is_the_user(self):
        self.confirm()
        self.pay("1.00")
        self.assertEqual(self.invoice.payments.get().recorded_by, self.staff)

    def test_payment_filters(self):
        self.confirm()
        self.pay("1.00")
        self.pay("2.00", method="cash", payment_date="2026-02-10")
        self.assertEqual(self.client.get("/api/payments/?method=cash").data["count"], 1)
        self.assertEqual(self.client.get("/api/payments/?payment_date_from=2026-02-01").data["count"], 1)
        self.assertEqual(self.client.get(f"/api/payments/?invoice={self.invoice.id}").data["count"], 2)
        self.assertEqual(self.client.get(f"/api/payments/?customer={self.customer.id}").data["count"], 2)
        self.assertEqual(self.client.get("/api/payments/?customer=999999").data["count"], 0)

    def test_database_blocks_paying_more_than_total(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Invoice.objects.filter(pk=self.invoice.pk).update(amount_paid=Decimal("9999.00"))
