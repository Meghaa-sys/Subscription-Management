-- =============================================================================
-- Brightloop Subscription Management System (SubscriptIQ)
-- Database Verification & Diagnostic Queries (PostgreSQL 16 on Neon)
-- Target Tables: accounts_user, accounts_customer, catalog_product,
--                subscriptions_subscription, billing_invoice, billing_payment
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Unique Constraints on billing_invoice and subscriptions_subscription
-- Shows the composite (subscription_id, period_start) unique constraint
-- that mathematically prevents duplicate invoice generation per period.
-- -----------------------------------------------------------------------------
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS constrained_columns
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
    AND tc.table_name IN ('billing_invoice', 'subscriptions_subscription')
GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
ORDER BY tc.table_name, tc.constraint_name;

-- Alternative direct pg_catalog inspection for exact constraint definitions:
SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public'
    AND conrelid::regclass::text IN ('billing_invoice', 'subscriptions_subscription')
    AND contype IN ('u', 'p')
ORDER BY table_name, constraint_name;


-- -----------------------------------------------------------------------------
-- 2. Check Constraints Across All Domain Tables
-- Validates:
--  - Payment amount > 0 (billing_payment: payment_amount_positive)
--  - Quantities >= 1 (catalog_recurringplan, subscriptions_subscriptionline, etc.)
--  - Prices and financial amounts >= 0 (products, variants, invoices, lines)
-- -----------------------------------------------------------------------------
SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE c.contype = 'c'
    AND n.nspname = 'public'
    AND conrelid::regclass::text IN (
        'billing_payment',
        'billing_invoice',
        'billing_invoiceline',
        'catalog_product',
        'catalog_productvariant',
        'catalog_recurringplan',
        'catalog_tax',
        'subscriptions_subscriptionline',
        'subscriptions_quotationtemplateline',
        'discounts_discount',
        'discounts_discountusage'
    )
ORDER BY table_name, constraint_name;


-- -----------------------------------------------------------------------------
-- 3. Row Counts for Core Business Entities
-- Summary of users, customers, products, subscriptions, invoices, and payments.
-- -----------------------------------------------------------------------------
SELECT 'accounts_user' AS entity, COUNT(*) AS total_rows FROM accounts_user
UNION ALL
SELECT 'accounts_customer', COUNT(*) FROM accounts_customer
UNION ALL
SELECT 'catalog_product', COUNT(*) FROM catalog_product
UNION ALL
SELECT 'subscriptions_subscription', COUNT(*) FROM subscriptions_subscription
UNION ALL
SELECT 'billing_invoice', COUNT(*) FROM billing_invoice
UNION ALL
SELECT 'billing_payment', COUNT(*) FROM billing_payment
ORDER BY entity;


-- -----------------------------------------------------------------------------
-- 4. Subscription Counts Grouped by Status
-- Breakdown of subscriptions across the lifecycle state machine.
-- -----------------------------------------------------------------------------
SELECT
    status,
    COUNT(*) AS total_subscriptions,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage_share
FROM subscriptions_subscription
GROUP BY status
ORDER BY total_subscriptions DESC;


-- -----------------------------------------------------------------------------
-- 5. EXPLAIN ANALYZE Query Plans
-- Demonstrates query optimization and index utilization for core operational flows.
-- -----------------------------------------------------------------------------

-- 5a. Overdue Invoices: status = 'confirmed' AND due_date < CURRENT_DATE
-- Leverages B-tree index on due_date (db_index=True) with status filtering.
EXPLAIN ANALYZE
SELECT
    id,
    number,
    customer_id,
    subscription_id,
    invoice_date,
    due_date,
    total,
    amount_paid,
    (total - amount_paid) AS balance_due,
    (CURRENT_DATE - due_date) AS days_overdue
FROM billing_invoice
WHERE status = 'confirmed'
    AND due_date < CURRENT_DATE
ORDER BY due_date ASC
LIMIT 20;

-- 5b. Active Subscriptions Queue: status = 'active'
-- Leverages B-tree indexes on status (db_index=True) and next_billing_date (db_index=True).
EXPLAIN ANALYZE
SELECT
    id,
    number,
    customer_id,
    plan_id,
    start_date,
    expiry_date,
    next_billing_date,
    status
FROM subscriptions_subscription
WHERE status = 'active'
ORDER BY next_billing_date ASC NULLS LAST
LIMIT 20;


-- -----------------------------------------------------------------------------
-- 6. Overdue Ageing Buckets (Computed Dynamically, Never Stored)
-- Computes operational aging buckets: 0-30 days, 31-60 days, 60+ days overdue
-- based on CURRENT_DATE - due_date.
-- -----------------------------------------------------------------------------
SELECT
    CASE
        WHEN CURRENT_DATE - due_date BETWEEN 0 AND 30 THEN '0-30 days'
        WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN '31-60 days'
        WHEN CURRENT_DATE - due_date > 60 THEN '60+ days'
        ELSE 'Current / Not Overdue'
    END AS ageing_bucket,
    COUNT(*) AS invoice_count,
    SUM(total - amount_paid) AS total_outstanding_balance,
    MIN(due_date) AS oldest_overdue_date,
    MAX(due_date) AS newest_overdue_date
FROM billing_invoice
WHERE status = 'confirmed'
    AND due_date <= CURRENT_DATE
GROUP BY
    CASE
        WHEN CURRENT_DATE - due_date BETWEEN 0 AND 30 THEN '0-30 days'
        WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN '31-60 days'
        WHEN CURRENT_DATE - due_date > 60 THEN '60+ days'
        ELSE 'Current / Not Overdue'
    END
ORDER BY MIN(due_date) ASC;
