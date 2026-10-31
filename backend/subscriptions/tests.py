from datetime import date, timedelta
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import Product
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

from .models import QuotationTemplate, Subscription, SubscriptionStatusHistory
from .services import compute_line, tax_for

Status = Subscription.Status


class SubscriptionTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = make_admin()
        cls.staff = make_staff()
        cls.customer_user, cls.customer = make_customer()
        cls.other_user, cls.other_customer = make_customer("other@example.com", "Other")
        cls.tax = make_percent_tax()
        cls.plan = make_plan()
        cls.product = make_product(taxes=[cls.tax])
        cls.addon = make_product("Backup", "200.00", product_type=Product.ProductType.ADDON)

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    def body(self, **overrides):
        return {
            "customer": self.customer.id,
            "plan": self.plan.id,
            "start_date": "2026-01-01",
            "lines": [{"product": self.product.id, "quantity": 2}],
            **overrides,
        }

    def transition(self, subscription, to_status, **body):
        return self.client.post(
            f"/api/subscriptions/{subscription.id}/transition/",
            {"to_status": to_status, **body},
            format="json",
        )


class PricingTests(SubscriptionTestCase):
    def test_tax_for_sums_percent_and_fixed(self):
        product = make_product(taxes=[self.tax, make_fixed_tax()])
        self.assertEqual(tax_for(product, Decimal("1000.00")), Decimal("230.00"))

    def test_tax_for_ignores_inactive_taxes(self):
        self.tax.is_active = False
        self.tax.save()
        self.assertEqual(tax_for(self.product, Decimal("1000.00")), Decimal("0.00"))

    def test_tax_rounds_half_up(self):
        product = make_product(taxes=[make_percent_tax("5.00")])
        self.assertEqual(tax_for(product, Decimal("10.10")), Decimal("0.51"))

    def test_compute_line_adds_variant_extra_price(self):
        variant = self.product.variants.create(attribute="Brand", value="Odoo", extra_price=Decimal("560.00"))
        self.assertEqual(
            compute_line(self.product, variant, 2),
            (Decimal("1560.00"), Decimal("561.60"), Decimal("3120.00")),
        )


