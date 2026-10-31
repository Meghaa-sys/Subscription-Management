import React, { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Pause, Percent, Play, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { Card, formatDate, formatINR, INTERVAL_LABELS, Message, PageHeader, usePortalData } from './shared';

export const PortalSubscriptions: React.FC = () => {
  const { data, loading } = usePortalData(api.getPortalSubscriptions, 'Failed to load subscriptions');

  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Open one to pause, resume or renew it." />
      <Card>
        {loading ? (
          <Message>Loading...</Message>
        ) : !data || data.length === 0 ? (
          <Message>You have no subscriptions yet.</Message>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.map(row => (
              <li key={row.id}>
                <Link
                  to={`/portal/subscriptions/${row.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 truncate">{row.planName}</span>
                    <span className="block text-xs text-slate-400 mt-0.5">
                      {row.number} · Next bill {formatDate(row.nextRenewal)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:block text-sm font-medium text-slate-900">
                      {formatINR(row.amount)} / {INTERVAL_LABELS[row.billingCycle]}
                    </span>
                    <StatusBadge status={row.status} size="sm" />
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
};

const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className="text-xs text-slate-400">{label}</dt>
    <dd className="text-sm font-medium text-slate-900 mt-0.5">{value}</dd>
  </div>
);

const buttonClass =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50';

export const PortalSubscriptionDetail: React.FC = () => {
  const { id = '' } = useParams();
  const load = useCallback(() => api.getPortalSubscription(id), [id]);
  const { data: sub, loading, reload } = usePortalData(load, 'Failed to load subscription');
  const { success, error } = useToast();
  const [working, setWorking] = useState(false);

  const act = async (action: () => Promise<unknown>, title: string, detail: string) => {
    try {
      setWorking(true);
      await action();
      success(title, detail);
      await reload();
    } catch (err: any) {
      error('That did not work', err.message);
    } finally {
      setWorking(false);
    }
  };

  const back = (
    <Link to="/portal/subscriptions" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900">
      <ArrowLeft className="w-3.5 h-3.5" /> All subscriptions
    </Link>
  );

  if (loading) return <Message>Loading...</Message>;
  if (!sub) {
    return (
      <>
        {back}
        <Message>This subscription could not be found on your account.</Message>
      </>
    );
  }

  return (
    <>
      {back}
      <PageHeader
        title={sub.planName ?? 'Subscription'}
        subtitle={sub.number}
        action={<StatusBadge status={sub.status} />}
      />

      <Card className="p-5">
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Fact label="Amount each billing" value={`${formatINR(sub.amount)} / ${INTERVAL_LABELS[sub.billingCycle]}`} />
          <Fact label="Next bill" value={formatDate(sub.nextRenewal)} />
          <Fact label="Started" value={formatDate(sub.startDate)} />
          <Fact label="Expires" value={sub.expiryDate ? formatDate(sub.expiryDate) : 'No expiry'} />
          <Fact label="Payment terms" value={sub.paymentTerm ?? '—'} />
          <Fact label="Account manager" value={sub.salesperson ?? '—'} />
          <Fact label="Discounts applied" value={sub.discounts.join(', ') || 'None'} />
        </dl>

        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100">
          {sub.canPause && (
            <button
              disabled={working}
              onClick={() => {
                if (window.confirm('Pause this subscription? Paused time is not billed.')) {
                  act(() => api.pauseSubscription(sub.id), 'Subscription paused', `${sub.number} is on hold.`);
                }
              }}
              className={`${buttonClass} bg-amber-50 text-amber-700 hover:bg-amber-100`}
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          )}
          {sub.canResume && (
            <button
              disabled={working}
              onClick={() => act(() => api.resumeSubscription(sub.id), 'Subscription resumed', `${sub.number} is active again.`)}
              className={`${buttonClass} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
            >
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
          )}
          {sub.canRenew && (
            <button
              disabled={working}
              onClick={() => act(() => api.renewSubscription(sub.id), 'Subscription renewed', 'Your expiry date moved by one billing period.')}
              className={`${buttonClass} bg-lavender-100 text-primary hover:bg-lavender-200`}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Renew
            </button>
          )}
          {(sub.status === 'active' || sub.status === 'paused') && (
            <Link
              to={`/portal/discounts?subscription=${sub.id}`}
              className={`${buttonClass} bg-slate-100 text-slate-700 hover:bg-slate-200`}
            >
              <Percent className="w-3.5 h-3.5" /> Request a discount
            </Link>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="px-5 py-4 border-b border-slate-100 text-sm font-semibold text-slate-900">What's included</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-xs text-slate-400 text-left">
                <th className="px-5 py-2 font-medium">Product</th>
                <th className="px-5 py-2 font-medium text-right">Qty</th>
                <th className="px-5 py-2 font-medium text-right">Unit price</th>
                <th className="px-5 py-2 font-medium text-right">Tax</th>
                <th className="px-5 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sub.lines.map(line => (
                <tr key={line.id}>
                  <td className="px-5 py-3 text-slate-900">
                    {line.productName}
                    {line.variantLabel && <span className="text-slate-400"> · {line.variantLabel}</span>}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">{line.quantity}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{formatINR(line.unitPrice)}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{formatINR(line.taxAmount)}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-900">{formatINR(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="px-5 py-4 border-b border-slate-100 text-sm font-semibold text-slate-900">History</h2>
        <ul className="divide-y divide-slate-100">
          {sub.history.map(event => (
            <li key={event.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="min-w-0">
                <span className="block text-sm text-slate-900">{event.status}</span>
                {event.note && <span className="block text-xs text-slate-400 truncate">{event.note}</span>}
              </span>
              <span className="text-xs text-slate-400 shrink-0">{formatDate(event.changedAt)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
};
