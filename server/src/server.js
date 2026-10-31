import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, getInitialData } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper: Calculate Dashboard Stats dynamically
function calculateDashboardStats(timeFilter = '12 months') {
  const { customers, subscriptions, invoices, payments } = db.data;

  // Active Subscriptions
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const activeSubsCount = activeSubs.length;

  // MRR: monthly amount + annual amount / 12
  const mrr = activeSubs.reduce((acc, sub) => {
    if (sub.billingCycle === 'annual') {
      return acc + (sub.amount / 12);
    }
    return acc + sub.amount;
  }, 0);

  // ARR
  const arr = mrr * 12;

  // Revenue Collected: Sum of successful payments
  const totalRevenueCollected = payments
    .filter(p => p.status === 'successful')
    .reduce((acc, p) => acc + p.amount, 0);

  // Overdue Invoices
  const overdueInvoicesList = invoices.filter(i => i.status === 'overdue');
  const overdueCount = overdueInvoicesList.length;
  const overdueAmount = overdueInvoicesList.reduce((acc, i) => acc + i.total, 0);

  // KPI comparison percentages (calm realistic B2B metrics)
  const kpis = {
    activeSubscriptions: {
      value: activeSubsCount,
      changePercent: 12.5,
      isPositive: true,
      periodLabel: 'vs last month',
      sparkline: [28, 31, 33, 35, 38, 42, 45, 48],
    },
    mrr: {
      value: Math.round(mrr),
      changePercent: 8.2,
      isPositive: true,
      periodLabel: 'vs last month',
      sparkline: [4100, 4350, 4600, 4920, 5100, 5450, 5820, Math.round(mrr)],
    },
    revenueCollected: {
      value: Math.round(totalRevenueCollected),
      changePercent: 14.8,
      isPositive: true,
      periodLabel: 'vs last month',
      sparkline: [2100, 2400, 3100, 3600, 3900, 4200, 4345, Math.round(totalRevenueCollected)],
    },
    overdueInvoices: {
      value: overdueCount,
      amount: Math.round(overdueAmount),
      changePercent: -25.0,
      isPositive: true, // Decreasing overdue is good
      periodLabel: 'vs last month',
      sparkline: [3, 2, 4, 3, 2, 2, 1, overdueCount],
    },
  };

  // Subscription Status Donut Chart
  const statusCounts = {
    active: subscriptions.filter(s => s.status === 'active').length,
    trialing: subscriptions.filter(s => s.status === 'trialing').length,
    paused: subscriptions.filter(s => s.status === 'paused').length,
    cancelled: subscriptions.filter(s => s.status === 'cancelled' || s.status === 'past_due').length,
  };
  const totalSubs = subscriptions.length;
  const donutData = [
    { name: 'Active', count: statusCounts.active, percentage: Math.round((statusCounts.active / totalSubs) * 100), color: '#5145E5' },
    { name: 'Pending / Trial', count: statusCounts.trialing, percentage: Math.round((statusCounts.trialing / totalSubs) * 100), color: '#818CF8' },
    { name: 'Paused', count: statusCounts.paused, percentage: Math.round((statusCounts.paused / totalSubs) * 100), color: '#F59E0B' },
    { name: 'Cancelled / Past Due', count: statusCounts.cancelled, percentage: Math.round((statusCounts.cancelled / totalSubs) * 100), color: '#F43F5E' },
  ];

  // Revenue Overview Chart Data
  let revenueChart = [];
  if (timeFilter === '7 days') {
    revenueChart = [
      { period: 'Mon', collected: 780, outstanding: 120, total: 900 },
      { period: 'Tue', collected: 1240, outstanding: 150, total: 1390 },
      { period: 'Wed', collected: 950, outstanding: 80, total: 1030 },
      { period: 'Thu', collected: 1450, outstanding: 210, total: 1660 },
      { period: 'Fri', collected: 1890, outstanding: 340, total: 2230 },
      { period: 'Sat', collected: 620, outstanding: 50, total: 670 },
      { period: 'Sun', collected: 810, outstanding: 95, total: 905 },
    ];
  } else if (timeFilter === '30 days') {
    revenueChart = [
      { period: 'Week 1', collected: 2840, outstanding: 450, total: 3290 },
      { period: 'Week 2', collected: 3620, outstanding: 390, total: 4010 },
      { period: 'Week 3', collected: 4190, outstanding: 580, total: 4770 },
      { period: 'Week 4', collected: 4850, outstanding: 610, total: 5460 },
    ];
  } else if (timeFilter === '3 months') {
    revenueChart = [
      { period: 'August', collected: 12400, outstanding: 1450, total: 13850 },
      { period: 'September', collected: 14800, outstanding: 1200, total: 16000 },
      { period: 'October', collected: 17950, outstanding: 1890, total: 19840 },
    ];
  } else {
    // 12 months default
    revenueChart = [
      { period: 'Nov', collected: 8400, outstanding: 900, total: 9300 },
      { period: 'Dec', collected: 9600, outstanding: 1100, total: 10700 },
      { period: 'Jan', collected: 10800, outstanding: 1300, total: 12100 },
      { period: 'Feb', collected: 11500, outstanding: 1200, total: 12700 },
      { period: 'Mar', collected: 12900, outstanding: 1400, total: 14300 },
      { period: 'Apr', collected: 13800, outstanding: 1550, total: 15350 },
      { period: 'May', collected: 14600, outstanding: 1600, total: 16200 },
      { period: 'Jun', collected: 15200, outstanding: 1350, total: 16550 },
      { period: 'Jul', collected: 16100, outstanding: 1420, total: 17520 },
      { period: 'Aug', collected: 16900, outstanding: 1500, total: 18400 },
      { period: 'Sep', collected: 17800, outstanding: 1200, total: 19000 },
      { period: 'Oct', collected: 19450, outstanding: 1680, total: 21130 },
    ];
  }

  // Recent Invoices: enriched with customer details
  const recentInvoices = invoices.slice(0, 6).map(inv => {
    const cust = customers.find(c => c.id === inv.customerId);
    return {
      ...inv,
      customerName: cust ? cust.name : 'Unknown Customer',
      customerEmail: cust ? cust.email : '',
      customerAvatar: cust ? cust.avatar : '',
    };
  });

  // Upcoming Renewals
  const upcomingRenewals = subscriptions
    .filter(s => s.status === 'active' || s.status === 'past_due')
    .sort((a, b) => new Date(a.nextRenewal) - new Date(b.nextRenewal))
    .slice(0, 5)
    .map(sub => {
      const cust = customers.find(c => c.id === sub.customerId);
      const plan = db.data.plans.find(p => p.id === sub.planId);
      return {
        id: sub.id,
        customerId: sub.customerId,
        customerName: cust ? cust.name : 'Unknown Customer',
        customerAvatar: cust ? cust.avatar : '',
        planName: plan ? plan.name : 'Custom Plan',
        renewalDate: sub.nextRenewal,
        amount: sub.amount,
        billingCycle: sub.billingCycle,
        daysRemaining: sub.daysRemaining,
        status: sub.status,
      };
    });

  return {
    kpis,
    revenueChart,
    subscriptionDonut: {
      data: donutData,
      total: totalSubs,
    },
    recentInvoices,
    upcomingRenewals,
    mrr: Math.round(mrr),
    arr: Math.round(arr),
  };
}

