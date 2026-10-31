import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Repeat,
  DollarSign,
  AlertCircle,
  Clock,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { DashboardStats } from '../types';
import { Sparkline } from '../components/Sparkline';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';

interface DashboardPageProps {
  dateFilter: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ dateFilter }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [donutHoverSegment, setDonutHoverSegment] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState('all');
  const [brightenedKpi, setBrightenedKpi] = useState<string | null>('mrr');

  const navigate = useNavigate();
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
  const maxBarValue = Math.max(...revenueChart.map(d => d.total || (d.collected + d.outstanding)), 1);

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
            Good morning, Megha
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here's a snapshot of your subscription business.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync • All Systems Nominal
          </span>
        </div>
      </div>

      {/* KPI Cards Row (Click to Brighten with Theme Glow & Navigate) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Active Subscriptions */}
        <div
          onClick={() => setBrightenedKpi('subs')}
          onDoubleClick={() => navigate('/subscriptions')}
          className={`p-5 rounded-2xl border cursor-pointer select-none card-theme-brighten transition-all ${
            brightenedKpi === 'subs'
              ? 'is-brightened ring-2 ring-primary border-primary bg-gradient-to-b from-white via-[#FAF8FF] to-lavender-100/50 shadow-[0_14px_38px_-6px_rgba(81,69,229,0.25)]'
              : 'bg-white border-slate-200/80 shadow-card hover:border-primary/40'
          }`}
        >
          {brightenedKpi === 'subs' && (
            <div className="absolute top-0 left-6 right-6 h-0.5 rounded-b-full bg-primary animate-pulse" />
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Subscriptions</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                brightenedKpi === 'subs'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-lavender-100 text-primary'
              }`}
            >
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {kpis.activeSubscriptions.value.toLocaleString()}
            </span>
            <Sparkline data={kpis.activeSubscriptions.sparkline} color="#5145E5" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              +{kpis.activeSubscriptions.changePercent}%
            </span>
            <button
              onClick={e => {
                e.stopPropagation();
                navigate('/subscriptions');
              }}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              View list →
            </button>
          </div>
        </div>

        {/* 2. Monthly Recurring Revenue (MRR) */}
        <div
          onClick={() => setBrightenedKpi('mrr')}
          onDoubleClick={() => navigate('/reports')}
          className={`p-5 rounded-2xl border cursor-pointer select-none card-theme-brighten transition-all ${
            brightenedKpi === 'mrr'
              ? 'is-brightened ring-2 ring-primary border-primary bg-gradient-to-b from-white via-[#FAF8FF] to-lavender-100/50 shadow-[0_14px_38px_-6px_rgba(81,69,229,0.25)]'
              : 'bg-white border-slate-200/80 shadow-card hover:border-primary/40'
          }`}
        >
          {brightenedKpi === 'mrr' && (
            <div className="absolute top-0 left-6 right-6 h-0.5 rounded-b-full bg-primary animate-pulse" />
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Monthly Recurring Revenue (MRR)</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                brightenedKpi === 'mrr'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              ${kpis.mrr.value.toLocaleString()}
            </span>
            <Sparkline data={kpis.mrr.sparkline} color="#10B981" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              +{kpis.mrr.changePercent}%
            </span>
            <button
              onClick={e => {
                e.stopPropagation();
                navigate('/reports');
              }}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              Analytics →
            </button>
          </div>
        </div>

        {/* 3. Revenue Collected */}
        <div
          onClick={() => setBrightenedKpi('rev')}
          onDoubleClick={() => navigate('/payments')}
          className={`p-5 rounded-2xl border cursor-pointer select-none card-theme-brighten transition-all ${
            brightenedKpi === 'rev'
              ? 'is-brightened ring-2 ring-primary border-primary bg-gradient-to-b from-white via-[#FAF8FF] to-lavender-100/50 shadow-[0_14px_38px_-6px_rgba(81,69,229,0.25)]'
              : 'bg-white border-slate-200/80 shadow-card hover:border-primary/40'
          }`}
        >
          {brightenedKpi === 'rev' && (
            <div className="absolute top-0 left-6 right-6 h-0.5 rounded-b-full bg-primary animate-pulse" />
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Revenue Collected</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                brightenedKpi === 'rev'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              ${kpis.revenueCollected.value.toLocaleString()}
            </span>
            <Sparkline data={kpis.revenueCollected.sparkline} color="#6366F1" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              +{kpis.revenueCollected.changePercent}%
            </span>
            <button
              onClick={e => {
                e.stopPropagation();
                navigate('/payments');
              }}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              Ledger →
            </button>
          </div>
        </div>

        {/* 4. Overdue Invoices */}
        <div
          onClick={() => setBrightenedKpi('overdue')}
          onDoubleClick={() => navigate('/invoices?status=overdue')}
          className={`p-5 rounded-2xl border cursor-pointer select-none card-theme-brighten transition-all ${
            brightenedKpi === 'overdue'
              ? 'is-brightened ring-2 ring-primary border-primary bg-gradient-to-b from-white via-[#FAF8FF] to-lavender-100/50 shadow-[0_14px_38px_-6px_rgba(81,69,229,0.25)]'
              : 'bg-white border-slate-200/80 shadow-card hover:border-primary/40'
          }`}
        >
          {brightenedKpi === 'overdue' && (
            <div className="absolute top-0 left-6 right-6 h-0.5 rounded-b-full bg-primary animate-pulse" />
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Overdue Invoices</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                brightenedKpi === 'overdue'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {kpis.overdueInvoices.value}
              </span>
              <span className="text-xs text-slate-400 ml-1.5">(${kpis.overdueInvoices.amount})</span>
            </div>
            <Sparkline data={kpis.overdueInvoices.sparkline} color="#F43F5E" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
              <TrendingDown className="w-3.5 h-3.5" />
              {kpis.overdueInvoices.changePercent}%
            </span>
            <button
              onClick={e => {
                e.stopPropagation();
                navigate('/invoices?status=overdue');
              }}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              Resolve →
            </button>
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
                Collected vs. outstanding billed revenue across intervals
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-primary" />
                <span className="text-slate-600">Collected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-lavender-200" />
                <span className="text-slate-600">Outstanding</span>
              </div>
            </div>
          </div>

          {/* Interactive 3D Bar Chart Display */}
          <div className="relative pt-6 pb-2 min-h-[280px] flex flex-col justify-end">
            <div className="h-56 w-full flex items-end justify-between gap-2 sm:gap-4 px-2">
              {revenueChart.map((bar, idx) => {
                const total = bar.total || bar.collected + bar.outstanding;
                const collectedHeightPercent = Math.round((bar.collected / maxBarValue) * 100);
                const outstandingHeightPercent = Math.round((bar.outstanding / maxBarValue) * 100);
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
                          Collected: <span className="font-mono font-medium text-emerald-400">${bar.collected.toLocaleString()}</span>
                        </p>
                        <p className="text-slate-300">
                          Outstanding: <span className="font-mono font-medium text-amber-300">${bar.outstanding.toLocaleString()}</span>
                        </p>
                        {/* Caret */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
                      </div>
                    )}

                    {/* Stacked Bar with subtle 3D hover lift */}
                    <div
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
                      {/* Outstanding segment */}
                      <div
                        style={{ height: `${outstandingHeightPercent}%` }}
                        className="w-full bg-lavender-200 transition-all duration-300 min-h-[4px]"
                      />
                      {/* Collected segment */}
                      <div
                        style={{ height: `${collectedHeightPercent}%` }}
                        className="w-full bg-primary transition-all duration-300 min-h-[6px]"
                      />
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
            {/* Filter Dropdown */}
            <select
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Products</option>
              <option value="engine">Engine Only</option>
              <option value="analytics">Analytics Suite</option>
            </select>
          </div>

          {/* Donut Chart Visual Representation */}
          <div className="relative flex items-center justify-center my-4">
            <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
              {(() => {
                let accumulatedPercent = 0;
                return subscriptionDonut.data.map(item => {
                  const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                  const strokeDashoffset = -accumulatedPercent;
                  accumulatedPercent += item.percentage;
                  const isHovered = donutHoverSegment === item.name;

                  return (
                    <circle
                      key={item.name}
                      cx="90"
                      cy="90"
                      r="70"
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth={isHovered ? '24' : '18'}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      pathLength="100"
                      className="transition-all duration-200 cursor-pointer"
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
                <>
                  <span className="text-2xl font-bold text-slate-900 animate-in fade-in duration-100">
                    {activeDonutItem.count}
                  </span>
                  <span className="text-xs font-medium text-slate-500 capitalize leading-tight">
                    {activeDonutItem.name}
                  </span>
                  <span className="text-[10px] text-primary font-semibold">
                    {activeDonutItem.percentage}% of total
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-slate-900">
                    {subscriptionDonut.total}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Total Subscriptions
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Interactive Legend with counts and hover sync */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {subscriptionDonut.data.map(item => {
              const isHovered = donutHoverSegment === item.name;
              return (
                <div
                  key={item.name}
                  onMouseEnter={() => setDonutHoverSegment(item.name)}
                  onMouseLeave={() => setDonutHoverSegment(null)}
                  className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isHovered ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full transition-transform"
                      style={{
                        backgroundColor: item.color,
                        transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                      }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span>{item.count}</span>
                    <span className="text-slate-400 text-[11px] w-8 text-right">
                      {item.percentage}%
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
                    ${inv.total.toFixed(2)}
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
              <h3 className="text-base font-semibold text-slate-900">Upcoming Renewals</h3>
              <p className="text-xs text-slate-500 mt-0.5">Subscriptions maturing in next cycle</p>
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
                    src={renewal.customerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt={renewal.customerName}
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
                        <span>in {renewal.daysRemaining} days</span>
                      ) : (
                        <span className="text-rose-500 font-semibold">Overdue ({Math.abs(renewal.daysRemaining)}d)</span>
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
