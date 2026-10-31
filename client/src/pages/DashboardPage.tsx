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
  CalendarDays,
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
  const [selectedInterval, setSelectedInterval] = useState<string>(dateFilter || '12 months');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [donutHoverSegment, setDonutHoverSegment] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState('all');
  const [brightenedKpi, setBrightenedKpi] = useState<string | null>('mrr');

  const navigate = useNavigate();
  const { error } = useToast();

  const loadStats = async (interval = selectedInterval) => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats(interval);
      setStats(data);
    } catch (err: any) {
      console.error(err);
      error('Failed to load dashboard data', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateFilter) {
      setSelectedInterval(dateFilter);
    }
  }, [dateFilter]);

  useEffect(() => {
    loadStats(selectedInterval);
    const handleRefetch = () => loadStats(selectedInterval);
    window.addEventListener('billing-cycle-complete', handleRefetch);
    return () => window.removeEventListener('billing-cycle-complete', handleRefetch);
  }, [selectedInterval]);

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

  // Max value for revenue bar chart scaling & headroom ceiling
  const maxBarValue = Math.max(...revenueChart.map(d => d.total || (d.collected + d.outstanding)), 1);
  const minBar = revenueChart.reduce((prev, curr) => {
    const prevTot = prev.total || (prev.collected + prev.outstanding);
    const currTot = curr.total || (curr.collected + curr.outstanding);
    return currTot < prevTot ? curr : prev;
  }, revenueChart[0] || { period: '', total: 0 });
  const maxBar = revenueChart.reduce((prev, curr) => {
    const prevTot = prev.total || (prev.collected + prev.outstanding);
    const currTot = curr.total || (curr.collected + curr.outstanding);
    return currTot > prevTot ? curr : prev;
  }, revenueChart[0] || { period: '', total: 0 });

  const minTot = minBar ? (minBar.total || minBar.collected + minBar.outstanding) : 0;
  const maxTot = maxBar ? (maxBar.total || maxBar.collected + maxBar.outstanding) : 0;
  const fluctuationPct = minTot > 0 ? Math.round(((maxTot - minTot) / minTot) * 100) : 0;

  // Chart ceiling to give clean headroom
  const chartCeiling = maxBarValue > 1000000 
    ? Math.ceil((maxBarValue * 1.1) / 500000) * 500000 
    : Math.ceil((maxBarValue * 1.15) / 50000) * 50000 || maxBarValue * 1.2;

  const formatLakh = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

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
            Good morning, Megha 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Brightloop Software · Billing Operations Dashboard
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/calendar')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-border shadow-xs hover:border-primary text-text-main hover:text-primary transition"
          >
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            Daily Sales Calendar
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync • All Systems Nominal
          </span>
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
            <Sparkline data={kpis.activeSubscriptions.sparkline} color="#5145E5" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              +{kpis.activeSubscriptions.changePercent}%
            </span>
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
              ₹{kpis.mrr.value.toLocaleString('en-IN')}
            </span>
            <Sparkline data={kpis.mrr.sparkline} color="#10B981" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              +{kpis.mrr.changePercent}%
            </span>
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
              ₹{kpis.revenueCollected.value.toLocaleString('en-IN')}
            </span>
            <Sparkline data={kpis.revenueCollected.sparkline} color="#6366F1" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              +{kpis.revenueCollected.changePercent}%
            </span>
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
              <span className="text-xs text-slate-400 ml-1.5">(₹{kpis.overdueInvoices.amount.toLocaleString('en-IN')})</span>
            </div>
            <Sparkline data={kpis.overdueInvoices.sparkline} color="#F43F5E" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
              <TrendingDown className="w-3.5 h-3.5" />
              {kpis.overdueInvoices.changePercent}%
            </span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">Revenue Overview</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  +{fluctuationPct}% Peak Surge
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Billed vs. collected recurring revenue with seasonal fluctuations
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Local Interval Switcher Pills */}
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl text-xs font-medium">
                {[
                  { label: '7D', value: '7 days' },
                  { label: '30D', value: '30 days' },
                  { label: '3M', value: '3 months' },
                  { label: '12M', value: '12 months' },
                ].map(item => (
                  <button
                    key={item.value}
                    onClick={() => setSelectedInterval(item.value)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedInterval === item.value
                        ? 'bg-white text-primary font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-primary" />
                  <span className="text-slate-600">Collected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-indigo-200" />
                  <span className="text-slate-600">Outstanding</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Fluctuation Insights Bar */}
          <div className="flex flex-wrap items-center gap-2 mb-4 py-2 px-3 bg-slate-50/80 rounded-xl border border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Fluctuation Range:</span>
            <span className="text-slate-700 font-semibold">
              Lowest {minBar.period} ({formatLakh(minTot)})
            </span>
            <span className="text-slate-400">→</span>
            <span className="text-primary font-bold">
              Peak {maxBar.period} ({formatLakh(maxTot)})
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-600 font-medium inline-flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Seasonal &amp; Quarter-End Fluctuations Active
            </span>
          </div>

          {/* Interactive 3D Bar Chart Display with Real Fluctuation Heights */}
          <div className="relative pt-2 pb-2 min-h-[300px] flex flex-col justify-end">
            <div className="flex items-stretch h-64 w-full">
              {/* Y-Axis scale labels */}
              <div className="w-12 h-56 flex flex-col justify-between items-end pr-2.5 pb-6 text-[10px] font-mono text-slate-400 select-none">
                <span>{formatLakh(chartCeiling)}</span>
                <span>{formatLakh(chartCeiling * 0.75)}</span>
                <span>{formatLakh(chartCeiling * 0.5)}</span>
                <span>{formatLakh(chartCeiling * 0.25)}</span>
                <span>₹0</span>
              </div>

              {/* Chart Canvas */}
              <div className="flex-1 relative h-64 flex flex-col justify-end">
                {/* Background horizontal dashed gridlines */}
                <div className="absolute inset-x-0 top-0 h-56 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-dashed border-slate-200/90 w-full" />
                  <div className="border-b border-dashed border-slate-200/90 w-full" />
                  <div className="border-b border-dashed border-slate-200/90 w-full" />
                  <div className="border-b border-dashed border-slate-200/90 w-full" />
                  <div className="border-b border-slate-300 w-full" />
                </div>

                {/* Bars Row */}
                <div className="h-56 w-full flex items-end justify-between gap-1.5 sm:gap-3 px-1 relative z-10">
                  {revenueChart.map((bar, idx) => {
                    const total = bar.total || bar.collected + bar.outstanding;
                    // Proper bar height relative to ceiling
                    const barHeightPercent = Math.max(12, Math.min(100, Math.round((total / chartCeiling) * 100)));
                    const collectedRatio = total > 0 ? (bar.collected / total) * 100 : 85;
                    const outstandingRatio = total > 0 ? (bar.outstanding / total) * 100 : 15;
                    const isHovered = hoveredBarIndex === idx;

                    return (
                      <div
                        key={bar.period}
                        className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer select-none"
                        onMouseEnter={() => setHoveredBarIndex(idx)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                      >
                        {/* Floating 3D Tooltip */}
                        {isHovered && (
                          <div className="absolute -top-28 z-30 bg-slate-900/95 backdrop-blur-md text-white text-xs py-2 px-3.5 rounded-xl shadow-2xl pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 border border-slate-700/80">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-1 mb-1.5">
                              <span className="font-semibold text-slate-100">{bar.period}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/30 text-indigo-300 font-bold">
                                Total ₹{total.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="space-y-1 text-[11px]">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">Collected:</span>
                                <span className="font-mono font-medium text-emerald-400">
                                  ₹{bar.collected.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">Outstanding:</span>
                                <span className="font-mono font-medium text-amber-300">
                                  ₹{bar.outstanding.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4 pt-1 text-[10px] text-slate-400 border-t border-slate-800">
                                <span>Collection Efficiency:</span>
                                <span className="font-semibold text-emerald-300">
                                  {total > 0 ? ((bar.collected / total) * 100).toFixed(1) : 0}%
                                </span>
                              </div>
                            </div>
                            {/* Caret */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
                          </div>
                        )}

                        {/* Dedicated Bar Height Track */}
                        <div className="w-full h-56 flex items-end justify-center relative">
                          <div
                            style={{ height: `${barHeightPercent}%` }}
                            className={`w-full max-w-[36px] flex flex-col justify-end rounded-t-xl overflow-hidden transition-all duration-300 ease-out ${
                              isHovered
                                ? '-translate-y-2 shadow-xl shadow-primary/30 ring-2 ring-primary brightness-110'
                                : 'hover:brightness-95'
                            }`}
                          >
                            {/* Top Highlight on active bar */}
                            {isHovered && (
                              <div className="w-full h-1 bg-white/80 animate-pulse" />
                            )}
                            {/* Outstanding segment (top) */}
                            <div
                              style={{ height: `${outstandingRatio}%` }}
                              className="w-full bg-indigo-200 transition-all duration-300 min-h-[4px]"
                            />
                            {/* Collected segment (bottom) */}
                            <div
                              style={{ height: `${collectedRatio}%` }}
                              className="w-full bg-primary transition-all duration-300 min-h-[8px]"
                            />
                          </div>
                        </div>

                        {/* X-axis Label */}
                        <span
                          className={`text-[11px] mt-2 font-medium transition-colors duration-150 ${
                            isHovered ? 'text-primary font-bold scale-105' : 'text-slate-500'
                          }`}
                        >
                          {bar.period}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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
                    ₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                      ₹{renewal.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