// ---------------- API ROUTES ----------------

// GET /api/dashboard/stats
app.get('/api/dashboard/stats', (req, res) => {
  const { timeFilter } = req.query;
  const stats = calculateDashboardStats(timeFilter || '12 months');
  res.json(stats);
});

// GET /api/search - Global search across customers, subscriptions, and invoices
app.get('/api/search', (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  if (!query) {
    return res.json({ customers: [], subscriptions: [], invoices: [] });
  }

  const customers = db.data.customers.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.email.toLowerCase().includes(query) ||
    c.company.toLowerCase().includes(query)
  ).slice(0, 5);

  const invoices = db.data.invoices.filter(i =>
    i.invoiceNumber.toLowerCase().includes(query) ||
    i.total.toString().includes(query) ||
    i.status.toLowerCase().includes(query)
  ).slice(0, 5);

  const subscriptions = db.data.subscriptions.filter(s =>
    s.id.toLowerCase().includes(query) ||
    s.status.toLowerCase().includes(query)
  ).slice(0, 5);

  res.json({ customers, invoices, subscriptions });
});

// CUSTOMERS
app.get('/api/customers', (req, res) => {
  const { search, status, sort } = req.query;
  let list = [...db.data.customers];

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.company.toLowerCase().includes(q));
  }
  if (status && status !== 'all') {
    list = list.filter(c => c.status === status);
  }
  if (sort === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'name_desc') list.sort((a, b) => b.name.localeCompare(a.name));
  if (sort === 'spent_desc') list.sort((a, b) => b.totalSpent - a.totalSpent);
  if (sort === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(list);
});

