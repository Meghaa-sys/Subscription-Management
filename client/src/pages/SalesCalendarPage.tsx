import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  CheckCircle2,
  X,
  RefreshCw,
  Clock,
  ShieldCheck,
  Receipt,
  Layers,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

interface CalendarEvent {
  id: string;
  type: 'revenue' | 'loss';
  title: string;
  amount: number;
  status: 'successful' | 'failed' | 'refunded';
  customer: string;
  channel: string;
  time: string;
}

interface CalendarDay {
  day: number;
  date: string;
  dayOfWeek: number;
  revenue: number;
  loss: number;
  growthPercent: number;
  isPositiveGrowth: boolean;
  status: 'peak' | 'growth' | 'loss' | 'idle';
  transactionsCount: number;
  events: CalendarEvent[];
}

interface CalendarSummary {
  totalMonthlySales: number;
  bestSalesDay: { day: number; revenue: number; date: string };
  netGrowth: string;
  growthRatePercent: string;
  lossesAndRisk: number;
  dailyAverage: number;
  growthDaysCount: number;
  lossDaysCount: number;
}

interface CalendarData {
  year: number;
  month: number;
  monthName: string;
  daysInMonth: number;
  days: CalendarDay[];
  summary: CalendarSummary;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SalesCalendarPage: React.FC = () => {
  const { success, info } = useToast();
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(10); // October 2026
  const [loading, setLoading] = useState<boolean>(true);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [filter, setFilter] = useState<'all' | 'growth' | 'loss' | 'peak'>('all');
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [retryingEventId, setRetryingEventId] = useState<string | null>(null);

  // Fetch sales calendar data
  const loadCalendar = async (y: number, m: number) => {
    try {
      setLoading(true);
      const data = await api.getSalesCalendar(y, m);
      setCalendarData(data);
    } catch (err: any) {
      console.error('Failed to load sales calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar(year, month);
  }, [year, month]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    setYear(2026);
    setMonth(10);
  };

  const handleRetryPayment = (event: CalendarEvent) => {
    setRetryingEventId(event.id);
    setTimeout(() => {
      setRetryingEventId(null);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10B981', '#5145E5', '#6366F1'],
      });
      success('Dunning Auto-Recovery Succeeded!', `Recovered ₹${event.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} from ${event.customer} via secondary fallback UPI e-Mandate.`);
      
      // Update local state to show payment recovered
      if (calendarData && selectedDay) {
        const updatedEvents = selectedDay.events.map(ev =>
          ev.id === event.id ? { ...ev, status: 'successful' as const, type: 'revenue' as const, title: 'Recovered Transaction (Card Retry)' } : ev
        );
        const updatedDay: CalendarDay = {
          ...selectedDay,
          revenue: selectedDay.revenue + event.amount,
          loss: Math.max(0, selectedDay.loss - event.amount),
          status: 'growth',
          events: updatedEvents,
        };
        setSelectedDay(updatedDay);
        setCalendarData({
          ...calendarData,
          days: calendarData.days.map(d => (d.day === updatedDay.day ? updatedDay : d)),
          summary: {
            ...calendarData.summary,
            totalMonthlySales: calendarData.summary.totalMonthlySales + event.amount,
            lossesAndRisk: Math.max(0, calendarData.summary.lossesAndRisk - event.amount),
            lossDaysCount: Math.max(0, calendarData.summary.lossDaysCount - 1),
            growthDaysCount: calendarData.summary.growthDaysCount + 1,
          },
        });
      }
    }, 1200);
  };

  const handleExportStatement = () => {
    info('Exporting Sales Ledger', `Generating PDF & CSV financial statement for ${calendarData?.monthName} ${year}...`);
    setTimeout(() => {
      success('Sales Report Ready', 'Monthly calendar breakdown downloaded successfully.');
    }, 1000);
  };

  // Compute padding for the first day of the month
  const firstDayOfWeek = calendarData?.days?.[0]?.dayOfWeek ?? 0;
  const paddingDays = Array.from({ length: firstDayOfWeek });

