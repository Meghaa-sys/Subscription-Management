import {
  Customer,
  Product,
  Plan,
  Quotation,
  Subscription,
  Invoice,
  Payment,
  Discount,
  Tax,
  User,
  SystemSettings,
  AuditLog,
  DashboardStats,
} from '../types';

const BASE_URL = '/api';

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Dashboard
  getDashboardStats: (timeFilter = '12 months') =>
    fetchJSON<DashboardStats>(`/dashboard/stats?timeFilter=${encodeURIComponent(timeFilter)}`),

  // Search
  search: (query: string) =>
    fetchJSON<{ customers: Customer[]; invoices: Invoice[]; subscriptions: Subscription[] }>(
      `/search?q=${encodeURIComponent(query)}`
    ),

  // Customers
  getCustomers: (params?: { search?: string; status?: string; sort?: string }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('search', params.search);
    if (params?.status) sp.append('status', params.status);
    if (params?.sort) sp.append('sort', params.sort);
    return fetchJSON<Customer[]>(`/customers?${sp.toString()}`);
  },
  getCustomer: (id: string) => fetchJSON<Customer>(`/customers/${id}`),
  createCustomer: (data: Partial<Customer>) =>
    fetchJSON<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: Partial<Customer>) =>
    fetchJSON<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) =>
    fetchJSON<{ message: string }>(`/customers/${id}`, { method: 'DELETE' }),

  // Products & Plans
  getProducts: () => fetchJSON<Product[]>('/products'),
  createProduct: (data: Partial<Product>) =>
    fetchJSON<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Partial<Product>) =>
    fetchJSON<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getPlans: () => fetchJSON<Plan[]>('/plans'),
  createPlan: (data: Partial<Plan>) =>
    fetchJSON<Plan>('/plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id: string, data: Partial<Plan>) =>
    fetchJSON<Plan>(`/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Quotations
  getQuotations: () => fetchJSON<Quotation[]>('/quotations'),
  createQuotation: (data: any) =>
    fetchJSON<Quotation>('/quotations', { method: 'POST', body: JSON.stringify(data) }),
  updateQuotation: (id: string, data: Partial<Quotation>) =>
    fetchJSON<Quotation>(`/quotations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  convertQuotation: (id: string) =>
    fetchJSON<{ message: string; quotation: Quotation; subscription: Subscription; invoice: Invoice }>(
      `/quotations/${id}/convert`,
      { method: 'POST' }
    ),

  // Subscriptions
  getSubscriptions: (params?: { status?: string; customerId?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.customerId) sp.append('customerId', params.customerId);
    return fetchJSON<Subscription[]>(`/subscriptions?${sp.toString()}`);
  },
  createSubscription: (data: any) =>
    fetchJSON<Subscription>('/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
  pauseSubscription: (id: string) =>
    fetchJSON<{ message: string; subscription: Subscription }>(`/subscriptions/${id}/pause`, { method: 'POST' }),
  resumeSubscription: (id: string) =>
    fetchJSON<{ message: string; subscription: Subscription }>(`/subscriptions/${id}/resume`, { method: 'POST' }),
  cancelSubscription: (id: string, reason?: string) =>
    fetchJSON<{ message: string; subscription: Subscription }>(`/subscriptions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Invoices
  getInvoices: (params?: { status?: string; customerId?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.customerId) sp.append('customerId', params.customerId);
    return fetchJSON<Invoice[]>(`/invoices?${sp.toString()}`);
  },
  getInvoice: (id: string) =>
    fetchJSON<Invoice & { customer: Customer; payment?: Payment; companySettings: SystemSettings }>(
      `/invoices/${id}`
    ),

  // Payments
  getPayments: () => fetchJSON<Payment[]>('/payments'),
  recordPayment: (data: { invoiceId: string; paymentMethod: string; amount?: number }) =>
    fetchJSON<{ message: string; payment: Payment; invoice: Invoice }>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Discounts & Taxes
  getDiscounts: () => fetchJSON<Discount[]>('/discounts'),
  createDiscount: (data: Partial<Discount>) =>
    fetchJSON<Discount>('/discounts', { method: 'POST', body: JSON.stringify(data) }),
  getTaxes: () => fetchJSON<Tax[]>('/taxes'),
  createTax: (data: Partial<Tax>) =>
    fetchJSON<Tax>('/taxes', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getReports: () => fetchJSON<any>('/reports'),

  // Users & Settings
  getUsers: () => fetchJSON<User[]>('/users'),
  createUser: (data: Partial<User>) =>
    fetchJSON<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  getSettings: () => fetchJSON<SystemSettings>('/settings'),
  updateSettings: (data: Partial<SystemSettings>) =>
    fetchJSON<SystemSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Audit Logs
  getAuditLogs: () => fetchJSON<AuditLog[]>('/audit-logs'),

  // Billing Cycle Scheduled Run
  runBillingCycle: () =>
    fetchJSON<{ message: string; renewalsProcessed: number; invoicesMarkedOverdue: number; timestamp: string }>(
      '/billing/run-scheduled-cycle',
      { method: 'POST' }
    ),

  // Reset Demo Data
  resetDemoData: () => fetchJSON<{ message: string }>('/admin/reset-data', { method: 'POST' }),
};