app.get('/api/customers/:id', (req, res) => {
  const customer = db.data.customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const subscriptions = db.data.subscriptions.filter(s => s.customerId === customer.id);
  const invoices = db.data.invoices.filter(i => i.customerId === customer.id);
  const payments = db.data.payments.filter(p => p.customerId === customer.id);

  res.json({ ...customer, subscriptions, invoices, payments });
});

app.post('/api/customers', (req, res) => {
  const { name, contactName, email, phone, company, address } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  const newCustomer = {
    id: `cust_${Date.now().toString(36)}`,
    name,
    contactName: contactName || name,
    email,
    phone: phone || '',
    company: company || name,
    status: 'active',
    balance: 0,
    totalSpent: 0,
    avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80`,
    address: address || '',
    createdAt: new Date().toISOString(),
  };

  db.data.customers.unshift(newCustomer);
  db.logAudit('CUSTOMER_CREATED', 'customer', newCustomer.id, `Created customer: ${newCustomer.name} (${newCustomer.email})`);
  db.save();
  res.status(201).json(newCustomer);
});

app.put('/api/customers/:id', (req, res) => {
  const index = db.data.customers.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Customer not found' });

  db.data.customers[index] = { ...db.data.customers[index], ...req.body };
  db.logAudit('CUSTOMER_UPDATED', 'customer', req.params.id, `Updated details for customer ${db.data.customers[index].name}`);
  db.save();
  res.json(db.data.customers[index]);
});

app.delete('/api/customers/:id', (req, res) => {
  const customer = db.data.customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  db.data.customers = db.data.customers.filter(c => c.id !== req.params.id);
  db.logAudit('CUSTOMER_DELETED', 'customer', req.params.id, `Deleted customer: ${customer.name}`);
  db.save();
  res.json({ message: 'Customer deleted successfully' });
});

// PRODUCTS & PLANS
app.get('/api/products', (req, res) => {
  res.json(db.data.products);
});

app.post('/api/products', (req, res) => {
  const { name, description, category, features } = req.body;
  if (!name) return res.status(400).json({ error: 'Product name is required' });

  const newProduct = {
    id: `prod_${Date.now().toString(36)}`,
    name,
    description: description || '',
    category: category || 'Software',
    status: 'active',
    icon: 'Package',
    features: Array.isArray(features) ? features : [],
  };

  db.data.products.push(newProduct);
  db.logAudit('PRODUCT_CREATED', 'product', newProduct.id, `Created product ${newProduct.name}`);
  db.save();
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
  const index = db.data.products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });

  db.data.products[index] = { ...db.data.products[index], ...req.body };
  db.logAudit('PRODUCT_UPDATED', 'product', req.params.id, `Updated product ${db.data.products[index].name}`);
  db.save();
  res.json(db.data.products[index]);
});

app.get('/api/plans', (req, res) => {
  res.json(db.data.plans);
});

app.post('/api/plans', (req, res) => {
  const { productId, name, billingInterval, price, seatBased, pricePerSeat, features } = req.body;
  if (!productId || !name || price === undefined) return res.status(400).json({ error: 'Missing required plan fields' });

  const newPlan = {
    id: `plan_${Date.now().toString(36)}`,
    productId,
    name,
    billingInterval: billingInterval || 'monthly',
    price: Number(price),
    currency: 'USD',
    seatBased: Boolean(seatBased),
    pricePerSeat: Number(pricePerSeat || 0),
    activeSubscribers: 0,
    features: Array.isArray(features) ? features : [],
  };

  db.data.plans.push(newPlan);
  db.logAudit('PLAN_CREATED', 'plan', newPlan.id, `Created plan ${newPlan.name} ($${newPlan.price}/${newPlan.billingInterval})`);
  db.save();
  res.status(201).json(newPlan);
});

app.put('/api/plans/:id', (req, res) => {
  const index = db.data.plans.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Plan not found' });

  db.data.plans[index] = { ...db.data.plans[index], ...req.body };
  db.logAudit('PLAN_UPDATED', 'plan', req.params.id, `Updated plan ${db.data.plans[index].name}`);
  db.save();
  res.json(db.data.plans[index]);
});

// QUOTATIONS
app.get('/api/quotations', (req, res) => {
  res.json(db.data.quotations);
});

app.post('/api/quotations', (req, res) => {
  const { customerId, items, discountCode, taxRate, notes, validUntil } = req.body;
  const customer = db.data.customers.find(c => c.id === customerId);
  if (!customer) return res.status(400).json({ error: 'Valid customer is required' });

  const quoteNumber = `QUO-2026-0${db.data.quotations.length + 45}`;
  const subtotal = (items || []).reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);

  // Discount calculation
  let discountAmount = 0;
  if (discountCode) {
    const disc = db.data.discounts.find(d => d.code === discountCode && d.status === 'active');
    if (disc) {
      discountAmount = disc.type === 'percentage' ? (subtotal * (disc.value / 100)) : disc.value;
      disc.usedCount += 1;
    }
  }

  // Tax calculation
  const effectiveTaxRate = taxRate !== undefined ? Number(taxRate) : 8.25;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Number(((taxableAmount * effectiveTaxRate) / 100).toFixed(2));
  const total = Number((taxableAmount + taxAmount).toFixed(2));

  const newQuote = {
    id: `qt_${Date.now().toString(36)}`,
    quotationNumber: quoteNumber,
    customerId,
    customerName: customer.name,
    contactEmail: customer.email,
    status: 'draft',
    items: items || [],
    subtotal,
    discountCode: discountCode || null,
    discountAmount,
    taxRate: effectiveTaxRate,
    taxAmount,
    total,
    validUntil: validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.data.quotations.unshift(newQuote);
  db.logAudit('QUOTATION_CREATED', 'quotation', newQuote.id, `Created quotation ${quoteNumber} for ${customer.name} ($${total})`);
  db.save();
  res.status(201).json(newQuote);
});

// Accept and Convert Quotation to Active Subscription + Invoice
app.post('/api/quotations/:id/convert', (req, res) => {
  const quote = db.data.quotations.find(q => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  quote.status = 'accepted';

  // Create Subscription
  const primaryItem = quote.items[0] || { planId: 'plan_growth_mo', unitPrice: 299, quantity: 1 };
  const newSubId = `sub_${Date.now().toString(36)}`;
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 86400000);

  const newSub = {
    id: newSubId,
    customerId: quote.customerId,
    planId: primaryItem.planId,
    quotationId: quote.id,
    quantity: primaryItem.quantity || 1,
    billingCycle: 'monthly',
    unitPrice: primaryItem.unitPrice,
    seatsAmount: 0,
    amount: quote.total,
    status: 'active',
    startDate: now.toISOString(),
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: nextMonth.toISOString(),
    nextRenewal: nextMonth.toISOString().split('T')[0],
    autoRenew: true,
    daysRemaining: 30,
  };
  db.data.subscriptions.unshift(newSub);

  // Generate initial Invoice
  const newInvId = `inv_${Date.now().toString(36)}`;
  const invoiceNumber = `INV-2026-0${db.data.invoices.length + 6}`;
  const newInvoice = {
    id: newInvId,
    invoiceNumber,
    customerId: quote.customerId,
    subscriptionId: newSubId,
    issueDate: now.toISOString().split('T')[0],
    dueDate: new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0],
    status: 'pending',
    lineItems: quote.items.map(it => ({
      description: it.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: it.total,
    })),
    subtotal: quote.subtotal,
    discountAmount: quote.discountAmount,
    taxAmount: quote.taxAmount,
    total: quote.total,
    paidAt: null,
    notes: `Generated automatically upon acceptance of Quotation ${quote.quotationNumber}.`,
  };
  db.data.invoices.unshift(newInvoice);

  db.logAudit('QUOTATION_CONVERTED', 'quotation', quote.id, `Converted quotation ${quote.quotationNumber} into subscription ${newSubId} & invoice ${invoiceNumber}`);
  db.save();

  res.json({ message: 'Quotation converted successfully', quotation: quote, subscription: newSub, invoice: newInvoice });
});

// Update quotation status
app.put('/api/quotations/:id', (req, res) => {
  const quote = db.data.quotations.find(q => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  Object.assign(quote, req.body);
  db.logAudit('QUOTATION_UPDATED', 'quotation', quote.id, `Updated quotation ${quote.quotationNumber} (status: ${quote.status})`);
  db.save();
  res.json(quote);
});

// SUBSCRIPTIONS
app.get('/api/subscriptions', (req, res) => {
  const { status, customerId } = req.query;
  let list = db.data.subscriptions.map(sub => {
    const cust = db.data.customers.find(c => c.id === sub.customerId);
    const plan = db.data.plans.find(p => p.id === sub.planId);
    return {
      ...sub,
      customerName: cust ? cust.name : 'Unknown Customer',
      customerEmail: cust ? cust.email : '',
      customerAvatar: cust ? cust.avatar : '',
      planName: plan ? plan.name : 'Custom Plan',
    };
  });

  if (status && status !== 'all') {
    list = list.filter(s => s.status === status);
  }
  if (customerId) {
    list = list.filter(s => s.customerId === customerId);
  }

  res.json(list);
});

app.post('/api/subscriptions', (req, res) => {
  const { customerId, planId, billingCycle, quantity } = req.body;
  const customer = db.data.customers.find(c => c.id === customerId);
  const plan = db.data.plans.find(p => p.id === planId);
  if (!customer || !plan) return res.status(400).json({ error: 'Valid customer and plan are required' });

  const qty = Number(quantity || 1);
  const basePrice = plan.price;
  const seatsCost = plan.seatBased ? Math.max(0, qty - 1) * plan.pricePerSeat : 0;
  const totalAmount = basePrice + seatsCost;

  const now = new Date();
  const days = billingCycle === 'annual' ? 365 : 30;
  const periodEnd = new Date(now.getTime() + days * 86400000);

  const newSub = {
    id: `sub_${Date.now().toString(36)}`,
    customerId,
    planId,
    quantity: qty,
    billingCycle: billingCycle || plan.billingInterval,
    unitPrice: basePrice,
    seatsAmount: seatsCost,
    amount: totalAmount,
    status: 'active',
    startDate: now.toISOString(),
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    nextRenewal: periodEnd.toISOString().split('T')[0],
    autoRenew: true,
    daysRemaining: days,
  };

  db.data.subscriptions.unshift(newSub);
  plan.activeSubscribers += 1;

  // Automatically generate invoice for the subscription start
  const newInvoice = {
    id: `inv_${Date.now().toString(36)}`,
    invoiceNumber: `INV-2026-0${db.data.invoices.length + 7}`,
    customerId,
    subscriptionId: newSub.id,
    issueDate: now.toISOString().split('T')[0],
    dueDate: new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0],
    status: 'pending',
    lineItems: [
      { description: `${plan.name} (${newSub.billingCycle})`, quantity: 1, unitPrice: basePrice, amount: basePrice },
      ...(seatsCost > 0 ? [{ description: `Additional Member Seats (${qty - 1} seats)`, quantity: qty - 1, unitPrice: plan.pricePerSeat, amount: seatsCost }] : []),
    ],
    subtotal: totalAmount,
    discountAmount: 0,
    taxAmount: Number((totalAmount * 0.0825).toFixed(2)),
    total: Number((totalAmount * 1.0825).toFixed(2)),
    paidAt: null,
  };
  db.data.invoices.unshift(newInvoice);

  db.logAudit('SUBSCRIPTION_CREATED', 'subscription', newSub.id, `Created subscription for ${customer.name} ($${totalAmount}/${newSub.billingCycle})`);
  db.save();
  res.status(201).json(newSub);
});

// Pause / Resume / Cancel subscription actions
app.post('/api/subscriptions/:id/pause', (req, res) => {
  const sub = db.data.subscriptions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  sub.status = 'paused';
  sub.pausedAt = new Date().toISOString();
  db.logAudit('SUBSCRIPTION_PAUSED', 'subscription', sub.id, `Paused subscription ${sub.id}`);
  db.save();
  res.json({ message: 'Subscription paused', subscription: sub });
});

app.post('/api/subscriptions/:id/resume', (req, res) => {
  const sub = db.data.subscriptions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  sub.status = 'active';
  sub.pausedAt = null;
  db.logAudit('SUBSCRIPTION_RESUMED', 'subscription', sub.id, `Resumed subscription ${sub.id}`);
  db.save();
  res.json({ message: 'Subscription resumed', subscription: sub });
});

app.post('/api/subscriptions/:id/cancel', (req, res) => {
  const sub = db.data.subscriptions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  sub.status = 'cancelled';
  sub.cancelledAt = new Date().toISOString();
  sub.cancelReason = req.body.reason || 'Requested by customer';

  const plan = db.data.plans.find(p => p.id === sub.planId);
  if (plan && plan.activeSubscribers > 0) plan.activeSubscribers -= 1;

  db.logAudit('SUBSCRIPTION_CANCELLED', 'subscription', sub.id, `Cancelled subscription ${sub.id}: ${sub.cancelReason}`);
  db.save();
  res.json({ message: 'Subscription cancelled', subscription: sub });
});

// INVOICES
app.get('/api/invoices', (req, res) => {
  const { status, customerId } = req.query;
  let list = db.data.invoices.map(inv => {
    const cust = db.data.customers.find(c => c.id === inv.customerId);
    return {
      ...inv,
      customerName: cust ? cust.name : 'Unknown Customer',
      customerEmail: cust ? cust.email : '',
      customerAvatar: cust ? cust.avatar : '',
      customerCompany: cust ? cust.company : '',
      customerAddress: cust ? cust.address : '',
    };
  });

  if (status && status !== 'all') {
    list = list.filter(i => i.status === status);
  }
  if (customerId) {
    list = list.filter(i => i.customerId === customerId);
  }

  res.json(list);
});

app.get('/api/invoices/:id', (req, res) => {
  const invoice = db.data.invoices.find(i => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const customer = db.data.customers.find(c => c.id === invoice.customerId);
  const payment = db.data.payments.find(p => p.invoiceId === invoice.id);
  res.json({ ...invoice, customer, payment, companySettings: db.data.settings });
});

// PAYMENTS (Idempotent: prevents recording payment twice for same invoice)
app.get('/api/payments', (req, res) => {
  const list = db.data.payments.map(p => {
    const cust = db.data.customers.find(c => c.id === p.customerId);
    const inv = db.data.invoices.find(i => i.id === p.invoiceId);
    return {
      ...p,
      customerName: cust ? cust.name : 'Unknown Customer',
      customerEmail: cust ? cust.email : '',
      invoiceNumber: inv ? inv.invoiceNumber : 'N/A',
    };
  });
  res.json(list);
});

app.post('/api/payments', (req, res) => {
  const { invoiceId, paymentMethod, amount } = req.body;
  const invoice = db.data.invoices.find(i => i.id === invoiceId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  // Idempotency check: Cannot pay an already paid invoice
  if (invoice.status === 'paid') {
    return res.status(409).json({ error: 'Invoice has already been marked as paid. Duplicate payments are prevented.' });
  }

  const paymentAmount = amount ? Number(amount) : invoice.total;
  const newPayment = {
    id: `pay_${Date.now().toString(36)}`,
    paymentReference: `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    invoiceId: invoice.id,
    customerId: invoice.customerId,
    amount: paymentAmount,
    currency: 'USD',
    paymentMethod: paymentMethod || 'credit_card',
    status: 'successful',
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    createdAt: new Date().toISOString(),
  };

  db.data.payments.unshift(newPayment);

  // Update invoice status
  invoice.status = 'paid';
  invoice.paidAt = newPayment.createdAt;
  invoice.paymentMethod = paymentMethod;

  // Update customer total spent
  const customer = db.data.customers.find(c => c.id === invoice.customerId);
  if (customer) {
    customer.totalSpent += paymentAmount;
    if (customer.balance >= paymentAmount) {
      customer.balance -= paymentAmount;
    }
  }

  db.logAudit('PAYMENT_RECORDED', 'payment', newPayment.id, `Recorded successful payment of $${paymentAmount} for invoice ${invoice.invoiceNumber}`);
  db.save();

  res.status(201).json({ message: 'Payment recorded and reconciled successfully', payment: newPayment, invoice });
});

