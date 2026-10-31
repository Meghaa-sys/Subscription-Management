# Brightloop Subscription Management System: Backend

One platform for the full life of a subscription business: products and plans, quotations,
subscriptions, recurring billing, taxes, discounts, payments and revenue reporting.

Django 5, Django REST Framework, PostgreSQL on Neon. The interactive API docs are at
`/api/docs/` once the server is running.

## Setup

Requires Python 3.11 or newer.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then fill in real values
python manage.py migrate
python manage.py seed
python manage.py runserver
```

To run the website against this API, from the repository root:

```bash
npm run dev     # Django on :8000 and the React site on :5173
```

Vite forwards `/api` to Django, so the site uses the database in `DATABASE_URL`. **Anything you
change on the site changes Neon, which the whole team shares.** To try something risky, point
`DATABASE_URL` at SQLite first. The site signs in with the seed logins below; customers cannot
sign in yet, because the customer portal is not built.

- API: http://127.0.0.1:8000/api/
- Swagger: http://127.0.0.1:8000/api/docs/ (log in, then click **Authorize** and paste the `access` token)
- OpenAPI schema: http://127.0.0.1:8000/api/schema/
- Django admin: http://127.0.0.1:8000/admin/

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon PostgreSQL direct connection string, with `?sslmode=require` |
| `SECRET_KEY` | When `DEBUG` is off | Django secret key |
| `DEBUG` | No, default `False` | `True` for local development; emails print to the console |
| `ALLOWED_HOSTS` | No, default `localhost,127.0.0.1` | Comma-separated hosts |
| `FRONTEND_URL` | No, default `http://localhost:5173` | CORS origin and base of links in emails |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` | When `DEBUG` is off | SMTP settings |
| `DEFAULT_FROM_EMAIL` | No | Sender address |

Never commit `.env`. `.env.example` holds placeholders only.

## Migrate and seed

Tables are created only through Django migrations. The models are the single source of truth.

```bash
python manage.py migrate
python manage.py seed            # demo data; safe to run again
python manage.py seed --big      # also adds 5,000 active subscriptions, for performance testing
python manage.py seed --reset    # DELETES ALL DATA, then reseeds. Needs DEBUG=True or --force
```

The data is reproducible apart from dates, which are relative to today.

### Seed logins

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@brightloop.test` | `Admin@12345!` |
| Staff | `staff1@brightloop.test` | `Staff@12345!` |
| Staff | `staff2@brightloop.test` | `Staff@12345!` |
| Customer | `customer1@brightloop.test` | `Customer@12345!` |
| Customer | `customer2@brightloop.test` to `customer12@brightloop.test` | `Customer@12345!` |

Customers 13 to 20 have no login, like customers staff create by hand.

The seed creates 2 taxes, 3 payment terms, 5 products, 3 plans, 2 quotation templates, 2 discounts,
50 subscriptions across all statuses, invoices (paid, part paid, overdue and draft) and discount
requests in every status.

## Billing and the scheduler

```bash
python manage.py run_billing                     # bill everything due today
python manage.py run_billing --date 2026-11-01   # bill as of a date
python manage.py close_expired                   # close auto-close subscriptions past expiry
python manage.py scheduler                       # keep running: billing 00:05, close_expired 00:10 (Asia/Kolkata)
```

`POST /api/billing/run/` (admin) powers the "Run billing now" button.

Billing is idempotent. Each period is billed in one transaction with the subscription row locked,
`next_billing_date` always moves forward, and a unique constraint on `(subscription, period_start)`
stops double billing at database level. Running billing twice for a date creates nothing new, and
missed periods are caught up in order.

Run only one `scheduler` process. A second would be harmless to the data, just wasteful.

## Tests

Tests run on local SQLite and refuse to start against any other database, so they can never touch Neon.

```bash
# PowerShell
$env:DATABASE_URL="sqlite:///test.sqlite3"; python manage.py test
# bash
DATABASE_URL=sqlite:///test.sqlite3 python manage.py test
```

Validate the API docs with:

```bash
python manage.py spectacular --validate --fail-on-warn --file schema.yml
```

## Project layout

| App | Holds |
| --- | --- |
| `core` | Settings and root URLs |
| `common` | Money rounding, pagination, error handler, `/api/meta/choices/`, seed command |
| `accounts` | Users, customers, password reset, permissions |
| `catalog` | Products, variants, taxes, plans, payment terms |
| `subscriptions` | Templates, subscriptions, lifecycle |
| `billing` | Billing engine, invoices, payments, scheduler |
| `discounts` | Discount rules, attachments, usage, requests |
| `reports` | `queries.py` (plain functions to tune) and thin views |

Business logic lives in each app's `services.py`, never in views.

## API conventions

- All routes are under `/api/`, JSON only, snake_case.
- Dates are `YYYY-MM-DD`; datetimes are ISO 8601.
- **Money is sent and returned as strings**, such as `"1499.50"`.
- Lists return `{count, next, previous, results}`, 20 per page, `?page_size=` up to 100.
- Lists support `?search=` and `?ordering=` where sensible; the default is newest first.
- Every error body has a string `detail`. Validation errors also carry field errors beside it.
- 400 business rule or validation, 401 not logged in, 403 wrong role, 404 not found or not yours.

## Endpoints

Roles: **A** admin, **S** staff, **C** customer (own data only), **Public** no login.

### Auth and users

| Method | URL | Roles | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/signup/` | Public | Create a customer account; returns tokens |
| POST | `/api/auth/login/` | Public | Log in; returns tokens and user |
| POST | `/api/auth/refresh/` | Public | New access token from a refresh token |
| GET | `/api/auth/me/` | A S C | Current user |
| PATCH | `/api/auth/me/` | A S C | Update name; customers also phone, company, billing_address |
| POST | `/api/auth/forgot-password/` | Public | Email a reset link; always the same 200 |
| POST | `/api/auth/reset-password/` | Public | Set a new password with a token |
| GET, POST | `/api/users/staff/` | A | List or create staff |
| GET | `/api/users/staff/{id}/` | A | Get a staff user |
| POST | `/api/users/staff/{id}/activate/` | A | Allow login |
| POST | `/api/users/staff/{id}/deactivate/` | A | Block login at once |
| GET | `/api/meta/choices/` | A S C | Every dropdown list |

