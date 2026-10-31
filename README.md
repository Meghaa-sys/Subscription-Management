<<<<<<< HEAD
# PS : Subscription-Management
# SubscriptIQ — Unified Subscription Management System

**Automate subscriptions. Simplify billing. Gain complete revenue visibility.**

## 1. Overview

SubscriptIQ is a unified subscription management platform that automates the complete subscription lifecycle, from product and plan creation to recurring billing, invoice generation, payment tracking, and revenue analytics.

Designed around the needs of Brightloop Software, a subscription-based business, the platform replaces fragmented spreadsheets and manual financial operations with a centralized, reliable, and scalable system.

SubscriptIQ enables administrators to configure products, pricing, taxes, and discounts; staff to manage customers, subscriptions, invoices, and payments; and customers to access their own subscriptions and invoices through a self-service portal.

The platform aims to reduce billing errors, prevent missed renewals, improve payment reconciliation, and provide real-time visibility into recurring revenue.

## 2. Problem Statement

Subscription-based businesses face operational challenges as their customer base grows.

- Subscription records are maintained in spreadsheets, making them difficult to track.
- Renewals are missed because reminders and billing schedules are managed manually.
- Invoices are created repeatedly, increasing the risk of incorrect calculations.
- Payments are difficult to reconcile with outstanding invoices.
- Discounts and taxes may be applied inconsistently.
- Financial reports require significant manual effort.
- Customers depend on internal staff for basic subscription and invoice information.
- Growing data volumes make manual processes increasingly inefficient.

The fundamental problem is the absence of a centralized system connecting subscriptions, billing, payments, and revenue reporting.

## 3. Proposed Solution

SubscriptIQ provides a single platform for managing subscription-based business operations.

The system integrates product management, configurable billing plans, quotation workflows, automated invoice generation, discount and tax calculations, payment reconciliation, customer self-service, and revenue analytics.

Its core objective is to transform recurring billing from a manual, error-prone process into a controlled and traceable workflow.

## 4. Key Features

### 4.1 Authentication and Role-Based Access Control

The platform supports three roles with distinct permissions.

**Administrator**
- Manage products, variants, plans, taxes, and discounts.
- Create staff accounts and manage system configuration.
- Access subscription records, invoices, payments, and analytics.
- Configure subscription lifecycle policies.

**Staff**
- Manage customers and quotations.
- Track subscriptions and their status.
- Create, confirm, send, and print invoices according to permissions.
- Record payments and monitor outstanding balances.

**Customer**
- View personal subscription details.
- Access invoices and payment history.
- Monitor upcoming billing dates and subscription status.
- Perform permitted subscription actions through the customer portal.

Security includes unique email addresses, password validation, email-based password reset, server-side authorization, secure password hashing, and customer-level data access restrictions.

Password requirements include more than eight characters, at least one uppercase letter, one lowercase letter, and one special character.

Only administrators can create new staff accounts.

### 4.2 Product and Variant Management

Administrators can create and manage products with the following attributes:

- Product name and type.
- Sales price and cost price.
- Product notes and descriptions.
- Optional variants such as brand, edition, or package.
- Additional pricing for selected variants.

**Example**

| Product | Base Price | Variant | Additional Price | Final Price |
|---|---:|---|---:|---:|
| Business Suite | ₹2,000 | Standard | ₹0 | ₹2,000 |
| Business Suite | ₹2,000 | Odoo | ₹560 | ₹2,560 |

The system calculates the final unit price from the base price and selected variant adjustments.

### 4.3 Subscription Plan Management

Administrators can configure plans according to business requirements.

Supported capabilities include:

- Daily, weekly, monthly, and yearly billing.
- Plan pricing and minimum quantity.
- Plan availability start and end dates.
- Automatic closure when configured end conditions are reached.
- Configurable pause, early closure, and renewal permissions.
- Product and variant associations.
- Subscription start dates, expiry dates, and next billing dates.

### 4.4 Quotation and Subscription Lifecycle

The platform supports reusable quotation templates containing predefined plans and product lines.

Each quotation can include a customer, product quantities, unit prices, applicable taxes, payment terms, and validity period.

