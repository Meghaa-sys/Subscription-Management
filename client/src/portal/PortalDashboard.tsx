import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, ChevronRight, CreditCard, Repeat, Wallet } from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Card, formatDate, formatINR, INTERVAL_LABELS, Message, PageHeader, usePortalData } from './shared';

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const Stat: React.FC<{ label: string; value: string; hint: string; icon: React.ElementType; alert?: boolean }> = ({
  label,
  value,
  hint,
  icon: Icon,
  alert,
}) => (
  <Card className="p-5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          alert ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <p className={`mt-2 text-2xl font-semibold tracking-tight ${alert ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
    <p className="mt-1 text-xs text-slate-400">{hint}</p>
  </Card>
);

export const PortalDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data, loading } = usePortalData(api.getPortalOverview, 'Failed to load your dashboard');

  if (loading) return <Message>Loading your account...</Message>;
  if (!data) return <Message>Your dashboard could not be loaded.</Message>;

  const { subscriptions, invoices, payments, discountRequests } = data;
  const active = subscriptions.filter(row => row.status === 'active');
  const open = invoices.filter(row => row.status === 'pending' || row.status === 'overdue');
  const overdue = open.filter(row => row.status === 'overdue');
  const nextBill = [...active]
    .filter(row => row.nextRenewal !== '—')
    .sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal))[0];
  const openRequests = discountRequests.filter(row => row.status === 'pending' || row.status === 'forwarded');

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        subtitle="Your subscriptions, bills and payments in one place."
      />

      {overdue.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-rose-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {overdue.length === 1 ? '1 invoice is' : `${overdue.length} invoices are`} overdue:{' '}
            {formatINR(sum(overdue.map(row => row.balance)))}
          </p>
          <Link to="/portal/invoices" className="text-xs font-semibold text-rose-700 hover:underline">
            View invoices
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Active subscriptions"
          value={String(active.length)}
          hint={`${subscriptions.length} in total`}
          icon={Repeat}
        />
        <Stat
          label="Amount due"
          value={formatINR(sum(open.map(row => row.balance)))}
          hint={`${open.length} unpaid ${open.length === 1 ? 'invoice' : 'invoices'}`}
          icon={Wallet}
          alert={overdue.length > 0}
        />
        <Stat
          label="Next bill"
          value={nextBill ? formatINR(nextBill.amount) : '—'}
          hint={nextBill ? `${formatDate(nextBill.nextRenewal)} · ${nextBill.planName}` : 'Nothing scheduled'}
          icon={CalendarClock}
        />
        <Stat
          label="Total paid"
          value={formatINR(sum(payments.map(row => row.amount)))}
          hint={`${payments.length} ${payments.length === 1 ? 'payment' : 'payments'}`}
          icon={CreditCard}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Your subscriptions</h2>
            <Link to="/portal/subscriptions" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
              View all
            </Link>
          </div>
          {subscriptions.length === 0 ? (
            <Message>You have no subscriptions yet.</Message>
          ) : (
            <ul className="divide-y divide-slate-100">
              {subscriptions.slice(0, 5).map(row => (
                <li key={row.id}>
                  <Link
                    to={`/portal/subscriptions/${row.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900 truncate">{row.planName}</span>
                      <span className="block text-xs text-slate-400">
                        {row.number} · {formatINR(row.amount)} / {INTERVAL_LABELS[row.billingCycle]}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={row.status} size="sm" />
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Recent invoices</h2>
            <Link to="/portal/invoices" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
              View all
            </Link>
          </div>
          {invoices.length === 0 ? (
            <Message>You have no invoices yet.</Message>
          ) : (
            <ul className="divide-y divide-slate-100">
              {invoices.slice(0, 5).map(row => (
                <li key={row.id}>
                  <Link
                    to={`/portal/invoices/${row.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900 truncate">{row.invoiceNumber}</span>
                      <span className="block text-xs text-slate-400">Due {formatDate(row.dueDate)}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium text-slate-900">{formatINR(row.total)}</span>
                      <StatusBadge status={row.status} size="sm" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {openRequests.length > 0 && (
        <p className="text-xs text-slate-500">
          You have {openRequests.length} discount {openRequests.length === 1 ? 'request' : 'requests'} in review.{' '}
          <Link to="/portal/discounts" className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
            See status
          </Link>
        </p>
      )}
    </>
  );
};