// DISCOUNTS & TAXES
app.get('/api/discounts', (req, res) => res.json(db.data.discounts));
app.post('/api/discounts', (req, res) => {
  const { code, name, type, value, validUntil, usageLimit } = req.body;
  if (!code || !value) return res.status(400).json({ error: 'Code and value are required' });

  const newDisc = {
    id: `disc_${Date.now().toString(36)}`,
    code: code.toUpperCase().trim(),
    name: name || code,
    type: type || 'percentage',
    value: Number(value),
    currency: 'USD',
    validUntil: validUntil || '2027-12-31',
    usageLimit: Number(usageLimit || 100),
    usedCount: 0,
    status: 'active',
  };
  db.data.discounts.push(newDisc);
  db.logAudit('DISCOUNT_CREATED', 'discount', newDisc.id, `Created discount code ${newDisc.code}`);
  db.save();
  res.status(201).json(newDisc);
});

app.get('/api/taxes', (req, res) => res.json(db.data.taxes));
app.post('/api/taxes', (req, res) => {
  const { name, rate, country, region } = req.body;
  if (!name || rate === undefined) return res.status(400).json({ error: 'Name and rate are required' });

  const newTax = {
    id: `tax_${Date.now().toString(36)}`,
    name,
    rate: Number(rate),
    country: country || 'Global',
    region: region || 'Default',
    taxType: 'exclusive',
    status: 'active',
  };
  db.data.taxes.push(newTax);
  db.logAudit('TAX_RULE_CREATED', 'tax', newTax.id, `Created tax rule: ${newTax.name} (${newTax.rate}%)`);
  db.save();
  res.status(201).json(newTax);
});