Each subscription receives a unique identifier and maintains its associated customer, plan, dates, and line items.

The subscription lifecycle is:

`Draft → Quotation → Confirmed → Active → Closed`

Lifecycle transitions follow configured business rules and permissions. Authorized users can track the current state of every subscription.

### 4.5 Automated Recurring Billing

The billing engine identifies subscriptions due for billing and generates invoices automatically.

Each invoice includes:

- Customer and billing details.
- Subscription reference and invoice number.
- Product and variant details.
- Quantity and unit price.
- Applicable discounts and taxes.
- Subtotal, final total, due date, and outstanding balance.

The billing workflow is:

`Due Subscription → Invoice Generation → Pricing and Tax Calculation → Invoice Confirmation → Payment Tracking`

Key safeguards include:

- Prevention of duplicate invoices for the same subscription and billing period.
- Idempotent billing operations.
- Database transactions for consistent financial records.
- Retry handling for temporary failures.
- Unique invoice identifiers and billing-period records.

Invoice states include Draft, Confirmed, and Paid, with cancellation and other financial transitions handled according to business rules.

### 4.6 Tax Management

Administrators can configure tax rules and rates for applicable products and transactions.

The tax engine automatically calculates taxes during invoice generation and provides a transparent breakdown of the subtotal, discounts, taxable amount, tax, and final total.

Tax calculations follow the configured pricing model, including whether prices are tax-inclusive or tax-exclusive and how discounts affect taxable amounts.

### 4.7 Discount Management

Administrators can create fixed-amount and percentage-based discounts.

Each discount rule supports:

- Minimum purchase amount or quantity.
- Start and end dates.
- Maximum usage limits.
- Product-specific or subscription-level applicability.

The billing engine checks eligibility before applying a discount. Eligible discounts appear automatically on the relevant invoice.

Expired, exhausted, or ineligible discounts are rejected. Discount usage is tracked to prevent configured limits from being exceeded during concurrent billing operations.

### 4.8 Payment Tracking and Reconciliation

The platform records payments against the appropriate invoices.

Payment records include:

- Payment method.
- Amount received.
- Payment date.
- Customer and invoice references.
- Transaction identifier or note.

Supported payment methods can include bank transfer, UPI, card, and cash, depending on the configured business policy.

The system tracks paid, partially paid, unpaid, and overdue invoices. Outstanding balances are calculated using invoice totals and payment allocations.

Payment recording and live online payment processing are separate capabilities; online collection requires integration with a payment gateway.

### 4.9 Customer Self-Service Portal

Customers can independently access their subscription information through a secure portal.

Available functionality includes:

- Viewing active and historical subscriptions.
- Checking plan details and billing dates.
- Viewing and downloading invoices.
- Reviewing payment history and outstanding balances.
- Tracking subscription status.
- Performing permitted renewal, pause, or cancellation actions.

The portal enforces customer-level access restrictions to prevent access to other customers' records.

### 4.10 Revenue Analytics Dashboard

The dashboard provides finance teams and administrators with a consolidated view of subscription performance.

Key metrics include:

- Active subscriptions.
- New subscriptions and renewals.
- Monthly recurring revenue (MRR).
- Annual recurring revenue (ARR).
- Payments collected during a selected period.
- Outstanding invoice balances.
- Overdue invoice count and value.
- Upcoming renewals and expiring subscriptions.
- Payment and collection trends.

Users can filter results by date range, customer, subscription status, invoice status, billing frequency, and payment method.

**Metric definitions**

- **MRR:** Normalized monthly value of eligible recurring subscriptions.
- **ARR:** Annualized recurring value, commonly calculated as MRR multiplied by 12 for a consistent subscription base.
- **Collected revenue:** Payments recorded as successfully received during the selected period, adjusted for applicable reversals or refunds.
- **Outstanding balance:** The unpaid portion of confirmed invoices.
- **Overdue amount:** The outstanding balance on invoices past their due dates.

Recurring revenue, invoiced amounts, and actual cash collected are reported separately to provide accurate financial visibility.

## 5. Key Innovations

### 5.1 Duplicate-Proof Billing

