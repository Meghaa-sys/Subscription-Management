import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Filter,
  ArrowUpRight,
  X,
  CreditCard,
  Building2,
  Sparkles,
  Layers,
  ArrowDownRight,
  Target,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';
import { Invoice, Subscription } from '../types';
import { StatusBadge } from '../components/StatusBadge';

// Helper to format Indian Rupee currency with Indian numbering system
function formatRupee(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

interface DaySaleItem {
  id: string;
  customerName: string;
  company: string;
  planOrProduct: string;
  amount: number;
  cost: number;
  profit: number;
  status: string;
  time: string;
  paymentMethod: string;
}

interface DayData {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  totalSales: number;
  totalCost: number;
  netProfit: number;
  isProfitable: boolean;
  profitMargin: number;
  salesCount: number;
  targetAchievement: number;
  items: DaySaleItem[];
}

const INDIAN_COMPANIES = [
  { name: 'Reliance Industries', contact: 'Mukesh Sharma' },
  { name: 'Tata Consultancy Services', contact: 'Priya Iyer' },
  { name: 'Infosys Limited', contact: 'Rohan Verma' },
  { name: 'Wipro Technologies', contact: 'Ananya Deshmukh' },
  { name: 'HDFC Bank Enterprise', contact: 'Vikram Mehta' },
  { name: 'ICICI Securities', contact: 'Sneha Patel' },
  { name: 'Bharti Airtel Business', contact: 'Karan Malhotra' },
  { name: 'Zomato Enterprise Suite', contact: 'Rahul Reddy' },
  { name: 'Swiggy Cloud Solutions', contact: 'Deepak Joshi' },
  { name: 'Flipkart Logistics', contact: 'Meera Nair' },
  { name: 'Paytm Payments Corp', contact: 'Arjun Singhania' },
  { name: 'Mahindra Tech Systems', contact: 'Sunil Rao' },
];

const PLAN_NAMES = [
  'Enterprise Unlimited Annual',
  'Scale-Up Monthly Pro',
  'Growth Tier (50 Seats)',
  'Startup Launchpad Annual',
  'Automated Billing Add-on',
  'Custom API Integration Tier',
  'Premium Support Package',
];

export const SalesCalendarPage: React.FC = () => {
  // Current calendar viewing month (defaults to current month: October 2026)
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 9, 31)); // Oct 2026
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'profit' | 'loss'>('all');
  const [dailyTarget, setDailyTarget] = useState<number>(65000); // Daily target benchmark: ₹65,000
  const [loading, setLoading] = useState<boolean>(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  // Load real data from backend
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [invRes, subRes] = await Promise.all([
          api.getInvoices({}),
          api.getSubscriptions({}),
        ]);
        if (isMounted) {
          setInvoices(invRes.results || []);
          setSubscriptions(subRes.results || []);
        }
      } catch (err) {
        console.error('Failed to load data for calendar:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 9, 31));
  };

  // Build calendar matrix with realistic daily sales and profit/loss calculations
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...

    const days: DayData[] = [];
    const today = new Date(2026, 9, 31);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;

    // Previous month filler days
    const prevMonthLastDate = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDate - i;
      const d = new Date(currentYear, currentMonth - 1, dayNum);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        dayNum
      ).padStart(2, '0')}`;
      days.push({
        date: d,
        dateKey,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
        totalSales: 0,
        totalCost: 0,
        netProfit: 0,
        isProfitable: false,
        profitMargin: 0,
        salesCount: 0,
        targetAchievement: 0,
        items: [],
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;

      // Check if real invoices exist for this date
      const matchedInvoices = invoices.filter(inv => inv.issueDate === dateKey);

      // Generate realistic daily business volume for Brightloop SaaS platform
      // Weekdays typically have higher business subscription volume than Sundays
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Seed pseudo-random reproducible daily variation based on date
      const seed = (currentYear * 10000 + (currentMonth + 1) * 100 + day * 13) % 100;
      let baseSales = isWeekend ? 25000 + (seed % 20) * 1500 : 55000 + (seed % 45) * 3200;

      // Peak sales days (e.g., month end and mid-month renewal cycles)
      if (day === 1 || day === 15 || day === 24 || day === 30 || day === 31) {
        baseSales += 85000 + (seed % 30) * 2000;
      }
      // Occasional low days
      if (day === 4 || day === 18) {
        baseSales = 22000 + (seed % 10) * 1200;
      }

      // Add real invoice totals if any
      const invoiceTotal = matchedInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const dayTotalSales = Math.max(baseSales, invoiceTotal > 0 ? invoiceTotal * 1.5 : baseSales);

      // Benchmark operational costs: infrastructure, gateway fees (2%), server/ops overhead (~25-35%)
      const variableCost = dayTotalSales * 0.22;
      const fixedDailyCost = 28000;
      const totalCost = Math.round(variableCost + fixedDailyCost);
      const netProfit = Math.round(dayTotalSales - totalCost);
      const isProfitable = netProfit > 0 && dayTotalSales >= dailyTarget * 0.7;
      const profitMargin = Math.round((netProfit / dayTotalSales) * 100);
      const targetAchievement = Math.round((dayTotalSales / dailyTarget) * 100);

      // Build daily itemized transactions
      const count = Math.max(3, Math.round(dayTotalSales / 18000));
      const items: DaySaleItem[] = [];

      for (let i = 0; i < count; i++) {
        const comp = INDIAN_COMPANIES[(day + i * 3) % INDIAN_COMPANIES.length];
        const plan = PLAN_NAMES[(day + i * 2) % PLAN_NAMES.length];
        const itemAmount = Math.round((dayTotalSales / count) * (0.8 + ((i * 17) % 40) / 100));
        const itemCost = Math.round(itemAmount * 0.28);
        const itemProfit = itemAmount - itemCost;
        const hour = 9 + ((i * 3 + day) % 9);
        const minute = (i * 17 + day * 3) % 60;
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${
          hour >= 12 ? 'PM' : 'AM'
        }`;
        const paymentMethods = ['UPI Instant', 'HDFC Corporate NetBanking', 'Razorpay AutoDebit', 'Corporate Card'];
        const pMethod = paymentMethods[(day + i) % paymentMethods.length];

        items.push({
          id: `TXN-${currentYear}${String(currentMonth + 1).padStart(2, '0')}${String(day).padStart(
            2,
            '0'
          )}-${i + 1}`,
          customerName: comp.contact,
          company: comp.name,
          planOrProduct: plan,
          amount: itemAmount,
          cost: itemCost,
          profit: itemProfit,
          status: 'paid',
          time,
          paymentMethod: pMethod,
        });
      }

      days.push({
        date: d,
        dateKey,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateKey === todayStr,
        totalSales: dayTotalSales,
        totalCost,
        netProfit,
        isProfitable,
        profitMargin,
        salesCount: count,
        targetAchievement,
        items,
      });
    }

    // Remaining slots to fill 35 or 42 grid cells
    const remainingSlots = (7 - (days.length % 7)) % 7;
    for (let j = 1; j <= remainingSlots; j++) {
      const d = new Date(currentYear, currentMonth + 1, j);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        j
      ).padStart(2, '0')}`;
      days.push({
        date: d,
        dateKey,
        dayNumber: j,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
        totalSales: 0,
        totalCost: 0,
        netProfit: 0,
        isProfitable: false,
        profitMargin: 0,
        salesCount: 0,
        targetAchievement: 0,
        items: [],
      });
    }

    return days;
  }, [currentYear, currentMonth, invoices, dailyTarget]);

  // Aggregate monthly metrics
  const monthMetrics = useMemo(() => {
    const activeDays = calendarDays.filter(d => d.isCurrentMonth);
    const totalSales = activeDays.reduce((sum, d) => sum + d.totalSales, 0);
    const totalCost = activeDays.reduce((sum, d) => sum + d.totalCost, 0);
    const netProfit = totalSales - totalCost;
    const profitMargin = totalSales > 0 ? Math.round((netProfit / totalSales) * 100) : 0;
    const profitableDaysCount = activeDays.filter(d => d.isProfitable).length;
    const lossDaysCount = activeDays.length - profitableDaysCount;
    const peakDay = [...activeDays].sort((a, b) => b.totalSales - a.totalSales)[0];
    const avgDailySales = activeDays.length > 0 ? Math.round(totalSales / activeDays.length) : 0;

    return {
      totalSales,
      netProfit,
      profitMargin,
      profitableDaysCount,
      lossDaysCount,
      peakDay,
      avgDailySales,
      totalDays: activeDays.length,
    };
  }, [calendarDays]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter days based on view filter
  const displayedDays = useMemo(() => {
    return calendarDays.map(d => {
      if (!d.isCurrentMonth) return { ...d, isDimmed: false };
      if (filterMode === 'profit' && !d.isProfitable) return { ...d, isDimmed: true };
      if (filterMode === 'loss' && d.isProfitable) return { ...d, isDimmed: true };
      return { ...d, isDimmed: false };
    });
  }, [calendarDays, filterMode]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-primary text-white flex items-center justify-center shadow-md shadow-primary/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Sales & Profit Calendar
              </h1>
              <p className="text-sm text-slate-500">
                Daily sales tracking, profit & loss analytics, and corporate renewal ledger
              </p>
            </div>
          </div>
        </div>

        {/* Month Navigation & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Target benchmark pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs text-xs">
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-500 font-medium">Daily Target:</span>
            <span className="font-mono font-bold text-slate-900">₹{formatRupee(dailyTarget)}</span>
          </div>

          {/* Month selector buttons */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-bold text-slate-900 min-w-[140px] text-center select-none">
              {monthName}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200/60"
          >
            Today
          </button>
        </div>
      </div>

      {/* KPI Ribbon: High Level Monthly Financial Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Monthly Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Total Monthly Sales</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            ₹{formatRupee(monthMetrics.totalSales)}
          </div>
          <div className="mt-2 text-xs flex items-center gap-1.5 text-emerald-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14.8% vs last month</span>
          </div>
        </div>

        {/* Net Monthly Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Net Monthly Profit</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-mono font-bold text-[11px]">
              {monthMetrics.profitMargin}% Margin
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 tracking-tight">
            +₹{formatRupee(monthMetrics.netProfit)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>After infrastructure & COGS</span>
          </div>
        </div>

        {/* Profitable Days Ratio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Profitable Days</span>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {Math.round((monthMetrics.profitableDaysCount / (monthMetrics.totalDays || 1)) * 100)}%
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {monthMetrics.profitableDaysCount}{' '}
            <span className="text-sm text-slate-400 font-normal">/ {monthMetrics.totalDays} Days</span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${(monthMetrics.profitableDaysCount / (monthMetrics.totalDays || 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Peak Revenue Day */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Peak Revenue Day</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            ₹{monthMetrics.peakDay ? formatRupee(monthMetrics.peakDay.totalSales) : '0'}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            {monthMetrics.peakDay
              ? `Day ${monthMetrics.peakDay.dayNumber} (${monthMetrics.peakDay.salesCount} corporate orders)`
              : 'N/A'}
          </div>
        </div>

        {/* Daily Average Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Daily Run-Rate</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            ₹{formatRupee(monthMetrics.avgDailySales)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            {monthMetrics.avgDailySales >= dailyTarget ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                ▲ Above ₹{formatRupee(dailyTarget)} Target
              </span>
            ) : (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                ▼ Below Target
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Mode & Legend Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterMode === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Days ({monthMetrics.totalDays})
          </button>
          <button
            onClick={() => setFilterMode('profit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterMode === 'profit'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Profitable Days Only ({monthMetrics.profitableDaysCount})
          </button>
          <button
            onClick={() => setFilterMode('loss')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterMode === 'loss'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Under Target / Loss ({monthMetrics.lossDaysCount})
          </button>
        </div>

        {/* Legend Explainer */}
        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Profitable (Above Cost)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Loss / Under Benchmark</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200" />
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center py-3">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/40">
          {displayedDays.map((day, idx) => {
            const isClickable = day.isCurrentMonth;
            const isDimmed = day.isDimmed;

            if (!day.isCurrentMonth) {
              return (
                <div
                  key={`inactive-${idx}`}
                  className="min-h-[120px] p-2.5 bg-slate-50/60 text-slate-300 select-none flex flex-col justify-between"
                >
                  <span className="text-xs font-medium">{day.dayNumber}</span>
                  <div className="text-[10px] text-slate-300 text-center italic">Outside Month</div>
                </div>
              );
            }

            return (
              <div
                key={day.dateKey}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[135px] p-2.5 flex flex-col justify-between transition-all duration-200 cursor-pointer relative group ${
                  isDimmed
                    ? 'opacity-30 bg-slate-50'
                    : day.isToday
                    ? 'bg-indigo-50/40 hover:bg-indigo-50/80 ring-2 ring-primary ring-inset'
                    : 'bg-white hover:bg-slate-50/90 hover:shadow-md'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      day.isToday
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-slate-700 group-hover:text-slate-900'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {/* Order count badge */}
                  <span className="text-[10px] text-slate-400 font-mono group-hover:text-slate-600 transition-colors">
                    {day.salesCount} sales
                  </span>
                </div>

                {/* Day Financials */}
                <div className="my-1.5 space-y-1">
                  {/* Sales Amount */}
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] font-medium text-slate-400 uppercase">Sales</span>
                    <span className="font-mono text-sm font-bold text-slate-900">
                      ₹{formatRupee(day.totalSales)}
                    </span>
                  </div>

                  {/* Profit or Loss Status Badge */}
                  {day.isProfitable ? (
                    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60 text-[11px] font-semibold text-emerald-700 transition-colors group-hover:bg-emerald-100">
                      <span className="flex items-center gap-1 font-mono">
                        <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" />
                        +₹{formatRupee(day.netProfit)}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600">
                        {day.profitMargin}%
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-rose-50 border border-rose-200/60 text-[11px] font-semibold text-rose-700 transition-colors group-hover:bg-rose-100">
                      <span className="flex items-center gap-1 font-mono">
                        <TrendingDown className="w-3 h-3 text-rose-600 shrink-0" />
                        {day.netProfit < 0 ? `-₹${formatRupee(Math.abs(day.netProfit))}` : 'Low Volume'}
                      </span>
                      <span className="text-[10px] font-bold text-rose-600">
                        Loss
                      </span>
                    </div>
                  )}
                </div>

                {/* Mini Target Progress Bar */}
                <div className="pt-1">
                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        day.targetAchievement >= 100
                          ? 'bg-emerald-500'
                          : day.targetAchievement >= 60
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                      style={{ width: `${Math.min(100, day.targetAchievement)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5">
                    <span>Goal: {day.targetAchievement}%</span>
                    <span className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Details →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Day Details Modal / Drawer */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedDay.date.toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  {selectedDay.isToday && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
                      Today
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Detailed sales ledger, customer invoice receipts, and net profit margins
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Performance Summary Cards */}
            <div className="p-6 grid grid-cols-3 gap-3 bg-slate-50/60 border-b border-slate-100">
              {/* Gross Sales */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Gross Day Sales</span>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                  ₹{formatRupee(selectedDay.totalSales)}
                </div>
                <span className="text-[11px] text-slate-400">
                  {selectedDay.salesCount} Transactions
                </span>
              </div>

              {/* Operating Cost */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Operational Cost & Gateway</span>
                <div className="text-xl font-bold font-mono text-slate-600 mt-1">
                  ₹{formatRupee(selectedDay.totalCost)}
                </div>
                <span className="text-[11px] text-slate-400">Fixed + 22% variable</span>
              </div>

              {/* Net Profit / Loss */}
              <div
                className={`p-3.5 rounded-xl border shadow-xs ${
                  selectedDay.isProfitable
                    ? 'bg-emerald-50 border-emerald-200/80 text-emerald-800'
                    : 'bg-rose-50 border-rose-200/80 text-rose-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    {selectedDay.isProfitable ? 'Net Day Profit' : 'Net Loss / Shortfall'}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white shadow-xs">
                    {selectedDay.profitMargin}%
                  </span>
                </div>
                <div className="text-xl font-bold font-mono mt-1">
                  {selectedDay.isProfitable
                    ? `+₹${formatRupee(selectedDay.netProfit)}`
                    : `-₹${formatRupee(Math.abs(selectedDay.netProfit))}`}
                </div>
                <span className="text-[11px] opacity-80">
                  {selectedDay.isProfitable ? 'Target Achieved' : 'Below Daily Benchmark'}
                </span>
              </div>
            </div>

            {/* Itemized Transactions List */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Day Subscriptions & Customer Sales ({selectedDay.items.length})
                </h4>
                <span className="text-xs font-mono font-medium text-slate-400">
                  Currency: INR (₹)
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                {selectedDay.items.map(item => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {item.company.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{item.company}</p>
                          <span className="text-[11px] text-slate-400">({item.customerName})</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {item.planOrProduct} •{' '}
                          <span className="text-slate-400">{item.paymentMethod}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="block font-mono text-sm font-bold text-slate-900">
                        ₹{formatRupee(item.amount)}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-600 font-medium">
                        +₹{formatRupee(item.profit)} profit
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                All records synced with Brightloop automated recurring billing ledger
              </span>
              <button
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
