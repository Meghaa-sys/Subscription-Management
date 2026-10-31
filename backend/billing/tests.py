from datetime import date, timedelta
from decimal import Decimal
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import PaymentTerm, Product, RecurringPlan, Tax
from common.testing import (
    make_admin,
    make_customer,
    make_fixed_tax,
    make_percent_tax,
    make_plan,
    make_product,
    make_staff,
    make_subscription,
)
from discounts.models import Discount, DiscountUsage, SubscriptionDiscount
from subscriptions.models import Subscription
from subscriptions.services import transition_subscription

from .models import Invoice
from .services import allocate_discounts, generate_invoice, run_billing

Status = Subscription.Status
JAN_1 = date(2026, 1, 1)


class BillingTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = make_admin()
        cls.staff = make_staff()
        cls.customer_user, cls.customer = make_customer()
        cls.gst = make_percent_tax()
        cls.fee = make_fixed_tax()
        cls.plan = make_plan()
        cls.product = make_product("CRM", "1000.00", taxes=[cls.gst, cls.fee])
        cls.addon = make_product("Backup", "500.00", taxes=[cls.gst], product_type=Product.ProductType.ADDON)

    def attach(self, subscription, **overrides):
        products = overrides.pop("products", [])
        defaults = {
            "name": "Promo",
            "discount_type": Discount.DiscountType.PERCENT,
            "value": Decimal("10.00"),
            "start_date": date(2025, 1, 1),
            "end_date": date(2030, 1, 1),
            "created_by": self.admin,
        }
        discount = Discount.objects.create(**{**defaults, **overrides})
        discount.products.set(products)
        SubscriptionDiscount.objects.create(subscription=subscription, discount=discount, added_by=self.admin)
        return discount


