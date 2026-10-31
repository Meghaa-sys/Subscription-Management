// The shapes the pages work with. api/client.ts builds them from the Django API.

export interface Paged<T> {
  count: number;
  results: T[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  status: 'active' | 'inactive';
  balance: number;
  totalSpent: number;
  avatar: string;
  address?: string;
  createdAt: string;
  subscriptions?: Subscription[];
  invoices?: Invoice[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  productType: 'service' | 'goods' | 'addon';
  salesPrice: number;
  features: string[];
}

export type BillingInterval = 'daily' | 'weekly' | 'monthly' | 'annual';

export interface Plan {
  id: string;
  name: string;
  billingInterval: BillingInterval;
  price: number;
  minQuantity: number;
  activeSubscribers: number;
  features: string[];
}

export interface PaymentTerm {
  id: string;
  name: string;
  dueDays: number;
}

export type QuotationStatus = 'draft' | 'quotation' | 'confirmed';

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  contactEmail: string;
  status: QuotationStatus;
  subtotal: number;
  total: number;
  validUntil: string;
  createdAt: string;
}

export type SubscriptionStatus = QuotationStatus | 'active' | 'paused' | 'closed';

export interface Subscription {
  id: string;
  number: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerAvatar?: string;
  planId: string;
  planName?: string;
  quantity: number;
  billingCycle: BillingInterval;
  amount: number;
  status: SubscriptionStatus;
  startDate: string;
  nextRenewal: string;
  daysRemaining: number;
}

export interface NewSubscription {
  customerId: string;
  planId: string;
  productId: string;
  quantity: number;
  paymentTermId?: string;
  discountId?: string;
  notes?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export type InvoiceStatus = 'draft' | 'pending' | 'overdue' | 'paid' | 'void';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  customerAddress?: string;
  subscriptionId?: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  balance: number;
  paidAt?: string | null;
  paymentMethod?: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'upi' | 'cheque';

export const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
];

export interface Payment {
  id: string;
  paymentReference: string;
  invoiceId: string;
  invoiceNumber?: string;
  customerId: string;
  customerName?: string;
  amount: number;
  paymentMethod: string;
  note: string;
  paymentDate: string;
}

export interface Discount {
  id: string;
  name: string;
  type: 'percent' | 'fixed';
  value: number;
  validUntil: string;
  usageLimit: number | null;
  usedCount: number;
  status: 'active' | 'expired';
}

export interface Tax {
  id: string;
  name: string;
  rate: number;
  taxType: 'percent' | 'fixed';
  status: 'active' | 'inactive';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'active' | 'inactive';
  joined: string;
}

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'customer';
  phone?: string | null;
  company?: string | null;
  billing_address?: string | null;
}

export interface ProfileUpdate {
  name: string;
  phone: string;
  company: string;
  billing_address: string;
}

export type DiscountRequestStatus = 'pending' | 'forwarded' | 'approved' | 'rejected';

export interface DiscountRequest {
  id: string;
  customerName: string;
  subscriptionId: string;
  subscriptionNumber: string;
  message: string;
  status: DiscountRequestStatus;
  discountName: string | null;
  createdAt: string;
}

// What a customer sees about their own account.

export interface PortalSubscriptionLine {
  id: string;
  productName: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  lineTotal: number;
}

export interface PortalSubscriptionEvent {
  id: string;
  status: string;
  note: string;
  changedAt: string;
}

export interface PortalSubscription extends Subscription {
  statusLabel: string;
  expiryDate: string | null;
  subtotal: number;
  taxTotal: number;
  salesperson: string | null;
  paymentTerm: string | null;
  canPause: boolean;
  canResume: boolean;
  canRenew: boolean;
  lines: PortalSubscriptionLine[];
  discounts: string[];
  history: PortalSubscriptionEvent[];
}

export interface PortalInvoice extends Invoice {
  periodStart: string;
  periodEnd: string;
  payments: Payment[];
}

export interface PortalOverview {
  subscriptions: Subscription[];
  invoices: Invoice[];
  payments: Payment[];
  discountRequests: DiscountRequest[];
}

export interface ActivityItem {
  id: string;
  action: string;
  actor: string;
  details: string;
  timestamp: string;
}

export interface DashboardStats {
  kpis: {
    activeSubscriptions: { value: number };
    mrr: { value: number };
    revenueCollected: { value: number };
    overdueInvoices: { value: number; amount: number };
  };
  revenueChart: Array<{ period: string; collected: number }>;
  subscriptionDonut: {
    data: Array<{ name: string; count: number; percentage: number; color: string }>;
    total: number;
  };
  recentInvoices: Invoice[];
  upcomingRenewals: Subscription[];
  mrr: number;
  arr: number;
}

export interface ReportsData {
  summary: {
    activeSubscriptions: number;
    revenueCollected: number;
    outstanding: number;
    overdueCount: number;
    overdueAmount: number;
    mrr: number;
    arr: number;
  };
  revenue: Array<{ month: string; amount: number }>;
  byStatus: Array<{ status: string; label: string; count: number }>;
  overdueBuckets: Array<{ label: string; count: number; amount: number }>;
}
