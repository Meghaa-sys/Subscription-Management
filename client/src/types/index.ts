export interface Customer {
  id: string;
  name: string;
  contactName: string;
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
  payments?: Payment[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'active' | 'archived';
  icon: string;
  features: string[];
}

export interface Plan {
  id: string;
  productId: string;
  name: string;
  billingInterval: 'monthly' | 'annual';
  price: number;
  currency: string;
  seatBased: boolean;
  pricePerSeat: number;
  activeSubscribers: number;
  features: string[];
}

export interface QuotationItem {
  planId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  contactEmail: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  items: QuotationItem[];
  subtotal: number;
  discountCode?: string | null;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  validUntil: string;
  notes?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerAvatar?: string;
  planId: string;
  planName?: string;
  quotationId?: string;
  quantity: number;
  billingCycle: 'monthly' | 'annual';
  unitPrice: number;
  seatsAmount: number;
  amount: number;
  status: 'active' | 'trialing' | 'paused' | 'past_due' | 'cancelled';
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextRenewal: string;
  autoRenew: boolean;
  daysRemaining: number;
  pausedAt?: string | null;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerAvatar?: string;
  customerCompany?: string;
  customerAddress?: string;
  subscriptionId?: string;
  issueDate: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'void';
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paidAt?: string | null;
  paymentMethod?: string;
  notes?: string;
}

export interface Payment {
  id: string;
  paymentReference: string;
  invoiceId: string;
  invoiceNumber?: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  paymentMethod: 'credit_card' | 'bank_transfer' | 'wire' | 'stripe';
  status: 'successful' | 'pending' | 'failed';
  failureReason?: string;
  transactionId: string;
  createdAt: string;
}

export interface Discount {
  id: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  currency: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  status: 'active' | 'expired';
}

export interface Tax {
  id: string;
  name: string;
  rate: number;
  country: string;
  region: string;
  taxType: 'inclusive' | 'exclusive';
  status: 'active' | 'inactive';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Administrator' | 'Finance Staff' | 'Support Staff';
  avatar: string;
  status: 'active' | 'inactive';
  department: string;
  lastLogin: string;
}

export interface SystemSettings {
  companyName: string;
  legalName: string;
  supportEmail: string;
  contactPhone: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  taxId: string;
  address: string;
  invoicePrefix: string;
  paymentTermsDays: number;
  gracePeriodDays: number;
  autoRenewDefault: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: string;
  details: string;
  timestamp: string;
}

export interface DashboardStats {
  kpis: {
    activeSubscriptions: {
      value: number;
      changePercent: number;
      isPositive: boolean;
      periodLabel: string;
      sparkline: number[];
    };
    mrr: {
      value: number;
      changePercent: number;
      isPositive: boolean;
      periodLabel: string;
      sparkline: number[];
    };
    revenueCollected: {
      value: number;
      changePercent: number;
      isPositive: boolean;
      periodLabel: string;
      sparkline: number[];
    };
    overdueInvoices: {
      value: number;
      amount: number;
      changePercent: number;
      isPositive: boolean;
      periodLabel: string;
      sparkline: number[];
    };
  };
  revenueChart: Array<{
    period: string;
    collected: number;
    outstanding: number;
    total: number;
  }>;
  subscriptionDonut: {
    data: Array<{
      name: string;
      count: number;
      percentage: number;
      color: string;
    }>;
    total: number;
  };
  recentInvoices: Invoice[];
  upcomingRenewals: Array<{
    id: string;
    customerId: string;
    customerName: string;
    customerAvatar: string;
    planName: string;
    renewalDate: string;
    amount: number;
    billingCycle: string;
    daysRemaining: number;
    status: string;
  }>;
  mrr: number;
  arr: number;
}
