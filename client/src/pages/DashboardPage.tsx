import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Repeat,
  DollarSign,
  AlertCircle,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { api, formatMoney } from '../api/client';
import { DashboardStats } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface DashboardPageProps {
  dateFilter: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ dateFilter }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [donutHoverSegment, setDonutHoverSegment] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { error } = useToast();

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats(dateFilter);
      setStats(data);
    } catch (err: any) {
      console.error(err);
      error('Failed to load dashboard data', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const handleRefetch = () => loadStats();
    window.addEventListener('billing-cycle-complete', handleRefetch);
    return () => window.removeEventListener('billing-cycle-complete', handleRefetch);
  }, [dateFilter]);

  if (loading || !stats) {
    return (
      <div className="p-6 lg:p-8 space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200/70 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-slate-200/50 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200/50 rounded-2xl" />
          <div className="h-96 bg-slate-200/50 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { kpis, revenueChart, subscriptionDonut, recentInvoices, upcomingRenewals } = stats;

  // Max value for revenue bar chart scaling
  const maxBarValue = Math.max(...revenueChart.map(d => d.collected), 1);

  // Dynamic Donut center label
  const activeDonutItem = donutHoverSegment
    ? subscriptionDonut.data.find(d => d.name === donutHoverSegment)
    : null;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1580px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here's a snapshot of your subscription business.
          </p>
        </div>
      </div>

      {/* KPI Cards Row (Hover to Brighten with Theme Glow & Navigate) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Active Subscriptions */}
        <div
          onClick={() => navigate('/subscriptions')}
          className="group p-5 rounded-2xl border cursor-pointer select-none card-theme-brighten bg-white border-slate-200/80 shadow-card"
        >
          <div className="absolute top-0 left-6 right-6 h-1 rounded-b-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Subscriptions</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 bg-lavender-100 text-primary group-hover:bg-primary group-hover:text-white group-hover:shadow-xs">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono group-hover:text-primary transition-colors">
              {kpis.activeSubscriptions.value.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-end text-xs">
            <span className="text-[11px] text-primary group-hover:underline font-medium">
              View list →
            </span>
          </div>
        </div>

        {/* 2. Monthly Recurring Revenue (MRR) */}
        <div
          onClick={() => navigate('/reports')}
          className="group p-5 rounded-2xl border cursor-pointer select-none card-theme-brighten bg-white border-slate-200/80 shadow-card"
        >
          <div className="absolute top-0 left-6 right-6 h-1 rounded-b-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Monthly Recurring Revenue (MRR)</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono group-hover:text-emerald-700 transition-colors">
              ₹{formatMoney(kpis.mrr.value)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-end text-xs">
            <span className="text-[11px] text-primary group-hover:underline font-medium">
              Analytics →
            </span>
          </div>
        </div>

        {/* 3. Revenue Collected */}
        <div
          onClick={() => navigate('/payments')}
          className="group p-5 rounded-2xl border cursor-pointer select-none card-theme-brighten bg-white border-slate-200/80 shadow-card"
        >
          <div className="absolute top-0 left-6 right-6 h-1 rounded-b-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Revenue Collected</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 bg-indigo-50 text-indigo-600 group-hover:bg-primary group-hover:text-white group-hover:shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono group-hover:text-primary transition-colors">
              ₹{formatMoney(kpis.revenueCollected.value)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-end text-xs">
            <span className="text-[11px] text-primary group-hover:underline font-medium">
              Ledger →
            </span>
          </div>
        </div>

        {/* 4. Overdue Invoices */}
        <div
          onClick={() => navigate('/invoices?status=overdue')}
          className="group p-5 rounded-2xl border cursor-pointer select-none card-theme-brighten bg-white border-slate-200/80 shadow-card"
        >
          <div className="absolute top-0 left-6 right-6 h-1 rounded-b-full bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Overdue Invoices</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-xs">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono group-hover:text-rose-600 transition-colors">
                {kpis.overdueInvoices.value}
              </span>
              <span className="text-xs text-slate-400 ml-1.5">(₹{formatMoney(kpis.overdueInvoices.amount)})</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end text-xs">
            <span className="text-[11px] text-primary group-hover:underline font-medium">
              Resolve →
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Chart Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols) — Revenue Overview with 3D Depth Hover Interaction */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Revenue Overview</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Payments collected per month in the selected period
              </p>
            </div>
          </div>

          {/* Interactive 3D Bar Chart Display */}
          <div className="relative pt-6 pb-2 min-h-[280px] flex flex-col justify-end">
            <div className="h-56 w-full flex items-end justify-between gap-2 sm:gap-4 px-2">
              {revenueChart.map((bar, idx) => {
                const collectedHeightPercent = Math.round((bar.collected / maxBarValue) * 100);
                const isHovered = hoveredBarIndex === idx;

                return (
                  <div
                    key={bar.period}
                    className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {/* Floating 3D Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-16 z-20 bg-slate-900 text-white text-xs py-1.5 px-3 rounded-xl shadow-lg pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                        <p className="font-semibold">{bar.period}</p>
                        <p className="text-slate-300">
                          Collected: <span className="font-mono font-medium text-emerald-400">₹{formatMoney(bar.collected)}</span>
                        </p>
                        {/* Caret */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
                      </div>
                    )}

                    {/* Stacked Bar with subtle 3D hover lift */}
                    <div
                      style={{ height: `${collectedHeightPercent}%` }}
                      className={`w-full max-w-[42px] flex flex-col justify-end rounded-t-lg overflow-hidden transition-all duration-200 ease-out ${
                        isHovered
                          ? '-translate-y-1.5 shadow-md shadow-primary/20 ring-2 ring-primary/40'
                          : 'hover:brightness-95'
                      }`}
                    >
                      {/* Top Highlight on active bar */}
                      {isHovered && (
                        <div className="w-full h-1 bg-white/70 animate-pulse" />
                      )}
                      <div className="w-full h-full bg-primary transition-all duration-300 min-h-[6px]" />
                    </div>

                    {/* X-axis Label */}
                    <span
                      className={`text-[11px] mt-2 transition-colors duration-150 ${
                        isHovered ? 'text-primary font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {bar.period}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Subtle horizontal grid lines */}
            <div className="border-t border-slate-100 w-full mt-2" />
          </div>
        </div>

        {/* Right (1 col) — Subscription Status Donut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Subscription Status</h3>
              <p className="text-xs text-slate-500 mt-0.5">Lifecycle distribution</p>
            </div>
          </div>

          {/* Donut Chart Visual Representation */}
          <div className="relative flex items-center justify-center my-4">
            <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
              {(() => {
                const COLOR_MAP: Record<string, string> = {
                  active: '#10B981',
                  Active: '#10B981',
                  quotation: '#3B82F6',
                  Quotation: '#3B82F6',
                  confirmed: '#8B5CF6',
                  Confirmed: '#8B5CF6',
                  draft: '#64748B',
                  Draft: '#64748B',
                  paused: '#F59E0B',
                  Paused: '#F59E0B',
                  closed: '#EF4444',
                  Closed: '#EF4444',
                };

                const totalCount = subscriptionDonut.total || 1;
                const nonZeroItems = subscriptionDonut.data.filter(d => d.count > 0);
                // Allocate a minimum visible arc (4.5%) to non-zero segments so every status is clearly distinct on the ring
                const MIN_ARC = nonZeroItems.length > 1 ? 4.5 : 0;
                const totalReserved = nonZeroItems.length * MIN_ARC;
                const remainingWeight = Math.max(0, 100 - totalReserved);

                let accumulatedPercent = 0;
                return subscriptionDonut.data.map(item => {
                  if (item.count === 0) return null;
                  const itemColor = COLOR_MAP[item.name] || item.color || '#64748B';
                  const visualPct = MIN_ARC + (item.count / totalCount) * remainingWeight;
                  const strokeDasharray = `${visualPct} ${100 - visualPct}`;
                  const strokeDashoffset = -accumulatedPercent;
                  accumulatedPercent += visualPct;
                  const isHovered = donutHoverSegment === item.name;

                  return (
                    <circle
                      key={item.name}
                      cx="90"
                      cy="90"
                      r="70"
                      fill="transparent"
                      stroke={itemColor}
                      strokeWidth={isHovered ? '24' : '18'}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      pathLength="100"
                      className="transition-all duration-200 cursor-pointer"
                      style={{
                        filter: isHovered ? `drop-shadow(0 0 6px ${itemColor}99)` : undefined,
                        opacity: donutHoverSegment && !isHovered ? 0.35 : 1,
                      }}
                      onMouseEnter={() => setDonutHoverSegment(item.name)}
                      onMouseLeave={() => setDonutHoverSegment(null)}
                    />
                  );
                });
              })()}
            </svg>

            {/* Dynamic Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {activeDonutItem ? (
                (() => {
                  const COLOR_MAP: Record<string, string> = {
                    active: '#10B981',
                    Active: '#10B981',
                    quotation: '#3B82F6',
                    Quotation: '#3B82F6',
                    confirmed: '#8B5CF6',
                    Confirmed: '#8B5CF6',
                    draft: '#64748B',
                    Draft: '#64748B',
                    paused: '#F59E0B',
                    Paused: '#F59E0B',
                    closed: '#EF4444',
                    Closed: '#EF4444',
                  };
                  const color = COLOR_MAP[activeDonutItem.name] || activeDonutItem.color;
                  return (
                    <>
                      <span className="text-2xl font-bold text-slate-900 animate-in fade-in duration-100">
                        {activeDonutItem.count.toLocaleString()}
                      </span>
                      <span
                        className="text-xs font-bold capitalize leading-tight"
                        style={{ color }}
                      >
                        {activeDonutItem.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {activeDonutItem.percentage > 0 ? `${activeDonutItem.percentage}%` : '<1%'} of total
                      </span>
                    </>
                  );
                })()
              ) : (
                <>
                  <span className="text-2xl font-bold text-slate-900">
                    {subscriptionDonut.total.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Total Subscriptions
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Interactive Legend with counts and hover sync */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {subscriptionDonut.data.map(item => {
              const COLOR_MAP: Record<string, string> = {
                active: '#10B981',
                Active: '#10B981',
                quotation: '#3B82F6',
                Quotation: '#3B82F6',
                confirmed: '#8B5CF6',
                Confirmed: '#8B5CF6',
                draft: '#64748B',
                Draft: '#64748B',
                paused: '#F59E0B',
                Paused: '#F59E0B',
                closed: '#EF4444',
                Closed: '#EF4444',
              };
              const itemColor = COLOR_MAP[item.name] || item.color || '#64748B';
              const isHovered = donutHoverSegment === item.name;
              const pct = item.percentage;
              const pctText = pct > 0 ? `${pct}%` : item.count > 0 ? '<1%' : '0%';

              return (
                <div
                  key={item.name}
                  onMouseEnter={() => setDonutHoverSegment(item.name)}
                  onMouseLeave={() => setDonutHoverSegment(null)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all duration-150 ${
                    isHovered
                      ? 'bg-slate-100/90 font-semibold text-slate-900 shadow-xs translate-x-1'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full transition-transform ring-2 ring-white shadow-xs"
                      style={{
                        backgroundColor: itemColor,
                        transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                      }}
                    />
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-semibold text-slate-900">{item.count.toLocaleString()}</span>
                    <span
                      className="text-[11px] font-semibold px-1.5 py-0.5 rounded text-right min-w-[36px]"
                      style={{
                        backgroundColor: `${itemColor}18`,
                        color: itemColor,
                      }}
                    >
                      {pctText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Balanced Panels: Recent Invoices & Upcoming Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Recent Invoices */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Recent Invoices</h3>
              <p className="text-xs text-slate-500 mt-0.5">Latest customer billing statements</p>
            </div>
            <button
              onClick={() => navigate('/invoices')}
              className="text-xs font-medium text-primary hover:text-primary-dark inline-flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {recentInvoices.map(inv => (
              <div
                key={inv.id}
                onClick={() => navigate(`/invoices?id=${inv.id}`)}
                className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-mono text-xs font-bold text-slate-700 shrink-0 group-hover:bg-lavender-100 group-hover:text-primary transition-colors">
                    #
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 leading-tight">
                      {inv.customerName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {inv.invoiceNumber} • Due {inv.dueDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-slate-900 font-mono">
                    ₹{inv.total.toFixed(2)}
                  </span>
                  <StatusBadge status={inv.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Upcoming Renewals */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Upcoming Billing</h3>
              <p className="text-xs text-slate-500 mt-0.5">Active subscriptions next due for an invoice</p>
            </div>
            <button
              onClick={() => navigate('/subscriptions')}
              className="text-xs font-medium text-primary hover:text-primary-dark inline-flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {upcomingRenewals.map(renewal => (
              <div
                key={renewal.id}
                onClick={() => navigate(`/subscriptions?id=${renewal.id}`)}
                className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={renewal.customerAvatar}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 leading-tight">
                      {renewal.customerName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {renewal.planName} • <span className="capitalize">{renewal.billingCycle}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 font-mono">
                      ${renewal.amount.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {renewal.daysRemaining > 0 ? (
                        <span>in {renewal.daysRemaining} {renewal.daysRemaining === 1 ? 'day' : 'days'}</span>
                      ) : renewal.daysRemaining === 0 ? (
                        <span>today</span>
                      ) : (
                        <span className="text-rose-500 font-semibold">{Math.abs(renewal.daysRemaining)}d behind</span>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={renewal.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