  // Compute weekday totals for columnar insight
  const weekdayTotals = [0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
    if (!calendarData?.days) return 0;
    return calendarData.days
      .filter(d => d.dayOfWeek === dayIndex)
      .reduce((sum, d) => sum + d.revenue, 0);
  });

  // Filtered day count
  const filteredDays = calendarData?.days.filter(d => {
    if (filter === 'growth') return d.status === 'growth' || d.status === 'peak';
    if (filter === 'loss') return d.status === 'loss';
    if (filter === 'peak') return d.status === 'peak';
    return true;
  }) ?? [];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Sales Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">
            Sales & Revenue Calendar
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Monitor daily sales trajectory, growth surges, dunning loss anomalies, and transaction ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector Switcher */}
          <div className="flex items-center bg-white border border-border rounded-xl shadow-xs p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-text-muted hover:text-text-main hover:bg-slate-100 rounded-lg transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 text-sm font-semibold text-text-main select-none min-w-[130px] text-center">
              {calendarData?.monthName || 'October'} {year}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-text-muted hover:text-text-main hover:bg-slate-100 rounded-lg transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCurrentMonth}
            className="text-xs font-semibold px-3 py-2 bg-lavender-50 hover:bg-lavender-100 text-primary border border-lavender-200 rounded-xl transition"
          >
            Current (Oct 2026)
          </button>

          <button
            onClick={handleExportStatement}
            className="inline-flex items-center gap-2 text-xs font-medium px-3.5 py-2 bg-primary text-white hover:bg-primary-hover rounded-xl shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export Statement
          </button>
        </div>
      </div>

      {/* Top 5 KPI Summary Cards with Hover Brightening */}
      {calendarData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Total Monthly Sales */}
          <div className="bg-white border border-border rounded-2xl p-4 shadow-xs card-theme-brighten cursor-pointer">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Monthly Sales</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-text-main">
              ₹{calendarData.summary.totalMonthlySales.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {calendarData.summary.growthRatePercent}
              </span>
              <span className="text-text-muted">vs last month</span>
            </div>
          </div>

          {/* 2. Net Expansion Growth */}
          <div className="bg-white border border-border rounded-2xl p-4 shadow-xs card-theme-brighten cursor-pointer">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Net Expansion</span>
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {calendarData.summary.netGrowth}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                {calendarData.summary.growthDaysCount} Growth Days
              </span>
              <span className="text-text-muted">expansion</span>
            </div>
          </div>

          {/* 3. Dunning Losses & Risk */}
          <div className="bg-white border border-border rounded-2xl p-4 shadow-xs card-theme-brighten cursor-pointer">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Loss & Dunning</span>
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-rose-600">
              ₹{calendarData.summary.lossesAndRisk.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
                {calendarData.summary.lossDaysCount} At Risk
              </span>
              <span className="text-text-muted">failed cards</span>
            </div>
          </div>

          {/* 4. Best Sales Day */}
          <div className="bg-white border border-border rounded-2xl p-4 shadow-xs card-theme-brighten cursor-pointer">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Peak Record Day</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Sparkles className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-text-main">
              ₹{calendarData.summary.bestSalesDay.revenue.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
              <span className="font-semibold text-primary bg-lavender-100 px-1.5 py-0.5 rounded-md">
                Oct {calendarData.summary.bestSalesDay.day}
              </span>
              <span>All-time high surge</span>
            </div>
          </div>

          {/* 5. Daily Sales Velocity */}
          <div className="bg-white border border-border rounded-2xl p-4 shadow-xs card-theme-brighten cursor-pointer">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Daily Average</span>
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Receipt className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-text-main">
              ₹{calendarData.summary.dailyAverage.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/day
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
              <span className="font-medium text-text-main">31 billing cycles</span>
              <span>active pace</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Chips & Interactive Visual Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-border p-3.5 rounded-2xl shadow-xs">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-text-muted mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Days:
          </span>
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-slate-100 text-text-muted hover:text-text-main'
            }`}
          >
            All Month ({calendarData?.days.length || 31})
          </button>
          <button
            onClick={() => setFilter('peak')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
              filter === 'peak'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Peak Surge Days
          </button>
          <button
            onClick={() => setFilter('growth')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
              filter === 'growth'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <ArrowUpRight className="w-3 h-3" />
            Positive Growth
          </button>
          <button
            onClick={() => setFilter('loss')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
              filter === 'loss'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Loss & Dunning ({calendarData?.summary.lossDaysCount || 1})
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
            <span>Peak Surge (&gt; ₹1,50,000)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-indigo-200"></span>
            <span>Steady Sales Growth</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 animate-pulse"></span>
            <span>Dunning Loss / Decline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
            <span>Idle / Zero Activity</span>
          </div>
        </div>
      </div>

      {/* Innovative 7-Column Calendar Grid */}
      <div className="bg-white border border-border rounded-2xl shadow-xs overflow-hidden">
        {/* Weekday Columns Header with Cumulative Revenue */}
        <div className="grid grid-cols-7 border-b border-border bg-slate-50/80">
          {WEEKDAY_NAMES.map((name, idx) => (
            <div
              key={name}
              className="py-3 px-2 text-center border-r last:border-r-0 border-border"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-text-main">
                {name}
              </div>
              <div className="text-[11px] font-medium text-primary mt-0.5">
                ₹{weekdayTotals[idx].toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border">
          {/* Empty padding cells before first day */}
          {paddingDays.map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[120px] p-2 bg-slate-50/40 text-slate-300 border-border"
            />
          ))}

          {/* Active Days */}
          {calendarData?.days.map(dayItem => {
            const isMatchFilter =
              filter === 'all' ||
              (filter === 'peak' && dayItem.status === 'peak') ||
              (filter === 'growth' && (dayItem.status === 'growth' || dayItem.status === 'peak')) ||
              (filter === 'loss' && dayItem.status === 'loss');

            const isToday = dayItem.day === 31 && month === 10;
            const isPeak = dayItem.status === 'peak';
            const isLoss = dayItem.status === 'loss';
            const isGrowth = dayItem.status === 'growth';

            return (
              <div
                key={dayItem.day}
                onClick={() => setSelectedDay(dayItem)}
                className={`group min-h-[130px] p-2.5 relative flex flex-col justify-between cursor-pointer transition-all duration-200 card-theme-brighten ${
                  !isMatchFilter ? 'opacity-30 bg-slate-50/70' : 'bg-white'
                } ${
                  isPeak
                    ? 'hover:border-emerald-500'
                    : isLoss
                    ? 'hover:border-rose-500'
                    : 'hover:border-primary'
                }`}
              >
                {/* Date header & status badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full transition ${
                        isToday
                          ? 'bg-primary text-white font-bold ring-2 ring-primary/30'
                          : 'text-text-main group-hover:text-primary'
                      }`}
                    >
                      {dayItem.day}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider bg-lavender-100 px-1.5 py-0.5 rounded">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Growth / Loss Mini Pill */}
                  {isPeak && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                      +{dayItem.growthPercent}%
                    </span>
                  )}
                  {isGrowth && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-700 bg-lavender-100 px-1.5 py-0.5 rounded-full">
                      <ArrowUpRight className="w-2.5 h-2.5 text-emerald-600" />
                      +{dayItem.growthPercent}%
                    </span>
                  )}
                  {isLoss && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full border border-rose-300 animate-pulse">
                      <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                      Failed
                    </span>
                  )}
                </div>

                {/* Daily Revenue Amount */}
                <div className="my-2">
                  {dayItem.revenue > 0 ? (
                    <div className="space-y-0.5">
                      <div
                        className={`text-base font-bold tracking-tight transition ${
                          isPeak
                            ? 'text-emerald-700 text-lg'
                            : isLoss
                            ? 'text-text-main'
                            : 'text-text-main group-hover:text-primary'
                        }`}
                      >
                        ₹{dayItem.revenue.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-text-muted flex items-center gap-1">
                        <span>{dayItem.transactionsCount} transaction{dayItem.transactionsCount > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-normal text-slate-400 py-1">
                      ₹0
                    </div>
                  )}

                  {/* Loss notification tag inside cell */}
                  {dayItem.loss > 0 && (
                    <div className="mt-1 text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3 shrink-0" />
                      -₹{dayItem.loss.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Loss
                    </div>
                  )}
                </div>

                {/* Footer Micro-Action: Visible on hover */}
                <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-text-muted group-hover:text-primary">
                  <span className="font-medium text-[10px] text-slate-400 group-hover:text-primary">
                    View Ledger
                  </span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue Velocity Pace Bar */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-text-main flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Monthly Revenue Distribution & Weekly Cadence
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Weekly progress toward the ₹25,00,000 monthly ARR velocity target.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-text-muted">Target Attainment: </span>
            <span className="text-sm font-bold text-primary">
              {calendarData ? Math.round((calendarData.summary.totalMonthlySales / 2500000) * 100) : 78}%
            </span>
          </div>
        </div>

        {/* 5-Week Progress Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { label: 'Week 1 (Oct 1 - 7)', sales: 441800, growth: '+18% surge' },
            { label: 'Week 2 (Oct 8 - 14)', sales: 319700, growth: 'Steady pace' },
            { label: 'Week 3 (Oct 15 - 21)', sales: 531600, growth: 'Enterprise peak' },
            { label: 'Week 4 (Oct 22 - 28)', sales: 562000, growth: 'Peak record' },
            { label: 'Week 5 (Oct 29 - 31)', sales: 89900, growth: 'Month close' },
          ].map(wk => (
            <div key={wk.label} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 card-theme-brighten">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-text-main">{wk.label}</span>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1 rounded">{wk.growth}</span>
              </div>
              <div className="text-lg font-bold text-text-main">₹{wk.sales.toLocaleString('en-IN')}</div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (wk.sales / 600000) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide-Over Drawer: Daily Breakdown Inspector */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-navy-900/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div
            className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-border animate-slideInRight"
            role="dialog"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-border bg-slate-50/70 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-primary/10 text-primary">
                    <CalendarDays className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Daily Financial Ledger
                  </span>
                </div>
                <h2 className="text-xl font-bold text-text-main mt-1">
                  {WEEKDAY_NAMES[selectedDay.dayOfWeek]}, {calendarData?.monthName} {selectedDay.day}, {year}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Detailed transaction stream, gateway processing, and risk status for this date.
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 text-text-muted hover:text-text-main hover:bg-slate-200/70 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Day Financial Stats Grid */}
            <div className="p-6 border-b border-border grid grid-cols-3 gap-3 bg-white">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-[11px] font-semibold text-text-muted uppercase">Gross Sales</div>
                <div className="text-lg font-bold text-text-main mt-1">
                  ₹{selectedDay.revenue.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                <div className="text-[11px] font-semibold text-emerald-800 uppercase">Growth vs Day-1</div>
                <div className="text-lg font-bold text-emerald-700 mt-1">
                  +{selectedDay.growthPercent}%
                </div>
              </div>
              <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl">
                <div className="text-[11px] font-semibold text-rose-800 uppercase">Loss / Dunning</div>
                <div className="text-lg font-bold text-rose-700 mt-1">
                  ₹{selectedDay.loss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Transactions Timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Transaction Stream ({selectedDay.events.length})
                </h4>
                <span className="text-xs text-text-muted">Automated Reconciliation</span>
              </div>

              {selectedDay.events.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm">No sales transactions settled on this date.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDay.events.map(event => {
                    const isFailed = event.status === 'failed';
                    const isRetrying = retryingEventId === event.id;

                    return (
                      <div
                        key={event.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isFailed
                            ? 'bg-rose-50/40 border-rose-200'
                            : 'bg-white border-border hover:border-primary/40 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span
                              className={`p-2 rounded-lg mt-0.5 ${
                                isFailed
                                  ? 'bg-rose-100 text-rose-600'
                                  : 'bg-emerald-100 text-emerald-600'
                              }`}
                            >
                              {isFailed ? (
                                <AlertTriangle className="w-4 h-4" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-text-main">
                                {event.title}
                              </div>
                              <div className="text-xs text-text-muted font-medium mt-0.5">
                                {event.customer}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {event.time}
                                </span>
                                <span>•</span>
                                <span>{event.channel}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`text-base font-bold ${
                                isFailed ? 'text-rose-600' : 'text-text-main'
                              }`}
                            >
                              {isFailed ? '-' : '+'}₹{event.amount.toLocaleString('en-IN')}
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
                                isFailed
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {event.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Recovery Action for failed transactions */}
                        {isFailed && (
                          <div className="mt-3 pt-3 border-t border-rose-200/60 flex items-center justify-between">
                            <span className="text-xs text-rose-700 font-medium flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> UPI e-Mandate auto-retry eligible
                            </span>
                            <button
                              onClick={() => handleRetryPayment(event)}
                              disabled={isRetrying}
                              className="text-xs font-semibold px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                              {isRetrying ? 'Retrying via UPI e-Mandate...' : 'Retry Payment Now'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-border bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  info('Receipt Exported', `Generated batch invoice PDF for ${calendarData?.monthName} ${selectedDay.day}.`);
                }}
                className="text-xs font-semibold px-4 py-2 border border-border bg-white hover:bg-slate-100 rounded-xl text-text-main transition inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export Day CSV
              </button>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-xs font-semibold px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl shadow-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