### Catalogue and customers

| Method | URL | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/products/`, `/api/products/{id}/` | A S C | Products; customers see active ones without cost or notes |
| POST | `/api/products/` | A | Create, with nested `variants` and `taxes` ids |
| PUT, PATCH | `/api/products/{id}/` | A | Update; a `variants` list replaces the whole list |
| DELETE | `/api/products/{id}/` | A | Soft delete |
| DELETE | `/api/products/{id}/variants/{variant_id}/` | A | Soft delete one variant |
| GET | `/api/plans/`, `/api/plans/{id}/` | A S C | Plans; customers see active ones |
| POST, PUT, PATCH, DELETE | `/api/plans/`, `/api/plans/{id}/` | A | Manage plans; DELETE is soft |
| GET | `/api/taxes/`, `/api/taxes/{id}/` | A S | Taxes |
| POST, PUT, PATCH, DELETE | `/api/taxes/`, `/api/taxes/{id}/` | A | Manage taxes; DELETE is soft |
| GET | `/api/payment-terms/`, `/api/payment-terms/{id}/` | A S | Payment terms |
| POST, PUT, PATCH, DELETE | `/api/payment-terms/`, `/api/payment-terms/{id}/` | A | Manage terms; DELETE is refused while in use |
| GET, POST | `/api/customers/` | A S | List or create customers |
| GET, PUT, PATCH, DELETE | `/api/customers/{id}/` | A S | Manage a customer; DELETE is refused with a login or subscriptions |

### Subscriptions and templates

| Method | URL | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/subscriptions/` | A S C | List. Filters: `status`, `customer`, `plan`, `start_date_from`, `start_date_to` |
| POST | `/api/subscriptions/` | A S | Create a draft with nested lines |
| GET | `/api/subscriptions/{id}/` | A S C | Detail with lines, history, discounts |
| PUT, PATCH | `/api/subscriptions/{id}/` | A S | Edit (draft and quotation only) |
| DELETE | `/api/subscriptions/{id}/` | A S | Delete a draft |
| POST | `/api/subscriptions/{id}/transition/` | A S C | Change status; customers only pause and resume |
| POST | `/api/subscriptions/{id}/renew/` | A S C | Extend expiry by one billing period |
| POST | `/api/subscriptions/{id}/lines/` | A S | Switch an add-on on (active only) |
| DELETE | `/api/subscriptions/{id}/lines/{line_id}/` | A S | Switch an add-on off (active only) |
| POST | `/api/subscriptions/{id}/discounts/` | A S | Attach a discount |
| DELETE | `/api/subscriptions/{id}/discounts/{discount_id}/` | A S | Detach a discount |
| GET, POST | `/api/quotation-templates/` | A S | List or create templates |
| GET, PUT, PATCH, DELETE | `/api/quotation-templates/{id}/` | A S | Manage a template; DELETE is soft |
| POST | `/api/quotation-templates/{id}/create-subscription/` | A S | Start a quotation from a template |

### Billing, invoices and payments

