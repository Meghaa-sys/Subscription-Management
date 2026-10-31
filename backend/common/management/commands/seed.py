"""Reproducible demo data. Base data goes through the real services, so it obeys every rule."""
import random
from datetime import date, timedelta
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import Customer, PasswordResetToken, User
from billing.models import Invoice, InvoiceLine, Payment
from billing.services import confirm_invoice, record_payment, run_billing
from catalog.models import PaymentTerm, Product, ProductVariant, RecurringPlan, Tax
from common.money import ZERO, money
from discounts.models import Discount, DiscountRequest, DiscountUsage, SubscriptionDiscount
from discounts.services import (
    approve_request,
    attach_discount,
    create_discount_request,
    forward_request,
    reject_request,
)
from subscriptions.models import (
    QuotationTemplate,
    QuotationTemplateLine,
    Subscription,
    SubscriptionLine,
    SubscriptionStatusHistory,
)
from subscriptions.services import (
    compute_line,
    create_subscription,
    create_subscription_from_template,
    save_template,
    transition_subscription,
)

RANDOM_SEED = 20261031
ADMIN_EMAIL = "admin@brightloop.test"
ADMIN_PASSWORD = "Admin@12345!"
STAFF_PASSWORD = "Staff@12345!"
CUSTOMER_PASSWORD = "Customer@12345!"
CUSTOMERS_WITH_LOGIN = 12
BIG_COUNT = 5000
BIG_CUSTOMERS = 250
BATCH_SIZE = 1000
BIG_NOTE = "Bulk performance data"