// REPORTS & ANALYTICS
app.get('/api/reports', (req, res) => {
  const { subscriptions, invoices, payments, customers } = db.data;

  // Monthly revenue trend (historical 6 months)
  const monthlyTrends = [
    { month: 'May 2026', mrr: 14600, arr: 175200, growth: 7.2, churn: 1.1, newSubs: 14, expansions: 6 },
    { month: 'Jun 2026', mrr: 15200, arr: 182400, growth: 4.1, churn: 0.9, newSubs: 12, expansions: 8 },
    { month: 'Jul 2026', mrr: 16100, arr: 193200, growth: 5.9, churn: 1.2, newSubs: 18, expansions: 7 },
    { month: 'Aug 2026', mrr: 16900, arr: 202800, growth: 5.0, churn: 0.8, newSubs: 15, expansions: 9 },
    { month: 'Sep 2026', mrr: 17800, arr: 213600, growth: 5.3, churn: 0.7, newSubs: 19, expansions: 11 },
    { month: 'Oct 2026', mrr: 19450, arr: 233400, growth: 9.2, churn: 0.6, newSubs: 24, expansions: 14 },
  ];

  // Churn & Retention breakdown
  const churnBreakdown = {
    grossChurnRate: '0.6%',
    netRetentionRate: '118.4%',
    quickRatio: '4.8',
    customerLifetimeValue: '$18,400',
    averageRevenuePerAccount: '$940 / mo',
  };

  // Renewal forecast for next 30 days
  const renewalForecast = subscriptions
    .filter(s => s.status === 'active')
    .map(s => {
      const cust = customers.find(c => c.id === s.customerId);
      return {
        id: s.id,
        customerName: cust ? cust.name : 'Unknown',
        amount: s.amount,
        renewalDate: s.nextRenewal,
        cycle: s.billingCycle,
        probability: '98%',
      };
    });

  res.json({
    monthlyTrends,
    churnBreakdown,
    renewalForecast,
    totalCustomers: customers.length,
    activeSubscribers: subscriptions.filter(s => s.status === 'active').length,
    collectionRate: '97.4%',
  });
});