class CrudTests(SubscriptionTestCase):
    def test_create_assigns_number_computes_lines_and_writes_history(self):
        response = self.client.post("/api/subscriptions/", self.body(), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["number"], f"SUB-{response.data['id']:05d}")
        self.assertEqual(response.data["status"], "draft")
        line = response.data["lines"][0]
        self.assertEqual(line["amount"], "2000.00")
        self.assertEqual(line["tax_amount"], "360.00")
        self.assertEqual(line["line_total"], "2360.00")
        self.assertEqual(response.data["total"], "2360.00")
        self.assertEqual(response.data["salesperson"], self.staff.id)
        self.assertEqual(len(response.data["history"]), 1)

    def test_quantity_below_plan_minimum_rejected(self):
        plan = make_plan(name="Team", min_quantity=5)
        response = self.client.post("/api/subscriptions/", self.body(plan=plan.id), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("at least 5", response.data["detail"])

    def test_inactive_plan_rejected(self):
        plan = make_plan(is_active=False)
        response = self.client.post("/api/subscriptions/", self.body(plan=plan.id), format="json")
        self.assertEqual(response.status_code, 400)

    def test_start_outside_plan_availability_rejected(self):
        plan = make_plan(start_date=date(2027, 1, 1))
        response = self.client.post("/api/subscriptions/", self.body(plan=plan.id), format="json")
        self.assertEqual(response.status_code, 400)

    def test_variant_of_another_product_rejected(self):
        variant = self.addon.variants.create(attribute="A", value="B")
        lines = [{"product": self.product.id, "variant": variant.id, "quantity": 1}]
        response = self.client.post("/api/subscriptions/", self.body(lines=lines), format="json")
        self.assertEqual(response.status_code, 400)

    def test_edit_replaces_lines_in_draft(self):
        created = self.client.post("/api/subscriptions/", self.body(), format="json").data
        lines = [{"product": self.product.id, "quantity": 3}]
        response = self.client.patch(f"/api/subscriptions/{created['id']}/", {"lines": lines}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["lines"]), 1)
        self.assertEqual(response.data["subtotal"], "3000.00")

    def test_edit_blocked_after_quotation(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)], status=Status.CONFIRMED)
        response = self.client.patch(f"/api/subscriptions/{subscription.id}/", {"notes": "x"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_filters_and_search(self):
        mine = make_subscription(self.customer, self.plan, [(self.product, 1)])
        make_subscription(self.other_customer, self.plan, [(self.product, 1)], status=Status.DRAFT)
        self.assertEqual(self.client.get("/api/subscriptions/?status=active").data["count"], 1)
        self.assertEqual(self.client.get(f"/api/subscriptions/?customer={self.customer.id}").data["count"], 1)
        self.assertEqual(self.client.get("/api/subscriptions/?search=other").data["count"], 1)
        self.assertEqual(self.client.get(f"/api/subscriptions/?search={mine.number}").data["count"], 1)
        self.assertEqual(self.client.get("/api/subscriptions/?start_date_from=2026-02-01").data["count"], 0)

    def test_list_has_no_n_plus_one(self):
        for _ in range(10):
            make_subscription(self.customer, self.plan, [(self.product, 1)])
        with self.assertNumQueries(3):  # count, page, lines
            self.client.get("/api/subscriptions/")


class AccessTests(SubscriptionTestCase):
    def test_customer_sees_only_own(self):
        mine = make_subscription(self.customer, self.plan, [(self.product, 1)])
        theirs = make_subscription(self.other_customer, self.plan, [(self.product, 1)])
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.client.get("/api/subscriptions/").data["count"], 1)
        self.assertEqual(self.client.get(f"/api/subscriptions/{mine.id}/").status_code, 200)
        self.assertEqual(self.client.get(f"/api/subscriptions/{theirs.id}/").status_code, 404)

    def test_customer_cannot_create_or_edit(self):
        mine = make_subscription(self.customer, self.plan, [(self.product, 1)], status=Status.DRAFT)
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.client.post("/api/subscriptions/", self.body(), format="json").status_code, 403)
        self.assertEqual(self.client.patch(f"/api/subscriptions/{mine.id}/", {}, format="json").status_code, 403)

    def test_customer_can_pause_and_resume_own(self):
        mine = make_subscription(self.customer, self.plan, [(self.product, 1)])
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.transition(mine, "paused").status_code, 200)
        self.assertEqual(self.transition(mine, "active").status_code, 200)

    def test_customer_cannot_close(self):
        mine = make_subscription(self.customer, self.plan, [(self.product, 1)])
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.transition(mine, "closed").status_code, 403)

    def test_customer_cannot_pause_someone_elses(self):
        theirs = make_subscription(self.other_customer, self.plan, [(self.product, 1)])
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.transition(theirs, "paused").status_code, 404)