| Method | URL | Roles | Purpose |
| --- | --- | --- | --- |
| POST | `/api/billing/run/` | A | Run billing now; returns counts |
| GET | `/api/invoices/` | A S C | List. Filters: `status`, `customer`, `subscription`, `invoice_date_from`, `invoice_date_to`, `overdue` |
| GET | `/api/invoices/{id}/` | A S C | Everything needed to print an invoice |
| POST | `/api/invoices/{id}/confirm/` | A S | Draft to confirmed |
| POST | `/api/invoices/{id}/cancel/` | A S | Cancel a draft or unpaid confirmed invoice |
| POST | `/api/invoices/{id}/send/` | A S | Email the customer |
| POST | `/api/invoices/bulk/` | A S | Confirm or send many; per-id results |
| POST | `/api/invoices/{id}/payments/` | A S | Record a payment |
| GET | `/api/payments/`, `/api/payments/{id}/` | A S C | Payments. Filters: `method`, `invoice`, `customer`, `payment_date_from`, `payment_date_to` |

### Discounts

| Method | URL | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/discounts/`, `/api/discounts/{id}/` | A S | Discount rules |
| POST, PUT, PATCH, DELETE | `/api/discounts/`, `/api/discounts/{id}/` | A | Manage rules; DELETE is soft |
| GET | `/api/discount-requests/`, `/api/discount-requests/{id}/` | A S C | Requests. Filters: `status`, `customer`, `subscription` |
| POST | `/api/discount-requests/` | C | Ask for a discount on your own subscription |
| POST | `/api/discount-requests/{id}/forward/` | A S | Pending to forwarded |
| POST | `/api/discount-requests/{id}/reject/` | A S | Pending or forwarded to rejected |
| POST | `/api/discount-requests/{id}/approve/` | A | Approve, optionally attaching `discount_id` |

### Reports

All accept optional `date_from` and `date_to`.

| Method | URL | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/reports/summary/` | A S | Active subscriptions, revenue, outstanding, overdue, MRR, ARR |
| GET | `/api/reports/revenue/` | A S | Payments per month |
| GET | `/api/reports/overdue/` | A S | Ageing buckets and paginated overdue invoices |
| GET | `/api/reports/subscriptions-by-status/` | A S | Counts per status |

### Docs

| Method | URL | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/docs/` | Public | Swagger UI |
| GET | `/api/schema/` | Public | OpenAPI schema |

## Assumptions

Choices made where the brief left room:

**Pricing and billing**
- `SubscriptionLine.amount` is quantity times unit price **before tax**, with tax in `tax_amount`.
  MRR sums `amount`, so recurring revenue never includes tax. `line_total` adds the tax for display.
- `RecurringPlan.price` is a list price for display. Invoices are built from subscription lines.
- Nothing is billed for a period starting after `expiry_date`, including when billing runs before
  `close_expired` at midnight. Renewing lets billing carry on from where it stopped.
- There is no proration: a period running past `expiry_date` is billed in full.
- Periods follow the formula in the brief, so a monthly plan starting 31 Jan ends 27 Feb, and the
  next starts 28 Feb and stays on the 28th.
- Cancelling an invoice does not re-bill its period.
- A fixed tax applies once per line, even on a fully discounted line.

**Discounts**
- A product discount is spread only over matching lines, and a subscription discount over all lines.
- Several discounts can stack. They apply in id order and are trimmed so no line goes below zero;
  `DiscountUsage.amount` records what was really given.
- A cancelled invoice gives back its discount uses.
- An invoice fully covered by discounts goes straight to paid on confirmation.
- A discount can be attached before its start date, but not after it expires or runs out.

**Subscriptions**
- Add-on products are exempt from `plan.min_quantity`.
- A subscription needs at least one line to be confirmed.
- Only drafts can be deleted.
- Renewing needs an `expiry_date`, and works on active or paused subscriptions.
- A plan with `closable` off can be closed at any time if the subscription has no expiry date.
- Only staff and admin switch add-ons, as the role list for customers does not include it.

**Accounts**
- Emails are stored in lowercase, so duplicates are caught regardless of case.
- A new reset request invalidates older links for that user.
- Login, signup and password endpoints are limited to 30 requests a minute per client.
- `PATCH /api/auth/me/` uses `billing_address` for the customer's address.

**Reports**
- Dates filter payments by `payment_date`, invoices by `invoice_date` and subscriptions by
  `start_date`. Active subscriptions, MRR and ARR on the summary are always as of today.

**Technical**
- `conn_health_checks=True` is added to the database config, because Neon suspends idle computes
  and that kills pooled connections.
- `ssl_require=True` applies to PostgreSQL only, because SQLite rejects the `sslmode` option and
  the tests run on SQLite.
- Customers can see their own draft invoices.