INDIAN_COMPANIES = [
    {
        "name": "Tata Consultancy Services Ltd",
        "company": "Tata Consultancy Services",
        "phone": "+91 98200 11234",
        "address": "TCS House, Raveline Street, Fort, Mumbai, Maharashtra 400001",
        "gstin": "27AAACT2727Q1ZW",
    },
    {
        "name": "Reliance Industries Limited",
        "company": "Reliance Industries",
        "phone": "+91 98201 22345",
        "address": "Maker Chambers IV, 222 Nariman Point, Mumbai, Maharashtra 400021",
        "gstin": "27AAACR4567A1ZP",
    },
    {
        "name": "Infosys Technologies Ltd",
        "company": "Infosys",
        "phone": "+91 98450 33456",
        "address": "Plot 44, Electronics City, Hosur Road, Bengaluru, Karnataka 560100",
        "gstin": "29AAACI1234D1ZH",
    },
    {
        "name": "HDFC Bank Enterprise Banking",
        "company": "HDFC Bank",
        "phone": "+91 98202 44567",
        "address": "HDFC Bank House, Senapati Bapat Marg, Lower Parel, Mumbai 400013",
        "gstin": "27AAACH2884A1ZS",
    },
    {
        "name": "Wipro Technologies",
        "company": "Wipro Limited",
        "phone": "+91 98451 55678",
        "address": "Doddakannelli, Sarjapur Road, Bengaluru, Karnataka 560035",
        "gstin": "29AAACW1234E1ZR",
    },
    {
        "name": "Bharti Airtel Business",
        "company": "Bharti Airtel",
        "phone": "+91 98100 66789",
        "address": "Airtel Centre, Worldmark 2, Aerocity, New Delhi, Delhi 110037",
        "gstin": "07AAACB1234C1ZU",
    },
    {
        "name": "ICICI Bank Corporate Suite",
        "company": "ICICI Bank",
        "phone": "+91 98203 77890",
        "address": "ICICI Bank Towers, Bandra-Kurla Complex, Mumbai, Maharashtra 400051",
        "gstin": "27AAACI0001B1Z9",
    },
    {
        "name": "Zomato Enterprise Solutions",
        "company": "Zomato",
        "phone": "+91 98101 88901",
        "address": "Ground Floor, Tower B, Pioneer Square, Sector 62, Gurugram, Haryana 122098",
        "gstin": "06AAACZ1234K1ZX",
    },
    {
        "name": "Swiggy Cloud Solutions",
        "company": "Swiggy (Bundl Tech)",
        "phone": "+91 98452 99012",
        "address": "IBC Knowledge Park, Bannerghatta Main Road, Bengaluru, Karnataka 560029",
        "gstin": "29AAACB4567J1ZM",
    },
    {
        "name": "Mahindra & Mahindra Ltd",
        "company": "Mahindra Group",
        "phone": "+91 98204 00123",
        "address": "Gateway Building, Apollo Bunder, Colaba, Mumbai, Maharashtra 400001",
        "gstin": "27AAACM1234L1ZQ",
    },
    {
        "name": "Larsen & Toubro Infotech",
        "company": "Larsen & Toubro",
        "phone": "+91 98205 11234",
        "address": "L&T House, Ballard Estate, Mumbai, Maharashtra 400001",
        "gstin": "27AAACL1234M1ZP",
    },
    {
        "name": "Titan Company Limited",
        "company": "Titan Company (Tata)",
        "phone": "+91 98453 22345",
        "address": "Integrity, 132/133, Divyasree Technopolis, Yamalur, Bengaluru 560037",
        "gstin": "29AAACT1234N1ZO",
    },
    {
        "name": "State Bank of India Corporate",
        "company": "State Bank of India",
        "phone": "+91 98206 33456",
        "address": "State Bank Bhavan, Madame Cama Road, Nariman Point, Mumbai 400021",
        "gstin": "27AAACS1234P1ZN",
    },
    {
        "name": "Adani Enterprises Limited",
        "company": "Adani Group",
        "phone": "+91 98790 44567",
        "address": "Adani Corporate House, Shantigram, SG Highway, Ahmedabad 382421",
        "gstin": "24AAACA1234Q1ZM",
    },
    {
        "name": "ITC Limited Enterprise",
        "company": "ITC Limited",
        "phone": "+91 98300 55678",
        "address": "Virginia House, 37 J.L. Nehru Road, Kolkata, West Bengal 700071",
        "gstin": "19AAACI1234R1ZL",
    },
    {
        "name": "Asian Paints Limited",
        "company": "Asian Paints",
        "phone": "+91 98207 66789",
        "address": "6A Shantinagar, Santacruz East, Mumbai, Maharashtra 400055",
        "gstin": "27AAACA1234S1ZK",
    },
    {
        "name": "Bajaj Auto Corporation",
        "company": "Bajaj Auto",
        "phone": "+91 98220 77890",
        "address": "Mumbai-Pune Road, Akurdi, Pune, Maharashtra 411035",
        "gstin": "27AAACB1234T1ZJ",
    },
    {
        "name": "Sun Pharmaceutical Industries",
        "company": "Sun Pharma",
        "phone": "+91 98208 88901",
        "address": "Sun House, CTS No. 201 B/1, Western Express Highway, Goregaon East, Mumbai 400063",
        "gstin": "27AAACS1234U1ZI",
    },
    {
        "name": "Bharat Petroleum Corp Ltd",
        "company": "Bharat Petroleum",
        "phone": "+91 98209 99012",
        "address": "Bharat Bhavan, 4 and 6 Currimbhoy Road, Ballard Estate, Mumbai 400001",
        "gstin": "27AAACB1234V1ZH",
    },
    {
        "name": "HCL Technologies",
        "company": "HCL Tech",
        "phone": "+91 98110 00123",
        "address": "Technology Hub, Plot No 3A, Sector 126, Noida, Uttar Pradesh 201304",
        "gstin": "09AAACH1234W1ZG",
    },
]

COMPANIES = [c["company"] for c in INDIAN_COMPANIES]

PaymentMethod = Payment.Method
Status = Subscription.Status