class TransitionTests(SubscriptionTestCase):
    def test_draft_to_active_rejected(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)], status=Status.DRAFT)
        response = self.transition(subscription, "active")
        self.assertEqual(response.status_code, 400)
        self.assertIn("cannot move", response.data["detail"])

    def test_full_lifecycle_writes_history(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)], status=Status.DRAFT)
        for to_status in ("quotation", "confirmed", "active", "paused", "active", "closed"):
            self.assertEqual(self.transition(subscription, to_status, note="step").status_code, 200)
        rows = SubscriptionStatusHistory.objects.filter(subscription=subscription).order_by("id")
        self.assertEqual(len(rows), 6)
        self.assertEqual((rows[0].from_status, rows[0].to_status), ("draft", "quotation"))
        self.assertEqual(rows[0].changed_by, self.staff)
        self.assertEqual(rows[0].note, "step")

    def test_rejected_transition_writes_no_history(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)], status=Status.DRAFT)
        self.transition(subscription, "closed")
        self.assertFalse(SubscriptionStatusHistory.objects.filter(subscription=subscription).exists())

    def test_closed_is_final(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)], status=Status.CLOSED)
        self.assertEqual(self.transition(subscription, "active").status_code, 400)

    def test_pause_blocked_when_plan_not_pausable(self):
        plan = make_plan(pausable=False)
        subscription = make_subscription(self.customer, plan, [(self.product, 1)])
        response = self.transition(subscription, "paused")
        self.assertEqual(response.status_code, 400)
        self.assertIn("pausing", response.data["detail"])

    def test_close_before_expiry_blocked_when_not_closable(self):
        plan = make_plan(closable=False)
        expiry = timezone.localdate() + timedelta(days=10)
        subscription = make_subscription(self.customer, plan, [(self.product, 1)], expiry_date=expiry)
        self.assertEqual(self.transition(subscription, "closed").status_code, 400)

    def test_close_on_expiry_allowed_when_not_closable(self):
        plan = make_plan(closable=False)
        subscription = make_subscription(
            self.customer, plan, [(self.product, 1)], expiry_date=timezone.localdate()
        )
        self.assertEqual(self.transition(subscription, "closed").status_code, 200)

    def test_confirm_blocked_when_quote_expired(self):
        subscription = make_subscription(
            self.customer,
            self.plan,
            [(self.product, 1)],
            status=Status.QUOTATION,
            quote_valid_until=timezone.localdate() - timedelta(days=1),
        )
        response = self.transition(subscription, "confirmed")
        self.assertEqual(response.status_code, 400)
        self.assertIn("expired", response.data["detail"])

    def test_confirm_requires_lines(self):
        subscription = make_subscription(self.customer, self.plan, [], status=Status.QUOTATION)
        self.assertEqual(self.transition(subscription, "confirmed").status_code, 400)

    def test_first_activation_sets_next_billing_date(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)], status=Status.CONFIRMED)
        self.assertEqual(self.transition(subscription, "active").data["next_billing_date"], "2026-01-01")

    def test_resume_moves_next_billing_to_today(self):
        subscription = make_subscription(
            self.customer, self.plan, [(self.product, 1)], status=Status.PAUSED,
            next_billing_date=date(2026, 1, 1),
        )
        response = self.transition(subscription, "active")
        self.assertEqual(response.data["next_billing_date"], timezone.localdate().isoformat())

    def test_resume_keeps_future_billing_date(self):
        future = timezone.localdate() + timedelta(days=20)
        subscription = make_subscription(
            self.customer, self.plan, [(self.product, 1)], status=Status.PAUSED, next_billing_date=future
        )
        self.assertEqual(self.transition(subscription, "active").data["next_billing_date"], future.isoformat())

    def test_detail_lists_allowed_transitions(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        response = self.client.get(f"/api/subscriptions/{subscription.id}/")
        self.assertEqual(response.data["allowed_transitions"], ["paused", "closed"])


class RenewTests(SubscriptionTestCase):
    def renew(self, subscription):
        return self.client.post(f"/api/subscriptions/{subscription.id}/renew/", {}, format="json")

    def test_renew_extends_expiry_by_one_period(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)], expiry_date=date(2026, 3, 31))
        response = self.renew(subscription)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["expiry_date"], "2026-04-30")

    def test_renew_blocked_when_not_renewable(self):
        plan = make_plan(renewable=False)
        subscription = make_subscription(self.customer, plan, [(self.product, 1)], expiry_date=date(2026, 3, 31))
        self.assertEqual(self.renew(subscription).status_code, 400)

    def test_customer_can_renew_own(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)], expiry_date=date(2026, 3, 31))
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.renew(subscription).status_code, 200)

    def test_renew_needs_an_expiry_date(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        self.assertEqual(self.renew(subscription).status_code, 400)


class AddonTests(SubscriptionTestCase):
    def add(self, subscription, product):
        return self.client.post(
            f"/api/subscriptions/{subscription.id}/lines/",
            {"product": product.id, "quantity": 1},
            format="json",
        )

    def test_add_and_remove_addon_on_active(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        response = self.add(subscription, self.addon)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["lines"]), 2)
        line_id = response.data["lines"][1]["id"]
        response = self.client.delete(f"/api/subscriptions/{subscription.id}/lines/{line_id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["lines"]), 1)

    def test_addon_quantity_is_exempt_from_plan_minimum(self):
        plan = make_plan(min_quantity=5)
        subscription = make_subscription(self.customer, plan, [(self.product, 5)])
        self.assertEqual(self.add(subscription, self.addon).status_code, 201)

    def test_non_addon_rejected(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        self.assertEqual(self.add(subscription, self.product).status_code, 400)

    def test_non_addon_line_cannot_be_removed(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        line = subscription.lines.get()
        response = self.client.delete(f"/api/subscriptions/{subscription.id}/lines/{line.id}/")
        self.assertEqual(response.status_code, 400)

    def test_addons_only_on_active(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)], status=Status.PAUSED)
        self.assertEqual(self.add(subscription, self.addon).status_code, 400)

    def test_customer_cannot_change_lines(self):
        subscription = make_subscription(self.customer, self.plan, [(self.product, 1)])
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.add(subscription, self.addon).status_code, 403)