Repeated billing job executions must not create duplicate invoices for the same billing period.

SubscriptIQ uses unique billing-period constraints, idempotent processing, and transactional invoice creation to ensure that retries do not generate additional invoices.

### 5.2 Proactive Revenue Risk Monitoring

The platform highlights operational issues that require attention, including upcoming renewals, overdue invoices, expiring discounts, failed billing attempts, and subscriptions nearing expiry.

This allows teams to take action before billing problems lead to avoidable revenue loss.

### 5.3 Transparent Invoice Calculations

Each invoice provides a traceable breakdown of base pricing, variant adjustments, quantity, discounts, taxes, and final totals.

Audit logs capture important financial changes, helping authorized users understand how invoice amounts were calculated and modified.

### 5.4 Centralized Revenue Intelligence

The dashboard distinguishes recurring revenue from invoiced amounts, collected payments, and outstanding balances.

This gives business owners a consistent view of subscription performance and collection efficiency.

### 5.5 Scalable Billing Architecture

Scheduled billing workers, database indexes, pagination, server-side filtering, and aggregated analytics queries support efficient processing as subscription volumes increase.

The target is to keep common page and dashboard responses under two seconds under a defined test workload, with performance verified through load testing.

## 6. End-to-End Workflow

A typical customer journey demonstrates how the platform connects every stage of subscription management.

1. A customer registers and creates an account.
2. The customer selects an available subscription plan and product variants.
3. A sales representative generates a quotation using a predefined template.
4. The quotation is confirmed and converted into a subscription.
5. The subscription becomes active according to the configured lifecycle rules.
6. A scheduled billing worker identifies the next billing period.
7. The system generates an invoice and calculates applicable discounts, taxes, and totals.
8. The customer makes a payment, which is recorded against the invoice.
9. The outstanding balance and invoice status are updated.
10. The dashboard displays collections, overdue invoices, upcoming renewals, and recurring revenue.

This workflow replaces disconnected manual tasks with one integrated process.

## 7. System Architecture

The proposed architecture separates the frontend, backend business logic, database, and background billing processes.

```mermaid
flowchart TD
    A[Admin, Staff and Customers] --> B[Web Application]
    B --> C[Authentication and Authorization]
    C --> D[Backend API]

    D --> E[Product and Plan Service]
    D --> F[Subscription Service]
    D --> G[Pricing, Tax and Discount Engine]
    D --> H[Invoice and Payment Service]
    D --> I[Analytics Service]

    E --> J[(Relational Database)]
    F --> J
    G --> J
    H --> J
    I --> J

    K[Scheduled Billing Worker] --> F
    F --> G
    G --> H

    H --> L[Email and Payment Gateway Integrations]
```

### Suggested Technology Stack

| Component | Suggested Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL or Supabase |
| Authentication | Supabase Auth or secure server-managed sessions |
| Scheduled billing | Background worker and scheduler |
| Email notifications | SMTP or an email delivery provider |
| Online payments | Razorpay or Stripe |
| Dashboard analytics | SQL aggregation queries and charting library |
| Deployment | Vercel for frontend; Render or equivalent for backend and workers |

The final technology stack should reflect the tools actually used in the implementation.

## 8. Database Design

The main entities include:

| Entity | Purpose |
|---|---|
| Users and Profiles | Authentication identity, roles, and user information |
| Products | Product details, prices, and descriptions |
| Product Variants | Variant options and price adjustments |
| Plans | Billing intervals, prices, and lifecycle policies |
| Customers | Customer and billing information |
| Quotation Templates | Reusable quotation configurations |
| Subscriptions | Customer, plan, status, and billing dates |
| Subscription Items | Product lines, quantities, and agreed prices |
| Tax Rules | Tax rates and applicability conditions |
| Discount Rules | Discount configuration and eligibility |
| Discount Usages | Discount application and usage tracking |
| Invoices | Invoice totals, status, and due dates |
| Invoice Items | Invoice line items, taxes, and discounts |
| Payments | Payment details and transaction references |
| Payment Allocations | Amounts allocated to individual invoices |
| Audit Logs | History of significant operations |
| Notification Jobs | Scheduled and completed notifications |

