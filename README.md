# SubscriptIQ — Unified Subscription Management System

> **Automate subscriptions. Simplify billing. Gain complete revenue visibility.**  
> A production-grade subscription management and automated recurring billing platform built for **Brightloop Software**, designed with modern aesthetics (Stripe, Linear, and Vercel inspired).

---

## 📌 Table of Contents
1. [Overview & Architecture](#1-overview--architecture)
2. [All Credentials (Demo Logins)](#2-all-credentials-demo-logins)
3. [End-to-End Business Workflow](#3-end-to-end-business-workflow)
4. [Core Features](#4-core-features)
   - [Authentication & Role-Based Access Control](#41-authentication--role-based-access-control)
   - [Product & Variant Management](#42-product--variant-management)
   - [Subscription Plan Management](#43-subscription-plan-management)
   - [Quotations & Lifecycle Management](#44-quotations--lifecycle-management)
   - [Automated Billing Engine & Invoicing](#45-automated-billing-engine--invoicing)
   - [Payments & Reconciliation](#46-payments--reconciliation)
   - [Taxes & Discount Approval Workflows](#47-taxes--discount-approval-workflows)
   - [Customer Self-Service Portal](#48-customer-self-service-portal)
   - [Revenue Analytics & Reporting](#49-revenue-analytics--reporting)
5. [Tech Stack](#5-tech-stack)
6. [Getting Started & Local Setup](#6-getting-started--local-setup)
   - [Prerequisites](#prerequisites)
   - [Backend Setup (Django + Neon PostgreSQL)](#backend-setup-django--neon-postgresql)
   - [Frontend Setup (React + Vite)](#frontend-setup-react--vite)
   - [Running Both Concurrently](#running-both-concurrently)
7. [Automated Billing & Scheduler Commands](#7-automated-billing--scheduler-commands)
8. [API Documentation](#8-api-documentation)

---

## 1. Overview & Architecture

SubscriptIQ replaces fragmented spreadsheets and manual billing operations with a centralized, scalable, and audit-compliant platform. It connects products, plans, quotations, subscriptions, invoices, payments, and analytics into a cohesive system.

### Architectural Layout:
- **Frontend (`client/`)**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts. Features dynamic KPI telemetry, interactive charts, slide-over modals, printable INR invoices with company letterhead, and a dedicated Customer Portal (`/portal`).
- **Backend (`backend/`)**: Django 5, Django REST Framework, SimpleJWT auth, `drf-spectacular` OpenAPI/Swagger documentation, and background management commands.
- **Database**: Cloud PostgreSQL hosted on **Neon**, leveraging atomic transactions, database check constraints, and unique indexes to mathematically eliminate double billing.

---

## 2. All Credentials (Demo Logins)

The database comes pre-populated with realistic business data via `python manage.py seed`. The system provides distinct access tiers based on role:

### 🔐 Demo Accounts Table

| Role | Email | Password | Scope & Accessible Features |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@brightloop.test` | `Admin@12345!` | **Full Admin Console**: Products, variants, plans, taxes, discounts, staff accounts, system settings, billing runner, and revenue analytics. |
| **Staff Member 1** | `staff1@brightloop.test` | `Staff@12345!` | **Operations Console**: Customer directories, quotation generation, subscription lifecycle management, invoice creation/sending, and payment recording. |
| **Staff Member 2** | `staff2@brightloop.test` | `Staff@12345!` | **Operations Console**: Customer directories, quotation generation, subscription lifecycle management, invoice creation/sending, and payment recording. |
| **Customer 1** | `customer1@brightloop.test` | `Customer@12345!` | **Customer Portal (`/portal`)**: View personal subscriptions, track upcoming renewals, inspect & download invoices, review payments, and submit discount requests. |
| **Customers 2–12** | `customer2@brightloop.test`<br>...up to...<br>`customer12@brightloop.test` | `Customer@12345!` | **Customer Portal (`/portal`)**: Linked to seeded demo companies (e.g. *Blue Lotus Foods*, *Cedar Logistics*, *Deccan Textiles*). |
| **Customers 13–20** | *(No login account)* | *(N/A)* | Manual customer profiles created by staff without self-service logins. |

> [!NOTE]
> - All password validation rules require: 8+ characters, at least one uppercase letter, one lowercase letter, and one special character.
> - When logging in at `http://localhost:5173/`, administrators and staff are routed to the main management console, while customers are seamlessly routed to `/portal`.

---

## 3. End-to-End Business Workflow

The lifecycle of recurring revenue in SubscriptIQ follows a closed-loop automated sequence:

```mermaid
flowchart TD
    A["1. Catalog Configuration"] -->|"Define Products, Variants, Taxes & Plans"| B["2. Quotation / Proposal"]
    B -->|"Select Template, Product Lines, Payment Terms"| C{"Customer Decision"}
    C -->|"Reject / Expire"| X["Closed / Expired"]
    C -->|"Accept & Convert"| D["3. Active Subscription Created"]
    D -->|"Recurring Period Due"| E["4. Automated Billing Engine"]
    E -->|"Locks Row & Checks Period Guard"| F["5. Invoice Generated & Sent"]
    F -->|"Record Customer Payment"| G["6. Payment Reconciliation"]
    G -->|"Invoice Balance = 0"| H["Invoice Marked PAID"]
    D -->|"Customer Requests Discount"| I["7. Discount Request Flow"]
    I -->|"Admin Approves"| D
    D -->|"Audit Logs & Metrics"| J["8. Revenue Analytics & Reporting"]
```

### Step-by-Step Breakdown:
1. **Catalog Setup**: Admin defines products (Goods, Services, Add-ons), optional variants (e.g. Edition, Brand with price deltas), tax rules (fixed or percentage), payment terms (e.g. Net 15, Net 30), and billing plans (cadence, pricing, min quantity).
2. **Quotation Generation**: Staff creates a quotation for a customer (or starts from a preset Quotation Template). Products, variants, quantities, taxes, and validity dates are calculated.
3. **Quotation Acceptance & Conversion**: With one click (**"Accept & Convert"**), the quotation transitions into a confirmed and active `Subscription`. The system computes start dates, expiry dates, and sets the initial `next_billing_date`.
4. **Billing Automation**: The background billing runner checks subscriptions due for renewal. It uses row-level locking and database constraints to guarantee zero double-billing, generating the periodic `Invoice`.
5. **Invoice Delivery & Payment**: Invoices feature detailed breakdowns (subtotal, taxes, discounts, totals). Staff or automated flows record payments (Cash, Card, Bank Transfer, UPI, Cheque), immediately reducing outstanding balances.
6. **Customer Self-Service**: Customers log into `/portal` to inspect active plans, review payment history, download invoices, and submit discount requests.
7. **Lifecycle Controls & Analytics**: Staff can pause, resume, or close subscriptions based on plan configuration rules. Real-time dashboards visualize MRR, ARR, churn, and upcoming renewal cohorts.

---

## 4. Core Features

### 4.1 Authentication & Role-Based Access Control
- Custom email-based user model (`User`) with secure password hashing (`PBKDF2`).
- 3 distinct security tiers: **Admin**, **Staff**, and **Customer**.
- Single-use, time-limited SHA-256 password reset tokens with email delivery.
- Customer data isolation ensuring customers can only access their own records.

### 4.2 Product & Variant Management
- Categorized products: **Service**, **Goods**, and **Add-on**.
- Cost price vs. Sales price tracking for profit margin analysis.
- Multi-attribute variant engine (e.g., `Brand: Odoo (+₹560)` or `Edition: Enterprise (+₹1,200)`).
- Multiple tax associations per product line.

### 4.3 Subscription Plan Management
- Configurable cadences: **Daily**, **Weekly**, **Monthly**, and **Yearly**.
- Minimum order quantity restrictions.
- Policy toggles per plan:
  - `auto_close`: Automatically close when configured end date is reached.
  - `closable`: Allow early cancellation before expiry.
  - `pausable`: Permit pausing ongoing billing cycles.
  - `renewable`: Support automatic or manual renewal.

### 4.4 Quotations & Lifecycle Management
- Reusable Quotation Templates to standardize sales proposals.
- Strict subscription lifecycle state machine:
  `draft` → `quotation` → `confirmed` → `active` → `paused` → `closed`
- Full audit history (`SubscriptionStatusHistory`) recording timestamp, transition notes, and user responsible.

### 4.5 Automated Billing Engine & Invoicing
- **Strict Decimal Precision**: All currency is stored and calculated using `DecimalField(max_digits=12, decimal_places=2)`. Floats are strictly prohibited.
- **Double-Billing Prevention**: Database check constraint and unique constraint on `(subscription, period_start)`.
- **Historical Immutability**: Invoice line items snapshot product pricing and tax rates at invoice creation; future catalog changes never alter historical records.
- **Printable Invoices**: Clean printable view with company letterhead, tax ID, and formal itemized tables.

### 4.6 Payments & Reconciliation
- Support for multiple payment methods: **Cash**, **Bank Transfer**, **Credit/Debit Card**, **UPI**, and **Cheque**.
- Multiple payments per invoice supported (partial payments, balance remaining, overdue detection).
- Overdue tracking dynamically calculated against invoice `due_date`.

### 4.7 Taxes & Discount Approval Workflows
- Flexible tax engine supporting both percentage rates (e.g. GST 18%) and fixed service fees.
- Granular discount rules (Percentage or Fixed amount, minimum purchase requirements, validity windows, and max redemption limits).
- Customer discount request workflow: Customer requests discount → Staff reviews/forwards → Admin approves/rejects.

### 4.8 Customer Self-Service Portal (`/portal`)
- Independent customer portal interface.
- Customers view active contracts, renewal dates, past invoices, and payment receipts.
- Direct self-service discount request form.

### 4.9 Revenue Analytics & Reporting
- Real-time KPI telemetry cards with sparklines: **Active Subscriptions**, **MRR (Monthly Recurring Revenue)**, **ARR**, **Revenue Collected**, and **Overdue Invoices**.
- Visual revenue cohort bar charts and subscription distribution donut charts.
- Renewal forecasting pipeline for the next 30 days.

---

## 5. Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, React Router v7 |
| **Backend** | Python 3.11+, Django 5.2, Django REST Framework, SimpleJWT, `drf-spectacular` |
| **Database** | PostgreSQL on Neon (Cloud Serverless Postgres with Connection Pooling) |
| **Design System** | Tailored Lavender & Slate palette (`#5145E5`, `#F8F9FD`, `#111827`, `#64748B`) |

---

## 6. Getting Started & Local Setup

### Prerequisites
- **Node.js** (v18 or newer)
- **Python** (v3.11 or newer)

---

### Backend Setup (Django + Neon PostgreSQL)

1. Navigate to the backend directory and activate your virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate    # On Windows: .venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables in `backend/.env`:
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
   SECRET_KEY="your-secret-key-here"
   DEBUG=True
   FRONTEND_URL=http://localhost:5173
   ```

4. Run migrations and populate demo seed data:
   ```bash
   python manage.py migrate
   python manage.py seed
   ```

5. Start the Django API server:
   ```bash
   python manage.py runserver
   ```
   *The backend will be live at `http://127.0.0.1:8000`.*

---

### Frontend Setup (React + Vite)

1. In a separate terminal, navigate to the client folder:
   ```bash
   cd client
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   👉 **[http://localhost:5173](http://localhost:5173)**

---

### Running Both Concurrently

From the repository root, you can start both the Django backend and Vite client with a single command:
```bash
npm run dev
```

---

## 7. Automated Billing & Scheduler Commands

The platform includes production management commands to handle recurring subscriptions:

| Command | Description |
| :--- | :--- |
| `python manage.py run_billing` | Processes all subscriptions due for billing today and generates invoices. |
| `python manage.py run_billing --date YYYY-MM-DD` | Runs the billing cycle as of a specific date. |
| `python manage.py close_expired` | Automatically closes subscriptions that have reached their configured expiry date. |
| `python manage.py scheduler` | Continuously running background daemon (executes billing daily at 00:05 and expiry checks at 00:10 Asia/Kolkata). |
| `python manage.py seed --big` | Seeds an additional 5,000 active subscriptions for performance stress testing. |
| `python manage.py seed --reset` | Wipes and reseeds all demo data (requires `DEBUG=True`). |

---

## 8. API Documentation

Interactive API documentation is generated automatically via OpenAPI 3.0 / Swagger:

- **Swagger UI**: [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)
- **OpenAPI Schema**: [http://127.0.0.1:8000/api/schema/](http://127.0.0.1:8000/api/schema/)
- **Django Admin**: [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)