class TemplateTests(SubscriptionTestCase):
    def make_template(self, **overrides):
        variant = self.product.variants.create(attribute="Brand", value="Odoo", extra_price="560.00")
        body = {
            "name": "Starter",
            "plan": self.plan.id,
            "validity_days": 15,
            "lines": [{"product": self.product.id, "variant": variant.id, "quantity": 2}],
            **overrides,
        }
        response = self.client.post("/api/quotation-templates/", body, format="json")
        self.assertEqual(response.status_code, 201)
        return response.data

    def test_create_subscription_copies_lines_with_variant_price(self):
        template = self.make_template()
        response = self.client.post(
            f"/api/quotation-templates/{template['id']}/create-subscription/",
            {"customer_id": self.customer.id, "start_date": "2026-11-01"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "quotation")
        self.assertEqual(response.data["template"], template["id"])
        self.assertEqual(
            response.data["quote_valid_until"],
            (timezone.localdate() + timedelta(days=15)).isoformat(),
        )
        line = response.data["lines"][0]
        self.assertEqual(line["unit_price"], "1560.00")
        self.assertEqual(line["amount"], "3120.00")
        self.assertEqual(line["variant_label"], "Brand: Odoo")
        self.assertEqual(len(response.data["history"]), 1)
        self.assertEqual(response.data["history"][0]["to_status"], "quotation")

    def test_later_price_changes_do_not_touch_existing_quotes(self):
        template = self.make_template()
        created = self.client.post(
            f"/api/quotation-templates/{template['id']}/create-subscription/",
            {"customer_id": self.customer.id, "start_date": "2026-11-01"},
            format="json",
        ).data
        Product.objects.filter(pk=self.product.pk).update(sales_price=9999)
        detail = self.client.get(f"/api/subscriptions/{created['id']}/").data
        self.assertEqual(detail["lines"][0]["unit_price"], "1560.00")

    def test_template_line_below_minimum_rejected(self):
        plan = make_plan(min_quantity=5)
        body = {
            "name": "Bad",
            "plan": plan.id,
            "lines": [{"product": self.product.id, "quantity": 1}],
        }
        self.assertEqual(self.client.post("/api/quotation-templates/", body, format="json").status_code, 400)

    def test_inactive_template_refused(self):
        template = self.make_template()
        self.assertEqual(self.client.delete(f"/api/quotation-templates/{template['id']}/").status_code, 204)
        self.assertFalse(QuotationTemplate.objects.get(pk=template["id"]).is_active)
        response = self.client.post(
            f"/api/quotation-templates/{template['id']}/create-subscription/",
            {"customer_id": self.customer.id, "start_date": "2026-11-01"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_customer_cannot_use_templates(self):
        self.client.force_authenticate(self.customer_user)
        self.assertEqual(self.client.get("/api/quotation-templates/").status_code, 403)


class CloseExpiredTests(SubscriptionTestCase):
    def test_closes_only_expired_auto_close_subscriptions(self):
        yesterday = timezone.localdate() - timedelta(days=1)
        auto = make_plan(auto_close=True)
        expired = make_subscription(self.customer, auto, [(self.product, 1)], expiry_date=yesterday)
        paused = make_subscription(self.customer, auto, [(self.product, 1)], status=Status.PAUSED, expiry_date=yesterday)
        current = make_subscription(self.customer, auto, [(self.product, 1)], expiry_date=timezone.localdate())
        manual = make_subscription(self.customer, self.plan, [(self.product, 1)], expiry_date=yesterday)

        call_command("close_expired", stdout=StringIO())

        for subscription, expected in (
            (expired, "closed"), (paused, "closed"), (current, "active"), (manual, "active"),
        ):
            subscription.refresh_from_db()
            self.assertEqual(subscription.status, expected)
        history = expired.history.get()
        self.assertIsNone(history.changed_by)