class InvoiceTotalsTests(BillingTestCase):
    def test_totals_with_percent_tax_fixed_tax_and_discount(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 2), (self.addon, 1)])
        self.attach(subscription)

        invoice, created = generate_invoice(subscription.id, JAN_1)

        self.assertTrue(created)
        self.assertEqual(invoice.subtotal, Decimal("2500.00"))
        self.assertEqual(invoice.discount_total, Decimal("250.00"))
        # CRM: taxable 1800 -> 18% = 324 + fixed 50 = 374. Backup: taxable 450 -> 81.
        self.assertEqual(invoice.tax_total, Decimal("455.00"))
        self.assertEqual(invoice.total, Decimal("2705.00"))
        crm, backup = invoice.lines.all()
        self.assertEqual(crm.discount_amount, Decimal("200.00"))
        self.assertEqual(crm.tax_amount, Decimal("374.00"))
        self.assertEqual(crm.line_total, Decimal("2174.00"))
        self.assertEqual(backup.discount_amount, Decimal("50.00"))
        self.assertEqual(backup.line_total, Decimal("531.00"))
        self.assertEqual(sum(line.line_total for line in invoice.lines.all()), invoice.total)

    def test_invoice_fields(self):
        term = PaymentTerm.objects.create(name="Net 15", due_days=15)
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)], payment_term=term)
        invoice, _ = generate_invoice(subscription.id, date(2026, 1, 5))
        self.assertEqual(invoice.number, f"INV/2026/{invoice.id:05d}")
        self.assertEqual(invoice.status, "draft")
        self.assertEqual(invoice.period_start, JAN_1)
        self.assertEqual(invoice.period_end, date(2026, 1, 31))
        self.assertEqual(invoice.invoice_date, date(2026, 1, 5))
        self.assertEqual(invoice.due_date, date(2026, 1, 20))
        subscription.refresh_from_db()
        self.assertEqual(subscription.next_billing_date, date(2026, 2, 1))

    def test_no_payment_term_is_due_on_invoice_date(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        self.assertEqual(invoice.due_date, JAN_1)

    def test_variant_shown_in_description(self):
        variant = self.product.variants.create(attribute="Brand", value="Odoo", extra_price=Decimal("560.00"))
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        subscription.lines.update(variant=variant)
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        self.assertEqual(invoice.lines.get().description, "CRM (Brand: Odoo)")

    def test_old_invoices_keep_their_values_when_prices_change(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        Tax.objects.filter(pk=self.gst.pk).update(rate=Decimal("50.00"))
        subscription.lines.update(unit_price=Decimal("9999.00"))
        invoice.refresh_from_db()
        self.assertEqual(invoice.total, Decimal("1230.00"))
        self.assertEqual(invoice.lines.get().unit_price, Decimal("1000.00"))

    def test_addon_affects_next_invoice_only(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        first, _ = generate_invoice(subscription.id, JAN_1)
        subscription.lines.create(
            product=self.addon, quantity=1, unit_price=Decimal("500.00"),
            tax_amount=Decimal("90.00"), amount=Decimal("500.00"),
        )
        second, _ = generate_invoice(subscription.id, date(2026, 2, 1))
        self.assertEqual(first.lines.count(), 1)
        self.assertEqual(second.lines.count(), 2)


class BillingPeriodTests(BillingTestCase):
    def period_end(self, billing_period, start):
        plan = make_plan(name=billing_period, billing_period=billing_period)
        subscription = make_subscription(self.customer, plan, [(self.product, 1)], start_date=start)
        invoice, _ = generate_invoice(subscription.id, start)
        subscription.refresh_from_db()
        return invoice.period_end, subscription.next_billing_date

    def test_monthly_from_31_jan_ends_correctly(self):
        self.assertEqual(
            self.period_end("monthly", date(2026, 1, 31)),
            (date(2026, 2, 27), date(2026, 2, 28)),
        )

    def test_monthly_from_31_jan_in_a_leap_year(self):
        self.assertEqual(
            self.period_end("monthly", date(2028, 1, 31)),
            (date(2028, 2, 28), date(2028, 2, 29)),
        )

    def test_daily(self):
        self.assertEqual(self.period_end("daily", JAN_1), (JAN_1, date(2026, 1, 2)))

    def test_weekly(self):
        self.assertEqual(self.period_end("weekly", JAN_1), (date(2026, 1, 7), date(2026, 1, 8)))

    def test_yearly(self):
        self.assertEqual(self.period_end("yearly", JAN_1), (date(2026, 12, 31), date(2027, 1, 1)))


class IdempotencyTests(BillingTestCase):
    def test_billing_twice_creates_no_duplicates(self):
        make_subscription(self.customer, self.plan, [(self.product, 1)])
        first = run_billing(JAN_1)
        second = run_billing(JAN_1)
        self.assertEqual(first["created"], 1)
        self.assertEqual(second, {"created": 0, "skipped": 0, "subscriptions_processed": 0, "failed": 0})
        self.assertEqual(Invoice.objects.count(), 1)

    def test_existing_invoice_is_kept_and_the_date_still_advances(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        Subscription.objects.filter(pk=subscription.pk).update(next_billing_date=JAN_1)

        result = run_billing(JAN_1)

        self.assertEqual((result["created"], result["skipped"]), (0, 1))
        self.assertEqual(Invoice.objects.get().pk, invoice.pk)
        subscription.refresh_from_db()
        self.assertEqual(subscription.next_billing_date, date(2026, 2, 1))

    def test_database_refuses_a_second_invoice_for_a_period(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Invoice.objects.create(
                subscription=subscription,
                customer=self.customer,
                period_start=invoice.period_start,
                period_end=invoice.period_end,
                invoice_date=JAN_1,
                due_date=JAN_1,
            )

    def test_cancelled_invoice_is_not_billed_again(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        Invoice.objects.filter(pk=invoice.pk).update(status=Invoice.Status.CANCELLED)
        Subscription.objects.filter(pk=subscription.pk).update(next_billing_date=JAN_1)
        run_billing(JAN_1)
        self.assertEqual(Invoice.objects.count(), 1)

    def test_one_failure_does_not_stop_the_run(self):
        bad = make_subscription(self.customer, self.plan, [(self.product, 1)])
        good = make_subscription(self.customer, self.plan, [(self.product, 1)])
        real = generate_invoice

        def fail_for_bad(subscription_id, today):
            if subscription_id == bad.id:
                raise RuntimeError("boom")
            return real(subscription_id, today)

        with mock.patch("billing.services.generate_invoice", side_effect=fail_for_bad), self.assertLogs(
            "billing.services", level="ERROR"
        ):
            result = run_billing(JAN_1)

        self.assertEqual(result["failed"], 1)
        self.assertEqual(result["created"], 1)
        self.assertTrue(Invoice.objects.filter(subscription=good).exists())


class WhenToBillTests(BillingTestCase):
    def test_future_date_not_billed(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)], start_date=date(2026, 6, 1))
        self.assertIsNone(generate_invoice(subscription.id, JAN_1))

    def test_paused_subscription_not_billed(self):
        subscription = make_subscription(
            self.customer, self.plan, [(self.product, 1)], status=Status.PAUSED, next_billing_date=JAN_1
        )
        self.assertIsNone(generate_invoice(subscription.id, JAN_1))
        self.assertEqual(run_billing(JAN_1)["subscriptions_processed"], 0)
        self.assertEqual(Invoice.objects.count(), 0)

    def test_resume_does_not_bill_paused_periods(self):
        today = timezone.localdate()
        subscription = make_subscription(
            self.customer, self.plan, [(self.product, 1)], status=Status.PAUSED,
            next_billing_date=today - timedelta(days=90),
        )
        transition_subscription(subscription.id, Status.ACTIVE)

        result = run_billing(today)

        self.assertEqual(result["created"], 1)
        self.assertEqual(Invoice.objects.get().period_start, today)

    def test_catches_up_every_missed_period_in_order(self):
        make_subscription(self.customer, self.plan, [(self.product, 1)])
        result = run_billing(date(2026, 3, 15))
        self.assertEqual(result["created"], 3)
        self.assertEqual(result["subscriptions_processed"], 1)
        starts = list(Invoice.objects.order_by("period_start").values_list("period_start", flat=True))
        self.assertEqual(starts, [date(2026, 1, 1), date(2026, 2, 1), date(2026, 3, 1)])

    def test_no_period_is_skipped_across_runs(self):
        make_subscription(self.customer, self.plan, [(self.product, 1)])
        for day in (date(2026, 1, 1), date(2026, 2, 1), date(2026, 2, 2), date(2026, 3, 1)):
            run_billing(day)
        self.assertEqual(Invoice.objects.count(), 3)

    def test_nothing_billed_past_expiry(self):
        subscription = make_subscription(
            self.customer, self.plan, [(self.product, 1)], expiry_date=date(2026, 2, 28)
        )
        result = run_billing(date(2026, 6, 1))
        self.assertEqual(result["created"], 2)
        subscription.refresh_from_db()
        self.assertEqual(subscription.next_billing_date, date(2026, 3, 1))

    def test_renewal_lets_billing_continue(self):
        subscription = make_subscription(
            self.customer, self.plan, [(self.product, 1)], expiry_date=date(2026, 1, 31)
        )
        run_billing(date(2026, 2, 15))
        Subscription.objects.filter(pk=subscription.pk).update(expiry_date=date(2026, 2, 28))
        self.assertEqual(run_billing(date(2026, 2, 15))["created"], 1)


class DiscountBillingTests(BillingTestCase):
    def test_stops_after_usage_limit(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        discount = self.attach(subscription, usage_limit=2)
        run_billing(date(2026, 3, 1))
        invoices = Invoice.objects.order_by("period_start")
        self.assertEqual(
            [invoice.discount_total for invoice in invoices],
            [Decimal("100.00"), Decimal("100.00"), Decimal("0.00")],
        )
        discount.refresh_from_db()
        self.assertEqual(discount.times_used, 2)
        self.assertEqual(discount.remaining_uses, 0)
        self.assertEqual(DiscountUsage.objects.count(), 2)

    def test_expired_discount_ignored(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        self.attach(subscription, start_date=date(2025, 1, 1), end_date=date(2025, 12, 31))
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        self.assertEqual(invoice.discount_total, Decimal("0.00"))
        self.assertEqual(DiscountUsage.objects.count(), 0)

    def test_future_and_inactive_discounts_ignored(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        self.attach(subscription, start_date=date(2026, 6, 1))
        self.attach(subscription, is_active=False)
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        self.assertEqual(invoice.discount_total, Decimal("0.00"))

    def test_unattached_discount_ignored(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        other = make_subscription(self.customer, self.plan, [(self.product, 1)])
        self.attach(other)
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        self.assertEqual(invoice.discount_total, Decimal("0.00"))

    def test_minimum_purchase(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        self.attach(subscription, min_purchase=Decimal("1000.01"))
        self.assertEqual(generate_invoice(subscription.id, JAN_1)[0].discount_total, Decimal("0.00"))
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        self.attach(subscription, min_purchase=Decimal("1000.00"))
        self.assertEqual(generate_invoice(subscription.id, JAN_1)[0].discount_total, Decimal("100.00"))

    def test_minimum_quantity(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 19)])
        self.attach(subscription, min_quantity=20)
        self.assertEqual(generate_invoice(subscription.id, JAN_1)[0].discount_total, Decimal("0.00"))
        subscription = make_subscription(self.customer, self.plan, [(self.product, 20)])
        self.attach(subscription, min_quantity=20)
        self.assertEqual(generate_invoice(subscription.id, JAN_1)[0].discount_total, Decimal("2000.00"))

    def test_product_scoped_discount_only_touches_matching_lines(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1), (self.addon, 1)])
        self.attach(
            subscription,
            value=Decimal("20.00"),
            applies_to=Discount.AppliesTo.PRODUCT,
            products=[self.addon],
        )
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        crm, backup = invoice.lines.all()
        self.assertEqual(invoice.discount_total, Decimal("100.00"))
        self.assertEqual(crm.discount_amount, Decimal("0.00"))
        self.assertEqual(backup.discount_amount, Decimal("100.00"))
        self.assertEqual(crm.tax_amount, Decimal("230.00"))
        self.assertEqual(backup.tax_amount, Decimal("72.00"))

    def test_fixed_discount_cannot_exceed_its_base(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1), (self.addon, 1)])
        self.attach(
            subscription,
            discount_type=Discount.DiscountType.FIXED,
            value=Decimal("800.00"),
            applies_to=Discount.AppliesTo.PRODUCT,
            products=[self.addon],
        )
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        self.assertEqual(invoice.discount_total, Decimal("500.00"))

    def test_stacked_discounts_never_exceed_subtotal(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        fixed = {"discount_type": Discount.DiscountType.FIXED, "value": Decimal("700.00")}
        first = self.attach(subscription, **fixed)
        second = self.attach(subscription, **fixed)
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        self.assertEqual(invoice.discount_total, Decimal("1000.00"))
        self.assertEqual(invoice.subtotal - invoice.discount_total, Decimal("0.00"))
        usages = {usage.discount_id: usage.amount for usage in DiscountUsage.objects.all()}
        self.assertEqual(usages, {first.id: Decimal("700.00"), second.id: Decimal("300.00")})

    def test_stacked_product_discounts_never_push_a_line_negative(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1), (self.addon, 1)])
        fixed = {
            "discount_type": Discount.DiscountType.FIXED,
            "value": Decimal("400.00"),
            "applies_to": Discount.AppliesTo.PRODUCT,
            "products": [self.addon],
        }
        self.attach(subscription, **fixed)
        self.attach(subscription, **fixed)
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        backup = invoice.lines.get(product=self.addon)
        self.assertEqual(backup.discount_amount, Decimal("500.00"))
        self.assertEqual(invoice.discount_total, Decimal("500.00"))

    def test_discount_shares_sum_exactly_despite_rounding(self):
        products = [(make_product(f"P{index}", "33.33"), 1) for index in range(3)]
        subscription = make_subscription(self.customer, self.plan, products)
        self.attach(subscription, discount_type=Discount.DiscountType.FIXED, value=Decimal("10.00"))
        invoice, _ = generate_invoice(subscription.id, JAN_1)
        self.assertEqual(sum(line.discount_amount for line in invoice.lines.all()), Decimal("10.00"))

    def test_allocation_never_goes_negative_with_many_tiny_shares(self):
        subscription = make_subscription(self.customer, self.plan, [(make_product(f"P{i}", "1.00"), 1) for i in range(4)])
        discount = self.attach(subscription, discount_type=Discount.DiscountType.FIXED, value=Decimal("0.02"))
        lines = list(subscription.lines.all())
        shares, used = allocate_discounts([(discount, Decimal("0.02"))], lines)
        self.assertEqual(sum(shares.values()), Decimal("0.02"))
        self.assertTrue(all(share >= 0 for share in shares.values()))

    def test_discounted_period_catch_up_counts_each_invoice(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        discount = self.attach(subscription)
        run_billing(date(2026, 3, 1))
        discount.refresh_from_db()
        self.assertEqual(discount.times_used, 3)


class BillingCommandTests(BillingTestCase):
    def test_run_billing_command_with_date(self):
        make_subscription(self.customer, self.plan, [(self.product, 1)])
        out = StringIO()
        call_command("run_billing", "--date", "2026-02-01", stdout=out)
        self.assertEqual(Invoice.objects.count(), 2)
        self.assertIn("Created 2", out.getvalue())

    def test_billing_endpoint_is_admin_only(self):
        make_subscription(self.customer, self.plan, [(self.product, 1)])
        client = APIClient()
        client.force_authenticate(self.staff)
        self.assertEqual(client.post("/api/billing/run/").status_code, 403)
        client.force_authenticate(self.admin)
        response = client.post("/api/billing/run/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["created"], 1)
        self.assertEqual(client.post("/api/billing/run/").data["created"], 0)

    def test_scheduler_jobs_run(self):
        from billing.management.commands.scheduler import billing_job, close_expired_job

        make_subscription(self.customer, self.plan, [(self.product, 1)])
        with mock.patch("billing.management.commands.scheduler.close_old_connections"):
            billing_job()
            close_expired_job()
        self.assertGreaterEqual(Invoice.objects.count(), 1)

    def test_draft_subscription_delete_detaches_discounts(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)], status=Status.DRAFT)
        self.attach(subscription)
        client = APIClient()
        client.force_authenticate(self.staff)
        self.assertEqual(client.delete(f"/api/subscriptions/{subscription.id}/").status_code, 204)
        self.assertFalse(Subscription.objects.filter(pk=subscription.pk).exists())

    def test_active_subscription_cannot_be_deleted(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        client = APIClient()
        client.force_authenticate(self.staff)
        self.assertEqual(client.delete(f"/api/subscriptions/{subscription.id}/").status_code, 400)


class BulkScaleSmokeTests(BillingTestCase):
    def test_hundred_subscriptions_due_on_one_day(self):
        for _ in range(100):
            make_subscription(self.customer, self.plan, [(self.product, 1)])
        result = run_billing(JAN_1)
        self.assertEqual(result["created"], 100)
        self.assertEqual(run_billing(JAN_1)["created"], 0)
        self.assertEqual(Invoice.objects.count(), 100)
        self.assertEqual(Invoice.objects.values("number").distinct().count(), 100)


class BillingPeriodEnumTests(TestCase):
    def test_every_period_has_a_delta(self):
        for value in RecurringPlan.BillingPeriod.values:
            self.assertIsNotNone(RecurringPlan(billing_period=value).period_delta)
