import React, { useState, useEffect } from 'react';
import { api, formatMoney } from '../api/client';
import { ReportsData } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';

const Metric: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card card-hover-lift">
    <span className="text-xs font-medium text-slate-500">{label}</span>
    <p className="text-2xl font-bold tracking-tight text-slate-900 mt-2 font-mono">{value}</p>
    {note && <p className="text-xs text-slate-400 mt-2">{note}</p>}
  </div>
);

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  useEffect(() => {
    api
      .getReports()
      .then(setData)
      .catch(err => error('Failed to load reports', err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-400">Loading reports...</div>;
  }

  const { summary, revenue, byStatus, overdueBuckets } = data;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1580px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Recurring revenue, collections, and overdue balances.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric
          label="Monthly Recurring Revenue"
          value={`$${formatMoney(summary.mrr)}`}
          note={`ARR $${formatMoney(summary.arr)}`}
        />
        <Metric label="Active Subscriptions" value={summary.activeSubscriptions.toLocaleString()} />
        <Metric label="Revenue Collected" value={`$${formatMoney(summary.revenueCollected)}`} note="All time" />
        <Metric
          label="Outstanding"
          value={`$${formatMoney(summary.outstanding)}`}
          note={`$${formatMoney(summary.overdueAmount)} overdue on ${summary.overdueCount.toLocaleString()} invoices`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
          <h3 className="text-base font-semibold text-slate-900">Revenue Collected by Month</h3>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4 text-right">Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {revenue.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-slate-400">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  [...revenue].reverse().map(row => (
                    <tr key={row.month} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{row.month}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ${formatMoney(row.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
            <h3 className="text-base font-semibold text-slate-900">Overdue Ageing</h3>
            <div className="mt-3 divide-y divide-slate-100">
              {overdueBuckets.map(bucket => (
                <div key={bucket.label} className="py-2.5 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{bucket.label} days late</span>
                  <span className="text-right">
                    <span className="block font-mono font-semibold text-slate-900">
                      ${formatMoney(bucket.amount)}
                    </span>
                    <span className="block text-xs text-slate-400">{bucket.count} invoices</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
            <h3 className="text-base font-semibold text-slate-900">Subscriptions by Status</h3>
            <div className="mt-3 divide-y divide-slate-100">
              {byStatus.map(row => (
                <div key={row.status} className="py-2.5 flex items-center justify-between text-sm">
                  <StatusBadge status={row.status} size="sm" />
                  <span className="font-mono font-semibold text-slate-900">{row.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
