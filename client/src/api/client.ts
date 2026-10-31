/**
 * The Django API (and through it, Neon), turned into the shapes the pages use.
 * Business rules stay on the server: this file only translates and sequences calls.
 */
import type {
  ActivityItem,
  BillingInterval,
  CurrentUser,
  Customer,
  DashboardStats,
  Discount,
  Invoice,
  InvoiceStatus,
  NewSubscription,
  Paged,
  Payment,
  PaymentMethod,
  PaymentTerm,
  Plan,
  Product,
  Quotation,
  QuotationStatus,
  ReportsData,
  Subscription,
  SubscriptionStatus,
  Tax,
  User,
} from '../types';

const BASE_URL = '/api';
const ACCESS_KEY = 'brightloop.access';
const REFRESH_KEY = 'brightloop.refresh';
const PAGE_SIZE = 100; // The most the API returns per page.
export const SESSION_EXPIRED_EVENT = 'auth-expired';

type Row = Record<string, any>;
type Params = Record<string, string | number | boolean | undefined | null>;

// --- Session ----------------------------------------------------------------

function readToken(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveTokens(access: string, refresh?: string) {
  try {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    // Storage blocked: the session then lasts only as long as this request.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Nothing stored, so nothing to clear.
  }
}

export const hasSession = () => Boolean(readToken(ACCESS_KEY));

// --- Requests ---------------------------------------------------------------

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function send(endpoint: string, options: RequestInit = {}, token?: string | null) {
  try {
    return await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError('Could not reach the server. Is the backend running?', 0);
  }
}

// Several requests can expire together, so they all wait on one refresh.
let refreshing: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  refreshing ??= (async () => {
    const refresh = readToken(REFRESH_KEY);
    if (!refresh) return false;
    const res = await send('/auth/refresh/', { method: 'POST', body: JSON.stringify({ refresh }) });
    if (!res.ok) return false;
    const data = await res.json();
    saveTokens(data.access, data.refresh);
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let res = await send(endpoint, options, readToken(ACCESS_KEY));

  if (res.status === 401) {
    if (await refreshAccessToken()) {
      res = await send(endpoint, options, readToken(ACCESS_KEY));
    } else {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      body?.detail ??
      (res.status >= 500
        ? 'The server could not be reached. Is the backend running?'
        : `Request failed with status ${res.status}`);
    throw new ApiError(message, res.status);
  }

  return (res.status === 204 ? undefined : await res.json()) as T;
}

const post = <T>(endpoint: string, body?: unknown) =>
  request<T>(endpoint, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

function query(params: Params = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.append(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

async function page<T>(path: string, params: Params, mapRow: (row: Row) => T): Promise<Paged<T>> {
  const data = await request<{ count: number; results: Row[] }>(
    `${path}${query({ page_size: PAGE_SIZE, ...params })}`
  );
  return { count: data.count, results: data.results.map(mapRow) };
}

/** Every page of a short list, for dropdowns and catalogue screens. */
async function all<T>(path: string, params: Params, mapRow: (row: Row) => T): Promise<T[]> {
  const rows: T[] = [];
  for (let number = 1; ; number += 1) {
    const { count, results } = await page(path, { ...params, page: number }, mapRow);
    rows.push(...results);
    if (rows.length >= count || results.length === 0) return rows;
  }
}

// --- Small helpers ----------------------------------------------------------

const toNumber = (value: unknown) => Number(value ?? 0);

/** An amount with thousands separators and always two decimals. */
export const formatMoney = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function localDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysUntil(dateText?: string | null): number {
  if (!dateText) return 0;
  const target = new Date(`${dateText}T00:00:00`).getTime();
  const today = new Date(`${localDate()}T00:00:00`).getTime();
  return Math.round((target - today) / 86_400_000);
}

const avatars = new Map<string, string>();

/** A generated initials image, so customer names are never sent to an avatar service. */
function avatarFor(name = ''): string {
  const cached = avatars.get(name);
  if (cached) return cached;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('')
    .replace(/[<>&"']/g, '');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#EEEBFF"/>` +
    `<text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="600" fill="#5145E5">${initials}</text></svg>`;
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  avatars.set(name, url);
  return url;
}

const toInterval = (period: string): BillingInterval =>
  (period === 'yearly' ? 'annual' : period) as BillingInterval;

const toPeriod = (interval: BillingInterval) => (interval === 'annual' ? 'yearly' : interval);

// --- Mapping API rows to page shapes ---------------------------------------

function toCustomer(row: Row): Customer {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company || '—',
    status: toNumber(row.active_subscriptions) > 0 ? 'active' : 'inactive',
    balance: toNumber(row.balance),
    totalSpent: toNumber(row.total_paid),
    avatar: avatarFor(row.name),
    address: row.billing_address,
    createdAt: row.created_at,
  };
}

function toProduct(row: Row): Product {
  const variants: string[] = (row.variants ?? [])
    .filter((variant: Row) => variant.is_active !== false)
    .map((variant: Row) => {
      const extra = toNumber(variant.extra_price);
      return extra > 0 ? `${variant.label} (+${extra})` : variant.label;
    });
  const taxes: string[] = (row.tax_details ?? []).map((tax: Row) => tax.name);
  return {
    id: String(row.id),
    name: row.name,
    description: row.notes ?? '',
    category: row.product_type_display,
    productType: row.product_type,
    salesPrice: toNumber(row.sales_price),
    features: [...variants, ...taxes.map(name => `Tax: ${name}`)],
  };
}

function toPlan(row: Row): Plan {
  const features = [
    `Minimum quantity: ${row.min_quantity}`,
    row.pausable ? 'Can be paused' : 'Cannot be paused',
    row.closable ? 'Can close early' : 'Cannot close before expiry',
    row.renewable ? 'Renewable' : 'Not renewable',
  ];
  if (row.auto_close) features.push('Closes automatically at expiry');
  return {
    id: String(row.id),
    name: row.name,
    billingInterval: toInterval(row.billing_period),
    price: toNumber(row.price),
    minQuantity: row.min_quantity,
    activeSubscribers: 0,
    features,
  };
}

function toSubscription(row: Row): Subscription {
  return {
    id: String(row.id),
    number: row.number,
    customerId: String(row.customer),
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerAvatar: avatarFor(row.customer_name),
    planId: String(row.plan),
    planName: row.plan_name,
    quantity: row.quantity,
    billingCycle: toInterval(row.billing_period),
    amount: toNumber(row.total),
    status: row.status,
    startDate: row.start_date,
    nextRenewal: row.next_billing_date ?? '—',
    daysRemaining: daysUntil(row.next_billing_date),
  };
}

function toQuotation(row: Row): Quotation {
  return {
    id: String(row.id),
    quotationNumber: row.number,
    customerId: String(row.customer),
    customerName: row.customer_name,
    contactEmail: row.customer_email,
    status: row.status,
    subtotal: toNumber(row.subtotal),
    total: toNumber(row.total),
    validUntil: row.quote_valid_until ?? '—',
    createdAt: row.created_at,
  };
}

function invoiceStatus(row: Row): InvoiceStatus {
  if (row.status === 'cancelled') return 'void';
  if (row.status === 'confirmed') return row.is_overdue ? 'overdue' : 'pending';
  return row.status;
}

function toInvoice(row: Row): Invoice {
  const payments: Row[] = row.payments ?? [];
  const lastPayment = payments[payments.length - 1];
  return {
    id: String(row.id),
    invoiceNumber: row.number,
    customerId: String(row.customer),
    customerName: row.customer_name,
    customerEmail: row.customer_details?.email,
    customerCompany: row.customer_details?.company,
    customerAddress: row.customer_details?.billing_address,
    subscriptionId: String(row.subscription),
    issueDate: row.invoice_date,
    dueDate: row.due_date,
    status: invoiceStatus(row),
    lineItems: (row.lines ?? []).map((line: Row) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: toNumber(line.unit_price),
      // Before discount and tax, because the totals below add those separately.
      amount: toNumber(line.unit_price) * line.quantity,
    })),
    subtotal: toNumber(row.subtotal),
    discountAmount: toNumber(row.discount_total),
    taxAmount: toNumber(row.tax_total),
    total: toNumber(row.total),
    balance: toNumber(row.balance),
    paidAt: lastPayment?.payment_date ?? null,
    paymentMethod: lastPayment?.method_display,
  };
}

function toPayment(row: Row): Payment {
  return {
    id: String(row.id),
    paymentReference: `PAY-${String(row.id).padStart(5, '0')}`,
    invoiceId: String(row.invoice),
    invoiceNumber: row.invoice_number,
    customerId: String(row.customer),
    customerName: row.customer_name,
    amount: toNumber(row.amount),
    paymentMethod: row.method_display,
    note: row.note ?? '',
    paymentDate: row.payment_date,
  };
}

function toDiscount(row: Row): Discount {
  const live = row.is_active && row.end_date >= localDate() && row.remaining_uses !== 0;
  return {
    id: String(row.id),
    name: row.name,
    type: row.discount_type,
    value: toNumber(row.value),
    validUntil: row.end_date,
    usageLimit: row.usage_limit,
    usedCount: row.times_used,
    status: live ? 'active' : 'expired',
  };
}

function toTax(row: Row): Tax {
  return {
    id: String(row.id),
    name: row.name,
    rate: toNumber(row.rate),
    taxType: row.tax_type,
    status: row.is_active ? 'active' : 'inactive',
  };
}

function toUser(row: Row): User {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    role: row.role_display,
    avatar: avatarFor(row.name),
    status: row.is_active ? 'active' : 'inactive',
    joined: row.created_at,
  };
}

const toPaymentTerm = (row: Row): PaymentTerm => ({
  id: String(row.id),
  name: row.name,
  dueDays: row.due_days,
});

// --- Lifecycle sequencing ---------------------------------------------------

const TRANSITION = (id: string) => `/subscriptions/${id}/transition/`;

function move(id: string, toStatus: SubscriptionStatus, note?: string) {
  return post<Row>(TRANSITION(id), { to_status: toStatus, note });
}

const PATH_TO_ACTIVE: SubscriptionStatus[] = ['draft', 'quotation', 'confirmed', 'active'];

/** Walk a subscription through each lifecycle step, so the server checks every rule. */
async function advanceToActive(id: string): Promise<Subscription> {
  let row = await request<Row>(`/subscriptions/${id}/`);
  for (let step = PATH_TO_ACTIVE.indexOf(row.status) + 1; step > 0 && step < PATH_TO_ACTIVE.length; step += 1) {
    row = await move(id, PATH_TO_ACTIVE[step]);
  }
  return toSubscription(row);
}

/** Create a draft with one product line, with its optional discount attached. */
async function createDraft(data: NewSubscription, validUntil?: string): Promise<string> {
  const row = await post<Row>('/subscriptions/', {
    customer: Number(data.customerId),
    plan: Number(data.planId),
    start_date: localDate(),
    quote_valid_until: validUntil,
    payment_term: data.paymentTermId ? Number(data.paymentTermId) : null,
    notes: data.notes ?? '',
    lines: [{ product: Number(data.productId), quantity: data.quantity }],
  });
  const id = String(row.id);
  if (data.discountId) {
    await post(`/subscriptions/${id}/discounts/`, { discount_id: Number(data.discountId) });
  }
  return id;
}

// --- Filters the screens offer ----------------------------------------------

const INVOICE_FILTERS: Record<string, Params> = {
  draft: { status: 'draft' },
  pending: { status: 'confirmed', overdue: false },
  overdue: { overdue: true },
  paid: { status: 'paid' },
  void: { status: 'cancelled' },
};

const CUSTOMER_ORDERING: Record<string, string> = {
  spent_desc: '-total_paid',
  newest: '-created_at',
  name_asc: 'name',
  name_desc: '-name',
};

const PERIOD_DAYS: Record<string, number> = {
  '7 days': 7,
  '30 days': 30,
  '3 months': 92,
  '12 months': 365,
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#CBD5E1',
  quotation: '#A5B4FC',
  confirmed: '#818CF8',
  active: '#5145E5',
  paused: '#F59E0B',
  closed: '#94A3B8',
};

const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });

export const api = {
  // Auth
  async login(email: string, password: string): Promise<CurrentUser> {
    clearSession();
    const res = await send('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        body?.detail ?? (res.status >= 500 ? 'The server could not be reached. Is the backend running?' : 'Login failed.');
      throw new ApiError(message, res.status);
    }
    saveTokens(body.access, body.refresh);
    return body.user;
  },
  getMe: () => request<CurrentUser>('/auth/me/'),

  // Dashboard
  async getDashboardStats(timeFilter = '12 months'): Promise<DashboardStats> {
    const dates = { date_from: localDate(-(PERIOD_DAYS[timeFilter] ?? 365)) };
    const [summary, revenue, statuses, invoices, renewals] = await Promise.all([
      request<Row>(`/reports/summary/${query(dates)}`),
      request<Row[]>(`/reports/revenue/${query(dates)}`),
      request<Row[]>('/reports/subscriptions-by-status/'),
      page('/invoices/', { page_size: 5 }, toInvoice),
      page('/subscriptions/', { status: 'active', ordering: 'next_billing_date', page_size: 5 }, toSubscription),
    ]);

    const months = revenue.slice(-12).map(row => ({ period: monthLabel(row.month), collected: toNumber(row.amount) }));
    const total = statuses.reduce((sum, row) => sum + row.count, 0);

    return {
      kpis: {
        activeSubscriptions: { value: summary.active_subscriptions },
        mrr: { value: toNumber(summary.mrr) },
        revenueCollected: { value: toNumber(summary.revenue_collected) },
        overdueInvoices: { value: summary.overdue_count, amount: toNumber(summary.overdue_amount) },
      },
      revenueChart: months,
      subscriptionDonut: {
        total,
        data: statuses
          .filter(row => row.count > 0)
          .map(row => ({
            name: row.status_display,
            count: row.count,
            percentage: total ? Math.round((row.count / total) * 100) : 0,
            color: STATUS_COLORS[row.status] ?? '#94A3B8',
          })),
      },
      recentInvoices: invoices.results,
      upcomingRenewals: renewals.results,
      mrr: toNumber(summary.mrr),
      arr: toNumber(summary.arr),
    };
  },

  // Search
  async search(text: string) {
    const params = { search: text, page_size: 5 };
    const [customers, invoices, subscriptions] = await Promise.all([
      page('/customers/', params, toCustomer),
      page('/invoices/', params, toInvoice),
      page('/subscriptions/', params, toSubscription),
    ]);
    return {
      customers: customers.results,
      invoices: invoices.results,
      subscriptions: subscriptions.results,
    };
  },

  // Customers
  async getCustomers(params: { search?: string; status?: string; sort?: string } = {}) {
    const customers = await all(
      '/customers/',
      { search: params.search, ordering: CUSTOMER_ORDERING[params.sort ?? ''] ?? 'name' },
      toCustomer
    );
    const status = params.status;
    return status && status !== 'all' ? customers.filter(c => c.status === status) : customers;
  },
  async getCustomer(id: string): Promise<Customer> {
    const [customer, subscriptions, invoices] = await Promise.all([
      request<Row>(`/customers/${id}/`),
      page('/subscriptions/', { customer: id }, toSubscription),
      page('/invoices/', { customer: id }, toInvoice),
    ]);
    return {
      ...toCustomer(customer),
      subscriptions: subscriptions.results,
      invoices: invoices.results,
    };
  },
  createCustomer: async (data: { name: string; email: string; company?: string; phone?: string; address?: string }) =>
    toCustomer(
      await post<Row>('/customers/', {
        name: data.name,
        email: data.email,
        company: data.company,
        phone: data.phone,
        billing_address: data.address,
      })
    ),
  deleteCustomer: (id: string) => request<void>(`/customers/${id}/`, { method: 'DELETE' }),

  // Products and plans
  getProducts: () => all('/products/', { is_active: true }, toProduct),
  createProduct: async (data: {
    name: string;
    productType: string;
    salesPrice: number;
    costPrice: number;
    notes: string;
  }) =>
    toProduct(
      await post<Row>('/products/', {
        name: data.name,
        product_type: data.productType,
        sales_price: data.salesPrice.toFixed(2),
        cost_price: data.costPrice.toFixed(2),
        notes: data.notes,
      })
    ),

  async getPlans(): Promise<Plan[]> {
    const plans = await all('/plans/', { is_active: true }, toPlan);
    return Promise.all(
      plans.map(async plan => {
        const { count } = await page('/subscriptions/', { plan: plan.id, status: 'active', page_size: 1 }, toSubscription);
        return { ...plan, activeSubscribers: count };
      })
    );
  },
  createPlan: async (data: { name: string; billingInterval: BillingInterval; price: number; minQuantity: number }) =>
    toPlan(
      await post<Row>('/plans/', {
        name: data.name,
        billing_period: toPeriod(data.billingInterval),
        price: data.price.toFixed(2),
        min_quantity: data.minQuantity,
        start_date: localDate(),
      })
    ),
  getPaymentTerms: () => all('/payment-terms/', {}, toPaymentTerm),

  // Quotations are subscriptions that have not been activated yet.
  async getQuotations(): Promise<Paged<Quotation>> {
    const statuses: QuotationStatus[] = ['quotation', 'draft', 'confirmed'];
    const pages = await Promise.all(statuses.map(status => page('/subscriptions/', { status }, toQuotation)));
    return {
      count: pages.reduce((sum, item) => sum + item.count, 0),
      results: pages.flatMap(item => item.results),
    };
  },
  async createQuotation(data: NewSubscription) {
    const id = await createDraft(data, localDate(30));
    return toQuotation(await move(id, 'quotation'));
  },
  convertQuotation: advanceToActive,

  // Subscriptions
  getSubscriptions: (params: { status?: string; search?: string; pageNumber?: number } = {}) =>
    page(
      '/subscriptions/',
      {
        status: params.status === 'all' ? undefined : params.status,
        search: params.search,
        page: params.pageNumber,
      },
      toSubscription
    ),
  async createSubscription(data: NewSubscription) {
    return advanceToActive(await createDraft(data));
  },
  activateSubscription: advanceToActive,
  pauseSubscription: (id: string) => move(id, 'paused'),
  resumeSubscription: (id: string) => move(id, 'active'),
  closeSubscription: (id: string, reason?: string) => move(id, 'closed', reason),

  // Invoices
  getInvoices: (params: { status?: string; search?: string; pageNumber?: number } = {}) =>
    page(
      '/invoices/',
      { ...INVOICE_FILTERS[params.status ?? ''], search: params.search, page: params.pageNumber },
      toInvoice
    ),
  /** Confirmed invoices with money still owed, oldest first. */
  getOpenInvoices: () => page('/invoices/', { status: 'confirmed', ordering: 'due_date' }, toInvoice),
  getInvoice: async (id: string) => toInvoice(await request<Row>(`/invoices/${id}/`)),
  confirmInvoice: async (id: string) => toInvoice(await post<Row>(`/invoices/${id}/confirm/`)),

  // Payments
  getPayments: (params: { search?: string; pageNumber?: number } = {}) =>
    page('/payments/', { search: params.search, page: params.pageNumber }, toPayment),
  recordPayment: async (data: { invoiceId: string; paymentMethod: PaymentMethod; amount: number }) =>
    toInvoice(
      await post<Row>(`/invoices/${data.invoiceId}/payments/`, {
        method: data.paymentMethod,
        amount: data.amount.toFixed(2),
        payment_date: localDate(),
      })
    ),

  // Discounts and taxes
  getDiscounts: () => all('/discounts/', {}, toDiscount),
  createDiscount: async (data: {
    name: string;
    type: 'percent' | 'fixed';
    value: number;
    validUntil: string;
    usageLimit: number;
  }) =>
    toDiscount(
      await post<Row>('/discounts/', {
        name: data.name,
        discount_type: data.type,
        value: data.value.toFixed(2),
        start_date: localDate(),
        end_date: data.validUntil,
        usage_limit: data.usageLimit,
        applies_to: 'subscription',
      })
    ),
  getTaxes: () => all('/taxes/', {}, toTax),
  createTax: async (data: { name: string; rate: number; taxType: 'percent' | 'fixed' }) =>
    toTax(await post<Row>('/taxes/', { name: data.name, rate: data.rate.toFixed(2), tax_type: data.taxType })),

  // Reports
  async getReports(): Promise<ReportsData> {
    const [summary, revenue, statuses, overdue] = await Promise.all([
      request<Row>('/reports/summary/'),
      request<Row[]>('/reports/revenue/'),
      request<Row[]>('/reports/subscriptions-by-status/'),
      request<Row>('/reports/overdue/?page_size=1'),
    ]);
    return {
      summary: {
        activeSubscriptions: summary.active_subscriptions,
        revenueCollected: toNumber(summary.revenue_collected),
        outstanding: toNumber(summary.outstanding),
        overdueCount: summary.overdue_count,
        overdueAmount: toNumber(summary.overdue_amount),
        mrr: toNumber(summary.mrr),
        arr: toNumber(summary.arr),
      },
      revenue: revenue.map(row => ({ month: monthLabel(row.month), amount: toNumber(row.amount) })),
      byStatus: statuses.map(row => ({ status: row.status, label: row.status_display, count: row.count })),
      overdueBuckets: overdue.buckets.map((bucket: Row) => ({
        label: bucket.label,
        count: bucket.count,
        amount: toNumber(bucket.amount),
      })),
    };
  },

  // Staff logins
  getUsers: () => all('/users/staff/', {}, toUser),
  createUser: async (data: { name: string; email: string; password: string }) =>
    toUser(await post<Row>('/users/staff/', data)),

  // Billing
  runBillingCycle: () =>
    post<{ created: number; skipped: number; subscriptions_processed: number; failed: number }>('/billing/run/'),

  /** The latest payments, for the notifications menu. */
  async getRecentActivity(): Promise<ActivityItem[]> {
    const rows = await request<{ results: Row[] }>('/payments/?page_size=5');
    return rows.results.map(row => ({
      id: String(row.id),
      action: 'Payment recorded',
      actor: row.recorded_by_name,
      details: `${row.amount} on ${row.invoice_number} from ${row.customer_name}`,
      timestamp: row.created_at,
    }));
  },
};
