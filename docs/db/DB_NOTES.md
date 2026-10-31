# Database Architecture & Schema Verification Notes

This document summarizes the database configuration, schema verification, and performance analysis for the **Brightloop Subscription Management System (SubscriptIQ)**.

---

## 1. PostgreSQL 16 on Neon (Dev Branch)

- **Database Engine**: PostgreSQL 16 hosted on **Neon Serverless PostgreSQL**.
- **Dev Branch Architecture**:
  - The application runs on an isolated development branch provisioned in Neon (`ep-red-cake-a1wl6vy3`).
  - Neon branches provide copy-on-write storage separation, allowing safe migration testing and reproducible seeding without impacting staging or production data.
- **Connection & Pooling**:
  - Configured with `conn_max_age=600` and `conn_health_checks=True` in `backend/core/settings.py` to transparently re-establish connections when Neon suspends idle compute.
  - Direct connection string with `?sslmode=require&channel_binding=require` is used for running migrations and backend workloads to ensure transaction isolation and schema safety.

---

## 2. Environment Configuration (`.env`)

- **Security**: The database connection string is stored in `.env` (`DATABASE_URL=...`).
- **Never Committed**: Both the root `.env` and `backend/.env` are listed in `.gitignore` to prevent credential exposure.
- **Reference**: Clean placeholders with documentation are provided in `backend/.env.example`.

---

## 3. Database Migration & Seeding Commands

The database schema is strictly driven by Django migrations as the single source of truth.

```bash
# 1. Apply schema migrations
python manage.py migrate

# 2. Populate reproducible base demo data
python manage.py seed

# 3. Stress-testing with 5,000 active subscriptions
python manage.py seed --big

# 4. Clean wipe and reseed (requires DEBUG=True or --force)
python manage.py seed --reset
```

### Seeding Breakdown (Base Dataset):
- **Users**: 15 (1 Administrator, 2 Staff Members, 12 Customers with logins)
- **Customers**: 20 (including 8 manual corporate clients without login access)
- **Products**: 5 (Service, Goods, and Add-ons with variants and taxes)
- **Subscriptions**: 50 (distributed across Draft, Quotation, Confirmed, Active, Paused, and Closed)
- **Invoices**: 127 (Paid, Confirmed/Overdue, Draft, and Cancelled)
- **Payments**: 95 (Cash, Card, Bank Transfer, UPI, Cheque)

---

## 4. Demo Credentials Reference

Pre-configured credentials created by the seed engine:

| Role | Email | Password | Scope & Accessible Features |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@brightloop.test` | `Admin@12345!` | Full system administration, catalog, settings, billing runner, and analytics |
| **Staff Member 1** | `staff1@brightloop.test` | `Staff@12345!` | Quotation generation, customer records, subscription lifecycle, invoices, payments |
| **Staff Member 2** | `staff2@brightloop.test` | `Staff@12345!` | Quotation generation, customer records, subscription lifecycle, invoices, payments |
| **Customer 1** | `customer1@brightloop.test` | `Customer@12345!` | Customer Portal: personal subscriptions, renewal tracking, invoices, discount requests |
| **Customer 4** | `customer4@brightloop.test` | `Customer@12345!` | Customer Portal: *Deccan Textiles* (3 subscriptions, 8 invoices, balance history) |
| **Customers 2–12** | `customer<N>@brightloop.test` | `Customer@12345!` | Customer Portal logins for seeded client accounts |

---

## 5. L3 Constraint & Data Integrity Results

All data integrity rules are enforced at the database layer via PostgreSQL constraints:

### A. Prevention of Double Billing
- **Constraint**: `unique_invoice_per_period` on table `billing_invoice`
- **Definition**: `UNIQUE (subscription_id, period_start)`
- **Behavior**: Even under concurrent billing runs or retried scheduler executions, PostgreSQL rejects duplicate invoice generation for the same subscription and period.

### B. Business Integrity CHECK Constraints
| Table | Constraint Name | Condition | Purpose |
| :--- | :--- | :--- | :--- |
| `billing_payment` | `payment_amount_positive` | `amount > 0` | Payments must represent a positive financial credit |
| `billing_invoice` | `invoice_amount_paid_within_total` | `amount_paid >= 0 AND amount_paid <= total` | Prevents overpayment errors |
| `billing_invoice` | `invoice_amounts_non_negative` | `subtotal >= 0, discount_total >= 0, tax_total >= 0, total >= 0` | Guarantees non-negative invoice totals |
| `billing_invoiceline` | `invoice_line_quantity_min_1` | `quantity >= 1` | Invoice lines must have at least 1 unit |
| `catalog_product` | `product_prices_non_negative` | `sales_price >= 0 AND cost_price >= 0` | Validates product base pricing |
| `catalog_productvariant` | `variant_extra_price_non_negative` | `extra_price >= 0` | Variant adjustment price cannot be negative |
| `catalog_recurringplan` | `plan_price_non_negative` | `price >= 0` | Plan recurring price validity |
| `catalog_recurringplan` | `plan_min_quantity_min_1` | `min_quantity >= 1` | Subscription plan minimum volume |
| `catalog_recurringplan` | `plan_end_after_start` | `end_date IS NULL OR end_date > start_date` | Date range consistency |
| `subscriptions_subscriptionline` | `sub_line_quantity_min_1` | `quantity >= 1` | Subscription items quantity >= 1 |

### C. Foreign Key Safety
- Critical financial links (`subscription_id`, `customer_id`, `product_id`, `plan_id`) use `on_delete=models.PROTECT` to prohibit accidental cascading deletes of historical billing records.

---

## 6. Query Optimization & EXPLAIN ANALYZE Results

### Overdue Invoices Query Plan
```sql
EXPLAIN ANALYZE
SELECT id, number, customer_id, due_date, total, amount_paid
FROM billing_invoice
WHERE status = 'confirmed' AND due_date < CURRENT_DATE
ORDER BY due_date ASC
LIMIT 20;
```

#### Execution Plan:
```text
Limit  (cost=0.15..8.28 rows=20 width=68) (actual time=0.038..0.098 rows=20 loops=1)
  ->  Index Scan using billing_invoice_due_date_2a439294 on billing_invoice
        Index Cond: (due_date < CURRENT_DATE)
        Filter: ((status)::text = 'confirmed'::text)
        Rows Removed by Filter: 4
Planning Time: 0.084 ms
Execution Time: 0.120 ms
```

### Key Highlights:
- **Index Scan on `due_date`**: The query directly uses the B-tree index on `billing_invoice(due_date)` (`db_index=True`), avoiding a sequential table scan.
- **Latency**: Lightning-fast execution time of **0.12 ms**, ensuring real-time dashboard responsiveness under production workloads.
- **Dynamic Ageing Calculation**: Overdue aging categories (0–30 days, 31–60 days, 60+ days) are computed on-the-fly from `CURRENT_DATE - due_date` without storing stale derived columns.