### Data Integrity

- Enforce unique account emails and invoice identifiers.
- Use foreign keys to preserve relationships between business records.
- Validate monetary amounts and quantities.
- Prevent duplicate billing periods where required.
- Track partial payments through explicit allocations.
- Update discount usage atomically.
- Preserve financial history instead of silently deleting completed transactions.
- Enforce role permissions and record ownership on the server.

## 9. Security, Reliability and Performance

### Security
- Secure password hashing and password reset flows.
- Server-side role-based access control.
- Customer-specific data authorization.
- Request validation and protected API endpoints.
- Environment variables for credentials and secret keys.
- Audit logging for sensitive operations.

### Reliability
- Idempotent scheduled billing.
- Safe retries after transient failures.
- Transactional invoice generation.
- Duplicate payment detection.
- Consistent currency and rounding rules.
- Controlled cancellation, refund, and reversal workflows.

### Performance
- Indexes on subscription status, next billing date, customer ID, invoice due date, and payment references.
- Server-side pagination, sorting, and filtering.
- Aggregated dashboard queries.
- Background processing for bulk invoice generation.
- Load testing against the target of under two seconds for common operations.

## 10. Testing and Validation

The platform should be validated against realistic subscription business scenarios.

| Scenario | Expected Outcome |
|---|---|
| Duplicate email registration | Registration is rejected |
| Invalid password | Validation error is displayed |
| Customer accesses another customer's invoice | Access is denied |
| Billing job executes twice | No duplicate invoice is generated |
| Discount has expired | Discount is not applied |
| Discount reaches its usage limit | Additional applications are rejected |
| Subscription is not due | No invoice is generated |
| Invoice is partially paid | Outstanding balance is updated correctly |
| Duplicate payment reference is submitted | Duplicate transaction is rejected where supported |
| Invoice passes its due date | Invoice is flagged as overdue |
| Large dataset is loaded | Common operations meet the measured performance target |

## 11. Hackathon Demonstration Plan

The demonstration focuses on measurable business value rather than simply navigating through forms.

**Step 1: Configure a product**

Create a product with a base price and an Odoo variant that adds ₹560.

**Step 2: Create a subscription plan**

Configure monthly billing, minimum quantity, and subscription lifecycle policies.

**Step 3: Generate a quotation**

Select a reusable quotation template and create a customer-specific offer.

**Step 4: Activate the subscription**

Confirm the quotation and demonstrate the subscription status transition.

**Step 5: Run automated billing**

Trigger a billing run and display the generated invoice with product lines, taxes, discounts, and totals.

**Step 6: Prove duplicate protection**

Run the billing operation again and show that no second invoice is generated for the same billing period.

**Step 7: Record a payment**

Record a partial or full payment and demonstrate the updated invoice balance.

**Step 8: Present revenue intelligence**

Show active subscriptions, MRR, collected payments, outstanding balances, overdue invoices, and upcoming renewals.

The demonstration should use consistent sample data so judges can verify the calculations and follow the entire workflow.

## 12. Future Enhancements

Potential extensions include:

- Automated overdue reminders and payment retry workflows.
- Payment gateway webhooks and automated reconciliation.
- Usage-based billing and metered add-ons.
- Subscription upgrade and downgrade proration.
- Multi-currency and multi-entity billing.
- Accounting software integrations.
- Revenue forecasting and churn-risk indicators.
- Customer retention analytics and renewal recommendations.

These enhancements are roadmap items until implemented and tested.

## 13. Expected Impact

SubscriptIQ is designed to help subscription businesses:

- Reduce repetitive manual billing work.
- Minimize duplicate invoices and missed billing periods.
- Improve payment tracking and reconciliation.
- Apply discounts and taxes consistently.
- Give customers greater independence through self-service.
- Identify overdue invoices and upcoming renewals earlier.
- Make financial reporting faster and more transparent.
- Scale subscription operations with reliable data and workflows.

## 14. Project Information

- **Project Name:** SubscriptIQ
- **Category:** SaaS, Business Automation, Subscription Management
- **Target Users:** Subscription-based businesses, operations teams, and finance teams
- **Team Name:** Add your team name
- **GitHub Repository:** Add repository URL
- **Live Demo:** Add deployed application URL
- **Screenshots:** Add dashboard, subscription, invoice, and payment screenshots

