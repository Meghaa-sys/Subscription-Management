import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  Users,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export const ReportsPage: React.FC = () => {
  const [reportsData, setReportsData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  useEffect(() => {
    api
      .getReports()
      .then(setReportsData)
      .catch(err => error('Failed to load reports', err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !reportsData) {
    return (
      <div className="p-8 text-center text-slate-400">Loading SaaS telemetry &amp; analytics...</div>
    );
  }

  const { monthlyTrends, churnBreakdown, renewalForecast, collectionRate } = reportsData;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1580px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Executive Reports &amp; SaaS Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Cohort health, MRR growth velocity, net revenue retention, and renewal forecasting.
        </p>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card card-hover-lift">
          <span className="text-xs font-medium text-slate-500">Net Retention Rate (NRR)</span>
          <p className="text-2xl font-bold tracking-tight text-slate-900 mt-2 font-mono">
            {churnBreakdown.netRetentionRate}
          </p>
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" /> Best-in-class tier (&gt;110%)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card card-hover-lift">
          <span className="text-xs font-medium text-slate-500">Gross Logo Churn</span>
          <p className="text-2xl font-bold tracking-tight text-slate-900 mt-2 font-mono">
            {churnBreakdown.grossChurnRate}
          </p>
          <p className="text-xs text-slate-400 mt-2">Annualized &lt; 7.2%</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card card-hover-lift">
          <span className="text-xs font-medium text-slate-500">SaaS Quick Ratio</span>
          <p className="text-2xl font-bold tracking-tight text-slate-900 mt-2 font-mono">
            {churnBreakdown.quickRatio}
          </p>
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5" /> High efficiency expansion
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card card-hover-lift">
          <span className="text-xs font-medium text-slate-500">Average ARPU</span>
          <p className="text-2xl font-bold tracking-tight text-slate-900 mt-2 font-mono">
            {churnBreakdown.averageRevenuePerAccount}
          </p>
          <p className="text-xs text-slate-400 mt-2">Collection Rate: {collectionRate}</p>
        </div>
      </div>

      {/* Revenue Velocity Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">MRR Trajectory &amp; Expansion Cohorts</h3>
            <p className="text-xs text-slate-500 mt-0.5">Historical month-over-month progression</p>
          </div>
          <span className="text-xs font-medium text-primary bg-lavender-100 px-3 py-1 rounded-full">
            Calculated Real-Time
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">MRR</th>
                <th className="py-3 px-4">ARR Run-Rate</th>
                <th className="py-3 px-4">MoM Growth</th>
                <th className="py-3 px-4">Churn Rate</th>
                <th className="py-3 px-4">New Subscriptions</th>
                <th className="py-3 px-4 text-right">Expansion Upgrades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {monthlyTrends.map((row: any) => (
                <tr key={row.month} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{row.month}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    ₹{row.mrr.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    ₹{row.arr.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-emerald-600 font-semibold font-mono">
                    +{row.growth}%
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono">{row.churn}%</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 font-mono text-slate-800">
                      +{row.newSubs} clients
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-primary font-semibold">
                    +{row.expansions} seats
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renewal Forecast Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Renewal Forecast (Next 30 Days)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Automated probability scoring and projected renewals</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {renewalForecast.map((item: any) => (
            <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.customerName}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Renewal on <span className="font-medium text-slate-700">{item.renewalDate}</span> ({item.cycle})
                </p>
              </div>

              <div className="flex items-center gap-4 text-right">
                <span className="font-mono font-bold text-slate-900 text-sm">
                  ₹{item.amount.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200/60">
                  {item.probability} Retention Prob
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
