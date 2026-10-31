import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SCHEMA_FILE = path.join(__dirname, '..', 'schema.sql');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// PostgreSQL Connection Pool Setup
let pgPool = null;
let usePg = false;

if (process.env.DATABASE_URL || process.env.PGHOST) {
  try {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || undefined,
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
      database: process.env.PGDATABASE || 'subscriptiq',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 3000,
    });
    console.log('Configured PostgreSQL Pool connection');
  } catch (err) {
    console.warn('PostgreSQL configuration error:', err.message);
  }
}

export const getInitialData = () => ({
  settings: {
    companyName: 'Brightloop Software',
    legalName: 'Brightloop Technologies Inc.',
    supportEmail: 'billing@brightloop.io',
    contactPhone: '+1 (555) 382-9011',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/New_York (UTC-5)',
    taxId: 'US-892401928',
    address: '548 Market St, Suite 32900, San Francisco, CA 94104',
    invoicePrefix: 'INV-2026-',
    paymentTermsDays: 14,
    gracePeriodDays: 7,
    autoRenewDefault: true,
  },
  users: [
    {
      id: 'usr_01',
      name: 'Megha',
      email: 'megha@brightloop.io',
      role: 'Administrator',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      status: 'active',
      department: 'Product & Billing Leadership',
      lastLogin: '2026-10-31 09:45 AM',
    },
    {
      id: 'usr_02',
      name: 'David Chen',
      email: 'david.chen@brightloop.io',
      role: 'Finance Staff',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      status: 'active',
      department: 'Accounting & Treasury',
      lastLogin: '2026-10-30 04:20 PM',
    },
    {
      id: 'usr_03',
      name: 'Sarah Jenkins',
      email: 'sarah.j@brightloop.io',
      role: 'Support Staff',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      status: 'active',
      department: 'Customer Success',
      lastLogin: '2026-10-31 08:12 AM',
    },
  ],
  customers: [
    {
      id: 'cust_01',
      name: 'Acme Corporation',
      contactName: 'Elena Rostova',
      email: 'elena@acme.corp',
      phone: '+1 (415) 890-2133',
      company: 'Acme Global Holdings',
      status: 'active',
      balance: 0,
      totalSpent: 4890,
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
      address: '100 Innovation Way, Suite 400, Austin, TX 78701',
      createdAt: '2026-01-15T09:00:00Z',
    },
    {
      id: 'cust_02',
      name: 'Nexus Dynamics',
      contactName: 'Marcus Vance',
      email: 'marcus@nexusdynamics.io',
      phone: '+1 (650) 441-9920',
      company: 'Nexus Dynamics AI',
      status: 'active',
      balance: 1450,
      totalSpent: 12400,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      address: '77 Geary Street, San Francisco, CA 94108',
      createdAt: '2026-02-01T14:30:00Z',
    },
    {
      id: 'cust_03',
      name: 'PulseFlow Media',
      contactName: 'Chloe Bennett',
      email: 'cbennett@pulseflow.co',
      phone: '+1 (212) 304-5829',
      company: 'PulseFlow Digital',
      status: 'active',
      balance: 0,
      totalSpent: 8750,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      address: '350 5th Avenue, Fl 42, New York, NY 10118',
      createdAt: '2026-02-20T11:15:00Z',
    },
    {
      id: 'cust_04',
      name: 'CloudSync Labs',
      contactName: 'Devon Patel',
      email: 'devon@cloudsynclabs.net',
      phone: '+1 (206) 779-1120',
      company: 'CloudSync Systems',
      status: 'active',
      balance: 3500,
      totalSpent: 6200,
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
      address: '1201 3rd Ave, Seattle, WA 98101',
      createdAt: '2026-03-10T08:45:00Z',
    },
    {
      id: 'cust_05',
      name: 'Hyperion Robotics',
      contactName: 'Astrid Lindgren',
      email: 'astrid@hyperion.tech',
      phone: '+46 8 123 4567',
      company: 'Hyperion Robotics AB',
      status: 'active',
      balance: 0,
      totalSpent: 19800,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
      address: 'Kungsgatan 12, Stockholm, Sweden',
      createdAt: '2025-11-04T10:00:00Z',
    },
    {
      id: 'cust_06',
      name: 'Zephyr Analytics',
      contactName: 'Liam O\'Connor',
      email: 'liam@zephyranalytics.com',
      phone: '+1 (312) 991-0344',
      company: 'Zephyr BigData LLC',
      status: 'inactive',
      balance: 0,
      totalSpent: 3100,
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80',
      address: '233 S Wacker Dr, Chicago, IL 60606',
      createdAt: '2026-01-28T16:20:00Z',
    },
  ],
  products: [
    {
      id: 'prod_01',
      name: 'Brightloop Engine',
      description: 'Core real-time edge processing and high-availability sync engine.',
      category: 'Infrastructure',
      status: 'active',
      icon: 'Cpu',
      features: ['Sub-10ms Global Latency', 'Unlimited Event Ingestion', '99.99% Guaranteed SLA', 'Custom Domain Routing'],
    },
    {
      id: 'prod_02',
      name: 'Brightloop Analytics',
      description: 'Deep customer behavioral telemetry, cohort analytics, and AI predictions.',
      category: 'Analytics',
      status: 'active',
      icon: 'BarChart3',
      features: ['Real-Time Stream Processing', 'Funnel & Churn Predictions', 'Custom Export Pipelines', 'Automated Anomaly Detection'],
    },
    {
      id: 'prod_03',
      name: 'Enterprise Shield',
      description: 'Zero-trust network security, automated SOC2 compliance, and dedicated encryption keys.',
      category: 'Security',
      status: 'active',
      icon: 'ShieldCheck',
      features: ['SAML / Okta SSO Integration', 'Granular Role-Based Access (RBAC)', 'Immutable Audit Logging', 'Dedicated Private VPC Peering'],
    },
  ],
  plans: [
    {
      id: 'plan_starter_mo',
      productId: 'prod_01',
      name: 'Starter - Monthly',
      billingInterval: 'monthly',
      price: 99,
      currency: 'USD',
      seatBased: false,
      pricePerSeat: 0,
      activeSubscribers: 42,
      features: ['Up to 50,000 monthly active users', 'Standard community support', 'Daily automated backups'],
    },
    {
      id: 'plan_growth_mo',
      productId: 'prod_01',
      name: 'Growth - Monthly',
      billingInterval: 'monthly',
      price: 299,
      currency: 'USD',
      seatBased: true,
      pricePerSeat: 25,
      activeSubscribers: 128,
      features: ['Up to 500,000 monthly active users', '10 seats included', 'Priority SLA support (<2hr)', 'Custom webhooks & integrations'],
    },
    {
      id: 'plan_growth_yr',
      productId: 'prod_01',
      name: 'Growth - Annual',
      billingInterval: 'annual',
      price: 2990,
      currency: 'USD',
      seatBased: true,
      pricePerSeat: 240,
      activeSubscribers: 84,
      features: ['2 months free included', 'Up to 500,000 monthly active users', 'Priority SLA support', 'Dedicated onboarding engineer'],
    },
    {
      id: 'plan_enterprise_mo',
      productId: 'prod_01',
      name: 'Enterprise Scale - Monthly',
      billingInterval: 'monthly',
      price: 899,
      currency: 'USD',
      seatBased: true,
      pricePerSeat: 45,
      activeSubscribers: 36,
      features: ['Unlimited monthly active users', 'Dedicated cluster deployment', '24/7 dedicated Slack war-room', 'Custom compliance attestations'],
    },
    {
      id: 'plan_analytics_addon',
      productId: 'prod_02',
      name: 'Analytics Pro - Monthly',
      billingInterval: 'monthly',
      price: 149,
      currency: 'USD',
      seatBased: false,
      pricePerSeat: 0,
      activeSubscribers: 65,
      features: ['Full telemetry pipeline', 'Up to 10M events/month', 'Machine Learning Churn Predictor'],
    },
    {
      id: 'plan_shield_addon',
      productId: 'prod_03',
      name: 'Shield Security - Monthly',
      billingInterval: 'monthly',
      price: 399,
      currency: 'USD',
      seatBased: false,
      pricePerSeat: 0,
      activeSubscribers: 28,
      features: ['Dedicated KMS key', 'SAML 2.0 / SCIM auto-provisioning', 'Real-time audit log streaming'],
    },
  ],
  subscriptions: [
    {
      id: 'sub_001',
      customerId: 'cust_01',
      planId: 'plan_growth_mo',
      quantity: 12,
      billingCycle: 'monthly',
      unitPrice: 299,
      seatsAmount: 50,
      amount: 349,
      status: 'active',
      startDate: '2026-01-15T00:00:00Z',
      currentPeriodStart: '2026-10-15T00:00:00Z',
      currentPeriodEnd: '2026-11-15T00:00:00Z',
      nextRenewal: '2026-11-15',
      autoRenew: true,
      daysRemaining: 15,
    },
    {
      id: 'sub_002',
      customerId: 'cust_02',
      planId: 'plan_enterprise_mo',
      quantity: 25,
      billingCycle: 'monthly',
      unitPrice: 899,
      seatsAmount: 675,
      amount: 1574,
      status: 'active',
      startDate: '2026-02-01T00:00:00Z',
      currentPeriodStart: '2026-10-01T00:00:00Z',
      currentPeriodEnd: '2026-11-01T00:00:00Z',
      nextRenewal: '2026-11-01',
      autoRenew: true,
      daysRemaining: 1,
    },
    {
      id: 'sub_003',
      customerId: 'cust_03',
      planId: 'plan_growth_yr',
      quantity: 10,
      billingCycle: 'annual',
      unitPrice: 2990,
      seatsAmount: 0,
      amount: 2990,
      status: 'active',
      startDate: '2026-02-20T00:00:00Z',
      currentPeriodStart: '2026-02-20T00:00:00Z',
      currentPeriodEnd: '2027-02-20T00:00:00Z',
      nextRenewal: '2027-02-20',
      autoRenew: true,
      daysRemaining: 112,
    },
    {
      id: 'sub_004',
      customerId: 'cust_04',
      planId: 'plan_starter_mo',
      quantity: 1,
      billingCycle: 'monthly',
      unitPrice: 99,
      seatsAmount: 0,
      amount: 99,
      status: 'past_due',
      startDate: '2026-03-10T00:00:00Z',
      currentPeriodStart: '2026-09-10T00:00:00Z',
      currentPeriodEnd: '2026-10-10T00:00:00Z',
      nextRenewal: '2026-10-10',
      autoRenew: true,
      daysRemaining: -21,
    },
    {
      id: 'sub_005',
      customerId: 'cust_05',
      planId: 'plan_enterprise_mo',
      quantity: 40,
      billingCycle: 'monthly',
      unitPrice: 899,
      seatsAmount: 1350,
      amount: 2249,
      status: 'active',
      startDate: '2025-11-04T00:00:00Z',
      currentPeriodStart: '2026-10-04T00:00:00Z',
      currentPeriodEnd: '2026-11-04T00:00:00Z',
      nextRenewal: '2026-11-04',
      autoRenew: true,
      daysRemaining: 4,
    },
    {
      id: 'sub_006',
      customerId: 'cust_06',
      planId: 'plan_starter_mo',
      quantity: 1,
      billingCycle: 'monthly',
      unitPrice: 99,
      seatsAmount: 0,
      amount: 99,
      status: 'paused',
      startDate: '2026-01-28T00:00:00Z',
      currentPeriodStart: '2026-08-28T00:00:00Z',
      currentPeriodEnd: '2026-09-28T00:00:00Z',
      nextRenewal: '2026-11-28',
      autoRenew: false,
      pausedAt: '2026-09-25T14:00:00Z',
      daysRemaining: 28,
    },
  ],
  invoices: [
    {
      id: 'inv_1001',
      invoiceNumber: 'INV-2026-001',
      customerId: 'cust_01',
      subscriptionId: 'sub_001',
      issueDate: '2026-10-15',
      dueDate: '2026-10-29',
      status: 'paid',
      lineItems: [
        { description: 'Brightloop Growth Tier (Monthly)', quantity: 1, unitPrice: 299, amount: 299 },
        { description: 'Additional Member Seats (2 seats)', quantity: 2, unitPrice: 25, amount: 50 },
      ],
      subtotal: 349,
      discountAmount: 0,
      taxAmount: 28.79,
      total: 377.79,
      paidAt: '2026-10-16T11:24:00Z',
      paymentMethod: 'Credit Card (ending 4242)',
    },
    {
      id: 'inv_1002',
      invoiceNumber: 'INV-2026-002',
      customerId: 'cust_02',
      subscriptionId: 'sub_002',
      issueDate: '2026-10-01',
      dueDate: '2026-10-15',
      status: 'paid',
      lineItems: [
        { description: 'Brightloop Enterprise Scale (Monthly)', quantity: 1, unitPrice: 899, amount: 899 },
        { description: 'High-Concurrency Processing Pool', quantity: 1, unitPrice: 675, amount: 675 },
      ],
      subtotal: 1574,
      discountAmount: 157.40,
      taxAmount: 116.87,
      total: 1533.47,
      paidAt: '2026-10-03T16:02:00Z',
      paymentMethod: 'ACH Direct Transfer',
    },
    {
      id: 'inv_1003',
      invoiceNumber: 'INV-2026-003',
      customerId: 'cust_04',
      subscriptionId: 'sub_004',
      issueDate: '2026-09-10',
      dueDate: '2026-09-24',
      status: 'overdue',
      lineItems: [
        { description: 'Starter Tier - Edge Ingestion Service', quantity: 1, unitPrice: 99, amount: 99 },
      ],
      subtotal: 99,
      discountAmount: 0,
      taxAmount: 8.17,
      total: 107.17,
      paidAt: null,
      notes: 'Automated dunning email #3 sent. Card declined: Insufficient funds.',
    },
    {
      id: 'inv_1004',
      invoiceNumber: 'INV-2026-004',
      customerId: 'cust_05',
      subscriptionId: 'sub_005',
      issueDate: '2026-10-04',
      dueDate: '2026-10-18',
      status: 'paid',
      lineItems: [
        { description: 'Brightloop Enterprise Scale (Monthly)', quantity: 1, unitPrice: 899, amount: 899 },
        { description: 'Dedicated Private VPC Peering', quantity: 1, unitPrice: 1350, amount: 1350 },
      ],
      subtotal: 2249,
      discountAmount: 0,
      taxAmount: 185.54,
      total: 2434.54,
      paidAt: '2026-10-05T09:12:00Z',
      paymentMethod: 'Wire Transfer #WT-8941',
    },
    {
      id: 'inv_1005',
      invoiceNumber: 'INV-2026-005',
      customerId: 'cust_02',
      subscriptionId: 'sub_002',
      issueDate: '2026-10-28',
      dueDate: '2026-11-11',
      status: 'pending',
      lineItems: [
        { description: 'Brightloop Analytics Suite Addon', quantity: 1, unitPrice: 149, amount: 149 },
        { description: 'Machine Learning Churn Telemetry Engine', quantity: 1, unitPrice: 250, amount: 250 },
      ],
      subtotal: 399,
      discountAmount: 39.90,
      taxAmount: 29.63,
      total: 388.73,
      paidAt: null,
      notes: 'Scheduled for automatic ACH debit on Nov 01.',
    },
  ],
  payments: [
    {
      id: 'pay_001',
      paymentReference: 'PAY-2026-901',
      invoiceId: 'inv_1001',
      customerId: 'cust_01',
      amount: 377.79,
      currency: 'USD',
      paymentMethod: 'credit_card',
      status: 'successful',
      transactionId: 'ch_3M4oKz2eZvKYlo2C0p19G92a',
      createdAt: '2026-10-16T11:24:00Z',
    },
    {
      id: 'pay_002',
      paymentReference: 'PAY-2026-902',
      invoiceId: 'inv_1002',
      customerId: 'cust_02',
      amount: 1533.47,
      currency: 'USD',
      paymentMethod: 'bank_transfer',
      status: 'successful',
      transactionId: 'ach_18840192837190',
      createdAt: '2026-10-03T16:02:00Z',
    },
    {
      id: 'pay_003',
      paymentReference: 'PAY-2026-903',
      invoiceId: 'inv_1004',
      customerId: 'cust_05',
      amount: 2434.54,
      currency: 'USD',
      paymentMethod: 'wire',
      status: 'successful',
      transactionId: 'wire_ref_89410294',
      createdAt: '2026-10-05T09:12:00Z',
    },
    {
      id: 'pay_004',
      paymentReference: 'PAY-2026-904',
      invoiceId: 'inv_1003',
      customerId: 'cust_04',
      amount: 107.17,
      currency: 'USD',
      paymentMethod: 'credit_card',
      status: 'failed',
      failureReason: 'card_declined_insufficient_funds',
      transactionId: 'ch_3M4wLx2eZvKYlo2C99142b',
      createdAt: '2026-09-24T10:15:00Z',
    },
  ],
  quotations: [
    {
      id: 'qt_001',
      quotationNumber: 'QUO-2026-042',
      customerId: 'cust_03',
      customerName: 'PulseFlow Media',
      contactEmail: 'cbennett@pulseflow.co',
      status: 'accepted',
      items: [
        { planId: 'plan_enterprise_mo', name: 'Brightloop Enterprise Scale (Annual Contract)', quantity: 1, unitPrice: 8990, total: 8990 },
        { planId: 'plan_shield_addon', name: 'Dedicated SOC-2 Security Shield Addon', quantity: 1, unitPrice: 3990, total: 3990 },
      ],
      subtotal: 12980,
      discountCode: 'GROWTH20',
      discountAmount: 2596,
      taxRate: 8.25,
      taxAmount: 856.68,
      total: 11240.68,
      validUntil: '2026-11-30',
      notes: 'Custom annual quote with enterprise SLAs and dedicated account management.',
      createdAt: '2026-10-20T14:15:00Z',
    },
    {
      id: 'qt_002',
      quotationNumber: 'QUO-2026-043',
      customerId: 'cust_01',
      customerName: 'Acme Corporation',
      contactEmail: 'elena@acme.corp',
      status: 'sent',
      items: [
        { planId: 'plan_shield_addon', name: 'Enterprise Shield Security Upgrade', quantity: 1, unitPrice: 399, total: 399 },
      ],
      subtotal: 399,
      discountCode: null,
      discountAmount: 0,
      taxRate: 8.25,
      taxAmount: 32.92,
      total: 431.92,
      validUntil: '2026-11-15',
      notes: 'Pending procurement approval from legal.',
      createdAt: '2026-10-26T10:00:00Z',
    },
    {
      id: 'qt_003',
      quotationNumber: 'QUO-2026-044',
      customerId: 'cust_06',
      customerName: 'Zephyr Analytics',
      contactEmail: 'liam@zephyranalytics.com',
      status: 'draft',
      items: [
        { planId: 'plan_growth_mo', name: 'Growth Tier Reactivation + 5 Seats', quantity: 1, unitPrice: 424, total: 424 },
      ],
      subtotal: 424,
      discountCode: 'STARTUP50',
      discountAmount: 212,
      taxRate: 8.25,
      taxAmount: 17.49,
      total: 229.49,
      validUntil: '2026-11-20',
      notes: 'Reactivation package proposal.',
      createdAt: '2026-10-29T16:30:00Z',
    },
  ],
  discounts: [
    {
      id: 'disc_01',
      code: 'STARTUP50',
      name: 'Early-Stage Startup 50% Off',
      type: 'percentage',
      value: 50,
      currency: 'USD',
      validUntil: '2026-12-31',
      usageLimit: 100,
      usedCount: 38,
      status: 'active',
    },
    {
      id: 'disc_02',
      code: 'GROWTH20',
      name: 'Annual Commitment 20% Discount',
      type: 'percentage',
      value: 20,
      currency: 'USD',
      validUntil: '2027-06-30',
      usageLimit: 250,
      usedCount: 71,
      status: 'active',
    },
    {
      id: 'disc_03',
      code: 'WELCOME100',
      name: '$100 First Month Credit',
      type: 'fixed',
      value: 100,
      currency: 'USD',
      validUntil: '2026-11-30',
      usageLimit: 50,
      usedCount: 44,
      status: 'active',
    },
  ],
  taxes: [
    {
      id: 'tax_01',
      name: 'Standard US Sales Tax',
      rate: 8.25,
      country: 'United States',
      region: 'Texas / California',
      taxType: 'exclusive',
      status: 'active',
    },
    {
      id: 'tax_02',
      name: 'EU Cross-Border Standard VAT',
      rate: 20.0,
      country: 'European Union',
      region: 'All EU Member States',
      taxType: 'exclusive',
      status: 'active',
    },
    {
      id: 'tax_03',
      name: 'Canada GST / HST',
      rate: 5.0,
      country: 'Canada',
      region: 'Federal',
      taxType: 'exclusive',
      status: 'active',
    },
  ],
  auditLogs: [
    {
      id: 'log_001',
      action: 'INVOICE_GENERATED',
      entityType: 'invoice',
      entityId: 'INV-2026-005',
      actor: 'Megha (Admin)',
      details: 'Generated monthly billing invoice for Nexus Dynamics ($388.73)',
      timestamp: '2026-10-28T10:04:15Z',
    },
    {
      id: 'log_002',
      action: 'PAYMENT_RECONCILED',
      entityType: 'payment',
      entityId: 'PAY-2026-901',
      actor: 'Stripe Webhook Gateway',
      details: 'Reconciled payment of $377.79 for invoice INV-2026-001',
      timestamp: '2026-10-16T11:24:10Z',
    },
    {
      id: 'log_003',
      action: 'QUOTATION_ACCEPTED',
      entityType: 'quotation',
      entityId: 'QUO-2026-042',
      actor: 'Megha (Admin)',
      details: 'Accepted annual quotation for PulseFlow Media ($11,240.68)',
      timestamp: '2026-10-20T14:15:00Z',
    },
    {
      id: 'log_004',
      action: 'SUBSCRIPTION_PAUSED',
      entityType: 'subscription',
      entityId: 'sub_006',
      actor: 'Megha (Admin)',
      details: 'Customer requested temporary 60-day pause for Zephyr Analytics',
      timestamp: '2026-09-25T14:00:00Z',
    },
  ],
});

class Database {
  constructor() {
    this.data = null;
    this.pgPool = pgPool;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.data = getInitialData();
        this.save();
      }
    } catch (e) {
      console.error('Error loading DB file, initializing default dataset:', e);
      this.data = getInitialData();
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  async query(text, params) {
    if (this.pgPool) {
      return this.pgPool.query(text, params);
    }
    return null;
  }

  logAudit(action, entityType, entityId, details, actor = 'Megha (Admin)') {
    const log = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      action,
      entityType,
      entityId,
      actor,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 150) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 150);
    }
    this.save();
    return log;
  }
}

export const db = new Database();