---

## Conclusion

SubscriptIQ transforms subscription management from a collection of disconnected manual tasks into a unified, auditable, and scalable revenue operations workflow.

By connecting products, plans, quotations, subscriptions, invoices, payments, and analytics, the platform helps businesses prevent avoidable billing errors, improve operational efficiency, and gain a reliable understanding of their recurring revenue.

**One platform. One source of truth. Every subscription accounted for.**


=======
# SubscriptIQ — Enterprise SaaS Subscription & Billing Platform

SubscriptIQ is a production-quality subscription management and billing automation platform built for **Brightloop Software**, designed following the minimalist aesthetic of Stripe, Linear, and Vercel.

![SubscriptIQ Dashboard](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80)

---

## 🚀 Features

- **Dashboard**:
  - Live revenue telemetry with 4 interactive KPI cards (Active Subscriptions, MRR, Revenue Collected, Overdue Invoices) featuring SVG sparklines and 3D hover elevations.
  - Interactive Revenue Overview bar chart (7 days, 30 days, 3 months, 12 months) with depth transforms, top highlights, and floating figures.
  - Dynamic Subscription Status Donut Chart with live segment emphasis and central tally feedback.
  - Recent Invoices and Upcoming Renewals operational feeds.
- **Spotlight Search (`⌘K` / `Ctrl+K`)**: Unified real-time search across customers, subscriptions, and invoices.
- **Customers**: Comprehensive client directory, search, filter, status toggles, and detailed slide-over customer profiles.
- **Products & Plans**: Modular capability tiers, flat vs. seat-based billing ($/seat), monthly and annual cadences.
- **Quotations**: Proposal generation with discount codes and tax calculations, plus **one-click "Accept & Convert"** to active subscriptions and generated invoices.
- **Subscriptions**: Real-time contract lifecycle tracking with **Pause**, **Resume**, and **Cancel** controls.
- **Invoices**: Line items, tax/discount breakdowns, and a **formal printable invoice view** with company letterhead.
- **Payments**: Reconciliation engine with idempotency guards preventing duplicate payment processing.
- **Discounts & Taxes**: Promotional codes, redemption limits, and regional tax rules (US Sales Tax, EU VAT, Canadian GST).
- **Reports**: MRR/ARR velocity cohorts, Net Retention Rate (118.4%), Gross Churn (0.6%), and 30-day renewal forecasting.
- **Users & Settings**: Role-Based Access Control (Admin, Finance Staff, Support Staff) and configurable billing defaults.
- **Billing Automation Engine**: Background runner (`POST /api/billing/run-scheduled-cycle`) that automatically checks period maturation, issues renewal invoices, and flags overdue balances.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, React Router
- **Backend**: Node.js, Express.js REST API
- **Database**: PostgreSQL DDL Schema (`server/schema.sql`) with `pg` (node-postgres) connection pool
- **Design Tokens**: Lavender-Indigo palette (`#F8F9FD`, `#5145E5`, `#EEEBFF`, `#111827`, `#64748B`, `#E5E7EB`)

---

## 📦 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Meghaa-sys/Subscription-Management.git
cd Subscription-Management

# Install root, backend, and frontend packages
npm install
npm --prefix server install
npm --prefix client install
```

### 2. Configure PostgreSQL (Optional)

Configure your PostgreSQL database URL in `server/.env` (or copy from `server/.env.example`):

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/subscriptiq
```

Execute the PostgreSQL schema:

```bash
psql -d subscriptiq -f server/schema.sql
```

*(Note: The server includes an automatic persistence fallback engine so the application runs completely out-of-the-box even before a local PostgreSQL daemon is configured).*

### 3. Run Development Servers

```bash
# Concurrently starts Express API (Port 5000) and Vite Frontend (Port 5173)
npm run dev
```

Visit **http://localhost:5173/** in your browser.
>>>>>>> 0efe7e7 (feat: complete SubscriptIQ platform with PostgreSQL schema and full interactive React frontend)