// USERS & SETTINGS
app.get('/api/users', (req, res) => res.json(db.data.users));
app.post('/api/users', (req, res) => {
  const { name, email, role, department } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  const newUser = {
    id: `usr_${Date.now().toString(36)}`,
    name,
    email,
    role: role || 'Support Staff',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    status: 'active',
    department: department || 'Operations',
    lastLogin: 'Never',
  };
  db.data.users.push(newUser);
  db.logAudit('USER_INVITED', 'user', newUser.id, `Invited user ${newUser.name} with role ${newUser.role}`);
  db.save();
  res.status(201).json(newUser);
});

app.get('/api/settings', (req, res) => res.json(db.data.settings));
app.put('/api/settings', (req, res) => {
  db.data.settings = { ...db.data.settings, ...req.body };
  db.logAudit('SETTINGS_UPDATED', 'settings', 'global', `Updated company settings`);
  db.save();
  res.json(db.data.settings);
});

// AUDIT LOGS
app.get('/api/audit-logs', (req, res) => {
  res.json(db.data.auditLogs);
});

// SCHEDULED BILLING CYCLE RUNNER (Automated renewal invoices and dunning check)
app.post('/api/billing/run-scheduled-cycle', (req, res) => {
  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0];
  let renewedCount = 0;
  let overdueCount = 0;

  // 1. Check for upcoming / due renewals that need invoices
  db.data.subscriptions.forEach(sub => {
    if (sub.status === 'active' && sub.nextRenewal <= currentDateStr && sub.autoRenew) {
      // Create new period invoice
      const invoiceNumber = `INV-2026-0${db.data.invoices.length + 10}`;
      const newInvoice = {
        id: `inv_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
        invoiceNumber,
        customerId: sub.customerId,
        subscriptionId: sub.id,
        issueDate: currentDateStr,
        dueDate: new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0],
        status: 'pending',
        lineItems: [
          { description: `Subscription Renewal (${sub.billingCycle})`, quantity: sub.quantity, unitPrice: sub.unitPrice, amount: sub.amount },
        ],
        subtotal: sub.amount,
        discountAmount: 0,
        taxAmount: Number((sub.amount * 0.0825).toFixed(2)),
        total: Number((sub.amount * 1.0825).toFixed(2)),
        paidAt: null,
      };
      db.data.invoices.unshift(newInvoice);

      // Advance subscription period
      const days = sub.billingCycle === 'annual' ? 365 : 30;
      const nextDate = new Date(now.getTime() + days * 86400000);
      sub.currentPeriodStart = now.toISOString();
      sub.currentPeriodEnd = nextDate.toISOString();
      sub.nextRenewal = nextDate.toISOString().split('T')[0];
      sub.daysRemaining = days;
      renewedCount++;
    }
  });

  // 2. Check for overdue invoices past due date
  db.data.invoices.forEach(inv => {
    if (inv.status === 'pending' && inv.dueDate < currentDateStr) {
      inv.status = 'overdue';
      overdueCount++;
    }
  });

  db.logAudit('SCHEDULED_CYCLE_RAN', 'billing_engine', 'engine', `Billing cycle executed: ${renewedCount} renewals invoiced, ${overdueCount} marked overdue.`);
  db.save();

  res.json({
    message: 'Billing cycle processed successfully',
    renewalsProcessed: renewedCount,
    invoicesMarkedOverdue: overdueCount,
    timestamp: now.toISOString(),
  });
});

// Reset demo data to pristine state
app.post('/api/admin/reset-data', (req, res) => {
  db.data = getInitialData();
  db.save();
  res.json({ message: 'Demo data reset successfully' });
});

app.listen(PORT, () => {
  console.log(`SubscriptIQ Backend Server running on port ${PORT}`);
});