class Command(BaseCommand):
    help = "Load demo data. --big adds 5,000 active subscriptions. --reset wipes all data first."

    def add_arguments(self, parser):
        parser.add_argument("--big", action="store_true", help="Add 5,000 active subscriptions.")
        parser.add_argument("--reset", action="store_true", help="Delete ALL business data first.")
        parser.add_argument("--force", action="store_true", help="Allow --reset when DEBUG is off.")

    def handle(self, *args, big, reset, force, **options):
        if reset and not (settings.DEBUG or force):
            raise CommandError("--reset deletes all data. It needs DEBUG=True or --force.")

        self.rng = random.Random(RANDOM_SEED)
        self.today = timezone.localdate()

        if reset:
            self._wipe()
        if User.objects.filter(email=ADMIN_EMAIL).exists():
            self.stdout.write("Base data already present, skipping it.")
        else:
            with transaction.atomic():
                self._seed_base()
        if big:
            self._seed_big()

        self.stdout.write(
            self.style.SUCCESS(
                f"Done: {User.objects.count()} users, {Customer.objects.count()} customers, "
                f"{Subscription.objects.count()} subscriptions, {Invoice.objects.count()} invoices, "
                f"{Payment.objects.count()} payments."
            )
        )

    def _wipe(self):
        """Delete everything cleanly via SQL TRUNCATE CASCADE on Postgres or model delete on SQLite."""
        from django.db import connection
        models = (
            DiscountUsage, DiscountRequest, SubscriptionDiscount, Payment, InvoiceLine, Invoice,
            SubscriptionStatusHistory, SubscriptionLine, Subscription, QuotationTemplateLine,
            QuotationTemplate, Discount, RecurringPlan, ProductVariant, Product, Tax, PaymentTerm,
            PasswordResetToken, Customer, User,
        )
        if connection.vendor == "sqlite":
            for model in models:
                model.objects.all().delete()
        else:
            tables = [model._meta.db_table for model in models]
            with connection.cursor() as cursor:
                cursor.execute(f"TRUNCATE TABLE {', '.join(tables)} CASCADE;")
        self.stdout.write("Existing data deleted cleanly.")

    def _seed_base(self):
        print("1/6 Creating users...", flush=True)
        self._create_users()
        print("2/6 Creating catalogue...", flush=True)
        self._create_catalogue()
        print("3/6 Creating templates & discounts...", flush=True)
        self._create_templates_and_discounts()
        print("4/6 Creating subscriptions...", flush=True)
        subscriptions = self._create_subscriptions()
        print("5/6 Running billing engine...", flush=True)
        self._bill_history()
        print("6/6 Settling invoices & completing lifecycles...", flush=True)
        self._settle_invoices()
        self._finish_lifecycles(subscriptions)
        self._create_discount_requests(subscriptions["active"])
        print("Seeding complete!", flush=True)

    def _create_users(self):
        self.admin = User.objects.create_superuser(
            email=ADMIN_EMAIL, password=ADMIN_PASSWORD, name="Brightloop Admin"
        )
        self.staff = [
            User.objects.create_user(
                email=f"staff{number}@brightloop.test",
                password=STAFF_PASSWORD,
                name=f"Staff Member {number}",
                role=User.Role.STAFF,
            )
            for number in (1, 2)
        ]
        self.customers = []
        for number, item in enumerate(INDIAN_COMPANIES, start=1):
            email = f"customer{number}@brightloop.test"
            user = None
            if number <= CUSTOMERS_WITH_LOGIN:
                user = User.objects.create_user(email=email, password=CUSTOMER_PASSWORD, name=item["name"])
            self.customers.append(
                Customer.objects.create(
                    user=user,
                    name=item["name"],
                    company=item["company"],
                    email=email,
                    phone=item["phone"],
                    billing_address=item["address"],
                    tax_id=item["gstin"],
                )
            )

    def _create_catalogue(self):
        self.gst = Tax.objects.create(name="GST 18%", tax_type=Tax.TaxType.PERCENT, rate=Decimal("18.00"))
        self.service_fee = Tax.objects.create(
            name="Service fee", tax_type=Tax.TaxType.FIXED, rate=Decimal("50.00")
        )
        self.immediate = PaymentTerm.objects.create(name="Immediate", due_days=0)
        self.net_15 = PaymentTerm.objects.create(name="Net 15", due_days=15)
        self.net_30 = PaymentTerm.objects.create(name="Net 30", due_days=30)

        product_rows = [
            ("Business CRM", Product.ProductType.SERVICE, "1200.00", "450.00", [self.gst, self.service_fee]),
            ("Accounting Suite", Product.ProductType.SERVICE, "2500.00", "900.00", [self.gst]),
            ("HR Portal", Product.ProductType.SERVICE, "1800.00", "700.00", [self.gst]),
            ("Barcode Scanner Kit", Product.ProductType.GOODS, "800.00", "500.00", [self.gst]),
            ("Priority Support", Product.ProductType.ADDON, "300.00", "100.00", [self.gst]),
        ]
        self.products = {}
        for name, product_type, price, cost, taxes in product_rows:
            product = Product.objects.create(
                name=name,
                product_type=product_type,
                sales_price=Decimal(price),
                cost_price=Decimal(cost),
                notes=f"{name} on a recurring subscription.",
            )
            product.taxes.set(taxes)
            self.products[name] = product

        crm = self.products["Business CRM"]
        self.odoo = crm.variants.create(attribute="Brand", value="Odoo", extra_price=Decimal("560.00"))
        self.generic = crm.variants.create(attribute="Brand", value="Generic", extra_price=ZERO)
        self.core_products = [self.products[name] for name in ("Accounting Suite", "HR Portal", "Barcode Scanner Kit")]
        self.addon = self.products["Priority Support"]

        launch = date(2024, 1, 1)
        self.monthly = RecurringPlan.objects.create(
            name="Monthly", price=Decimal("999.00"), billing_period="monthly", start_date=launch,
            closable=True, pausable=True, renewable=True,
        )
        self.yearly = RecurringPlan.objects.create(
            name="Yearly", price=Decimal("9999.00"), billing_period="yearly", start_date=launch,
            auto_close=True, closable=False, pausable=False, renewable=True,
        )
        self.weekly = RecurringPlan.objects.create(
            name="Weekly", price=Decimal("299.00"), billing_period="weekly", start_date=launch,
            closable=True, pausable=True, renewable=False,
        )

    def _create_templates_and_discounts(self):
        self.starter = save_template(
            QuotationTemplate(),
            {
                "name": "Starter Monthly",
                "plan": self.monthly,
                "validity_days": 15,
                "notes": "CRM with priority support.",
                "lines": [
                    {"product": self.products["Business CRM"], "variant": self.odoo, "quantity": 1},
                    {"product": self.addon, "variant": None, "quantity": 1},
                ],
            },
        )
        save_template(
            QuotationTemplate(),
            {
                "name": "Enterprise Yearly",
                "plan": self.yearly,
                "validity_days": 30,
                "notes": "Accounting for larger teams.",
                "lines": [{"product": self.products["Accounting Suite"], "variant": None, "quantity": 25}],
            },
        )
        window = {
            "start_date": self.today - timedelta(days=365),
            "end_date": self.today + timedelta(days=365),
            "created_by": self.admin,
        }
        self.bulk_discount = Discount.objects.create(
            name="Bulk 10%", discount_type=Discount.DiscountType.PERCENT, value=Decimal("10.00"),
            min_quantity=20, **window,
        )
        self.welcome_discount = Discount.objects.create(
            name="Welcome 500", discount_type=Discount.DiscountType.FIXED, value=Decimal("500.00"),
            usage_limit=3, **window,
        )

    def _start_date(self, plan):
        days = {self.monthly: (30, 180), self.weekly: (7, 42), self.yearly: (30, 300)}[plan]
        return self.today - timedelta(days=self.rng.randint(*days))

    def _new_subscription(self, plan, index, status, quantity=None):
        """Create a subscription through the service and walk it up to `status`."""
        start_date = self._start_date(plan)
        product = self.rng.choice(self.core_products + [self.products["Business CRM"]])
        variant = None
        if product.name == "Business CRM":
            variant = self.rng.choice([self.odoo, self.generic])
        lines = [{"product": product, "variant": variant, "quantity": quantity or self.rng.randint(1, 5)}]
        if self.rng.random() < 0.3:
            lines.append({"product": self.addon, "variant": None, "quantity": 1})

        data = {
            "customer": self.customers[index % len(self.customers)],
            "plan": plan,
            "salesperson": self.rng.choice(self.staff),
            "start_date": start_date,
            "payment_term": self.rng.choice([self.immediate, self.net_15, self.net_30]),
            "notes": "Seeded demo subscription.",
            "lines": lines,
        }
        if plan == self.yearly:
            data["expiry_date"] = start_date + relativedelta(years=1)
        if status != Status.DRAFT:
            data["quote_valid_until"] = self.today + timedelta(days=15)

        actor = data["salesperson"]
        subscription = create_subscription(data, actor)
        for next_status in (Status.QUOTATION, Status.CONFIRMED, Status.ACTIVE):
            if status == Status.DRAFT:
                break
            transition_subscription(subscription.pk, next_status, actor=actor)
            if next_status == status:
                break
        return subscription

    def _create_subscriptions(self):
        """50 subscriptions. Those ending paused or closed start active so they get invoices."""
        made = {"draft": [], "quotation": [], "confirmed": [], "active": [], "to_pause": [], "to_close": []}
        plan_mix = [self.monthly] * 2 + [self.weekly]
        index = 0

        def add(group, status, plan, quantity=None):
            nonlocal index
            made[group].append(self._new_subscription(plan, index, status, quantity))
            index += 1

        for _ in range(6):
            add("draft", Status.DRAFT, self.monthly)
        for _ in range(5):
            add("quotation", Status.QUOTATION, self.monthly)
        made["quotation"].append(
            create_subscription_from_template(
                self.starter.pk, self.customers[index % len(self.customers)], self.today, self.staff[0],
                payment_term=self.net_15,
            )
        )
        index += 1
        for _ in range(4):
            add("confirmed", Status.CONFIRMED, self.monthly)
        for position in range(24):
            plan = [self.monthly, self.monthly, self.yearly, self.weekly][position % 4]
            add("active", Status.ACTIVE, plan, quantity=25 if position in (0, 1) else None)
        for position in range(5):
            add("to_pause", Status.ACTIVE, plan_mix[position % 3])
        for _ in range(5):
            add("to_close", Status.ACTIVE, self.monthly)

        for subscription in made["active"][:2]:
            attach_discount(subscription.pk, self.bulk_discount, self.admin)
        for subscription in made["active"][2:7]:
            attach_discount(subscription.pk, self.welcome_discount, self.admin)
        return made

    def _bill_history(self):
        """Run billing as it would have run each week, so invoice dates look real."""
        started = Subscription.objects.filter(status=Status.ACTIVE).order_by("start_date").first()
        day = started.start_date
        while day < self.today:
            run_billing(day)
            day += timedelta(days=7)
        run_billing(self.today)

    def _settle_invoices(self):
        """Mix of paid, part paid and overdue. The newest invoices stay as drafts."""
        for invoice in Invoice.objects.order_by("id"):
            if invoice.invoice_date >= self.today - timedelta(days=5):
                continue
            confirm_invoice(invoice.pk)
            roll = self.rng.random()
            if roll >= 0.75:
                continue
            amount = invoice.total if roll < 0.6 else money(invoice.total * Decimal("0.4"))
            days_later = timedelta(days=self.rng.randint(0, 12))
            record_payment(
                invoice.pk,
                method=self.rng.choice(PaymentMethod.values),
                amount=amount,
                payment_date=min(invoice.invoice_date + days_later, self.today),
                actor=self.rng.choice(self.staff),
                note="Seeded payment",
            )

    def _finish_lifecycles(self, subscriptions):
        for subscription in subscriptions["to_pause"]:
            transition_subscription(subscription.pk, Status.PAUSED, actor=self.staff[0], note="Customer asked to pause")
        for subscription in subscriptions["to_close"]:
            transition_subscription(subscription.pk, Status.CLOSED, actor=self.staff[0], note="Customer left")

    def _create_discount_requests(self, active):
        """Two requests in each status."""
        portal = [
            subscription
            for subscription in active[7:]
            if subscription.customer.user_id is not None
        ][:8]
        requests = [
            create_discount_request(subscription.customer.user, subscription, "Could we get a better rate?")
            for subscription in portal
        ]
        pending, forwarded, approved, rejected = requests[:2], requests[2:4], requests[4:6], requests[6:8]
        for item in forwarded + approved[:1]:
            forward_request(item.pk, self.staff[0])
        approve_request(approved[0].pk, self.admin, discount=self.bulk_discount)
        approve_request(approved[1].pk, self.admin)
        reject_request(rejected[0].pk, self.staff[1])
        reject_request(rejected[1].pk, self.admin)

    # --- Big data -----------------------------------------------------------

    def _seed_big(self):
        if Subscription.objects.filter(notes=BIG_NOTE).exists():
            self.stdout.write("Bulk data already present, skipping it.")
            return
        with transaction.atomic():
            self._insert_big()

    def _insert_big(self):
        """Everything in batched bulk inserts, because Neon is a remote database."""
        rng = self.rng
        staff = User.objects.filter(role=User.Role.STAFF).order_by("id").first()
        plans = list(RecurringPlan.objects.order_by("id"))
        terms = list(PaymentTerm.objects.order_by("id"))
        products = list(Product.objects.prefetch_related("taxes").exclude(product_type=Product.ProductType.ADDON))
        addon = Product.objects.prefetch_related("taxes").get(product_type=Product.ProductType.ADDON)

        customers = Customer.objects.bulk_create(
            [
                Customer(name=f"Bulk Customer {i:04d}", email=f"bulk{i:04d}@brightloop.test")
                for i in range(1, BIG_CUSTOMERS + 1)
            ],
            batch_size=BATCH_SIZE,
        )

        drafts = []
        for _ in range(BIG_COUNT):
            plan = rng.choices(plans, weights=[6 if p.billing_period == "monthly" else 2 for p in plans])[0]
            max_ahead = {"monthly": 28, "weekly": 7, "yearly": 300}[plan.billing_period]
            next_billing = self.today + timedelta(days=rng.randint(1, max_ahead))
            period_start = next_billing - plan.period_delta
            subscription = Subscription(
                customer=rng.choice(customers),
                plan=plan,
                salesperson=staff,
                start_date=period_start - relativedelta(months=rng.randint(0, 10)),
                next_billing_date=next_billing,
                payment_term=rng.choice(terms),
                status=Status.ACTIVE,
                notes=BIG_NOTE,
            )
            picks = [(rng.choice(products), rng.randint(1, 10))]
            if rng.random() < 0.25:
                picks.append((addon, 1))
            drafts.append((subscription, picks, period_start, next_billing))

        subscriptions = Subscription.objects.bulk_create([row[0] for row in drafts], batch_size=BATCH_SIZE)
        for subscription in subscriptions:
            subscription.number = f"SUB-{subscription.pk:05d}"
        Subscription.objects.bulk_update(subscriptions, ["number"], batch_size=BATCH_SIZE)

        sub_lines, history, invoices, pending_lines = [], [], [], []
        for subscription, picks, period_start, next_billing in drafts:
            history.append(
                SubscriptionStatusHistory(subscription=subscription, from_status="", to_status=Status.ACTIVE, note=BIG_NOTE)
            )
            subtotal = tax_total = ZERO
            invoice_rows = []
            for product, quantity in picks:
                unit_price, tax_amount, amount = compute_line(product, None, quantity)
                subtotal += amount
                tax_total += tax_amount
                sub_lines.append(
                    SubscriptionLine(
                        subscription=subscription, product=product, quantity=quantity,
                        unit_price=unit_price, tax_amount=tax_amount, amount=amount,
                    )
                )
                invoice_rows.append((product, quantity, unit_price, tax_amount, amount))

            total = subtotal + tax_total
            roll = rng.random()
            status = Invoice.Status.PAID if roll < 0.7 else Invoice.Status.CONFIRMED if roll < 0.9 else Invoice.Status.DRAFT
            paid = {Invoice.Status.PAID: total, Invoice.Status.DRAFT: ZERO}.get(
                status, money(total * Decimal("0.4")) if roll < 0.8 else ZERO
            )
            invoice = Invoice(
                subscription=subscription,
                customer=subscription.customer,
                period_start=period_start,
                period_end=next_billing - timedelta(days=1),
                invoice_date=period_start,
                due_date=period_start + timedelta(days=15),
                subtotal=subtotal,
                tax_total=tax_total,
                total=total,
                amount_paid=paid,
                status=status,
            )
            invoices.append(invoice)
            pending_lines.append(invoice_rows)

        SubscriptionLine.objects.bulk_create(sub_lines, batch_size=BATCH_SIZE)
        SubscriptionStatusHistory.objects.bulk_create(history, batch_size=BATCH_SIZE)
        invoices = Invoice.objects.bulk_create(invoices, batch_size=BATCH_SIZE)
        for invoice in invoices:
            invoice.number = f"INV/{invoice.invoice_date.year}/{invoice.pk:05d}"
        Invoice.objects.bulk_update(invoices, ["number"], batch_size=BATCH_SIZE)

        invoice_lines, payments = [], []
        for invoice, rows in zip(invoices, pending_lines):
            for product, quantity, unit_price, tax_amount, amount in rows:
                invoice_lines.append(
                    InvoiceLine(
                        invoice=invoice, product=product, description=product.name, quantity=quantity,
                        unit_price=unit_price, tax_amount=tax_amount, line_total=amount + tax_amount,
                    )
                )
            if invoice.amount_paid > ZERO:
                days_later = timedelta(days=rng.randint(0, 10))
                payments.append(
                    Payment(
                        invoice=invoice,
                        method=rng.choice(PaymentMethod.values),
                        amount=invoice.amount_paid,
                        payment_date=min(invoice.invoice_date + days_later, self.today),
                        note=BIG_NOTE,
                        recorded_by=staff,
                    )
                )
        InvoiceLine.objects.bulk_create(invoice_lines, batch_size=BATCH_SIZE)
        Payment.objects.bulk_create(payments, batch_size=BATCH_SIZE)
