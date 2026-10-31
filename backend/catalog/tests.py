from datetime import date

from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Customer, User

from .models import Product, ProductVariant, RecurringPlan, Tax

PASSWORD = "Valid@1234"


class CatalogueTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_superuser(email="admin@example.com", password=PASSWORD, name="A")
        cls.staff = User.objects.create_user(
            email="staff@example.com", password=PASSWORD, name="S", role=User.Role.STAFF
        )
        cls.customer = User.objects.create_user(email="cust@example.com", password=PASSWORD, name="C")
        cls.tax = Tax.objects.create(name="GST", rate="18.00")

    def setUp(self):
        self.client = APIClient()

    def product_body(self, **overrides):
        return {
            "name": "CRM",
            "product_type": "service",
            "sales_price": "1000.00",
            "cost_price": "400.00",
            "taxes": [self.tax.id],
            "variants": [
                {"attribute": "Brand", "value": "Odoo", "extra_price": "560.00"},
                {"attribute": "Brand", "value": "Generic", "extra_price": "0.00"},
            ],
            **overrides,
        }


class ProductApiTests(CatalogueTestCase):
    def test_staff_cannot_create_products(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post("/api/products/", self.product_body(), format="json").status_code, 403)

    def test_customer_cannot_create_products(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.post("/api/products/", self.product_body(), format="json").status_code, 403)

    def test_admin_creates_product_with_variants_and_taxes(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/products/", self.product_body(), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["variants"]), 2)
        self.assertEqual(response.data["variants"][0]["label"], "Brand: Odoo")
        self.assertEqual(response.data["tax_details"][0]["name"], "GST")
        self.assertEqual(response.data["product_type_display"], "Service")

    def test_update_variants_edits_adds_and_retires(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post("/api/products/", self.product_body(), format="json").data
        odoo, generic = created["variants"]
        body = {
            "variants": [
                {"id": odoo["id"], "attribute": "Brand", "value": "Odoo", "extra_price": "600.00"},
                {"attribute": "Brand", "value": "SAP", "extra_price": "900.00"},
            ]
        }
        response = self.client.patch(f"/api/products/{created['id']}/", body, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ProductVariant.objects.get(pk=odoo["id"]).extra_price, 600)
        self.assertFalse(ProductVariant.objects.get(pk=generic["id"]).is_active)
        self.assertEqual(ProductVariant.objects.filter(is_active=True).count(), 2)

    def test_foreign_variant_id_rejected(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post("/api/products/", self.product_body(), format="json").data
        other = Product.objects.create(name="Other", sales_price=1)
        foreign = other.variants.create(attribute="A", value="B")
        body = {"variants": [{"id": foreign.id, "attribute": "A", "value": "B", "extra_price": "1.00"}]}
        response = self.client.patch(f"/api/products/{created['id']}/", body, format="json")
        self.assertEqual(response.status_code, 400)

    def test_delete_is_soft(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post("/api/products/", self.product_body(), format="json").data
        self.assertEqual(self.client.delete(f"/api/products/{created['id']}/").status_code, 204)
        self.assertFalse(Product.objects.get(pk=created["id"]).is_active)
        listed = self.client.get("/api/products/?is_active=true").data
        self.assertEqual(listed["count"], 0)

    def test_delete_single_variant_is_soft(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post("/api/products/", self.product_body(), format="json").data
        variant_id = created["variants"][0]["id"]
        response = self.client.delete(f"/api/products/{created['id']}/variants/{variant_id}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(ProductVariant.objects.get(pk=variant_id).is_active)

    def test_negative_price_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/products/", self.product_body(sales_price="-1.00"), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("sales_price", response.data)

    def test_customer_sees_active_only_and_no_internal_fields(self):
        product = Product.objects.create(name="Live", sales_price=10, cost_price=5, notes="secret")
        product.variants.create(attribute="Brand", value="Live")
        product.variants.create(attribute="Brand", value="Retired", is_active=False)
        Product.objects.create(name="Hidden", sales_price=10, is_active=False)
        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/products/")
        self.assertEqual(response.data["count"], 1)
        row = response.data["results"][0]
        self.assertNotIn("cost_price", row)
        self.assertNotIn("notes", row)
        self.assertEqual(len(row["variants"]), 1)

    def test_list_has_no_n_plus_one(self):
        for index in range(10):
            product = Product.objects.create(name=f"P{index}", sales_price=1)
            product.taxes.add(self.tax)
            product.variants.create(attribute="A", value="B")
        self.client.force_authenticate(self.admin)
        with self.assertNumQueries(4):  # count, page, taxes, variants
            self.client.get("/api/products/")


class PlanTaxApiTests(CatalogueTestCase):
    def plan_body(self, **overrides):
        return {
            "name": "Monthly",
            "price": "100.00",
            "billing_period": "monthly",
            "min_quantity": 1,
            "start_date": "2026-01-01",
            **overrides,
        }

    def test_plan_end_must_be_after_start(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/plans/", self.plan_body(end_date="2026-01-01"), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("end_date", response.data)

    def test_plan_patch_validates_against_saved_start_date(self):
        self.client.force_authenticate(self.admin)
        plan = self.client.post("/api/plans/", self.plan_body(), format="json").data
        response = self.client.patch(f"/api/plans/{plan['id']}/", {"end_date": "2025-01-01"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_min_quantity_at_least_one(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/plans/", self.plan_body(min_quantity=0), format="json")
        self.assertEqual(response.status_code, 400)

    def test_customer_reads_plans_but_not_taxes(self):
        RecurringPlan.objects.create(name="Live", price=1, start_date=date(2026, 1, 1))
        RecurringPlan.objects.create(name="Off", price=1, start_date=date(2026, 1, 1), is_active=False)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get("/api/plans/").data["count"], 1)
        self.assertEqual(self.client.get("/api/taxes/").status_code, 403)

    def test_percent_tax_over_100_rejected(self):
        self.client.force_authenticate(self.admin)
        body = {"name": "Bad", "tax_type": "percent", "rate": "101.00"}
        self.assertEqual(self.client.post("/api/taxes/", body, format="json").status_code, 400)

    def test_database_blocks_negative_price(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Product.objects.create(name="X", sales_price=-1)


class CustomerApiTests(CatalogueTestCase):
    def test_staff_manage_customers_without_login(self):
        self.client.force_authenticate(self.staff)
        body = {"name": "Shop", "email": "shop@example.com"}
        response = self.client.post("/api/customers/", body, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.data["has_login"])
        self.assertEqual(self.client.delete(f"/api/customers/{response.data['id']}/").status_code, 204)

    def test_customers_cannot_use_customer_api(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get("/api/customers/").status_code, 403)

    def test_customer_with_login_cannot_be_deleted(self):
        record = Customer.objects.create(user=self.customer, name="C", email="c@example.com")
        self.client.force_authenticate(self.staff)
        response = self.client.delete(f"/api/customers/{record.id}/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_search(self):
        Customer.objects.create(name="Acme", email="a@example.com")
        Customer.objects.create(name="Zen", email="z@example.com")
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get("/api/customers/?search=acme").data["count"], 1)
