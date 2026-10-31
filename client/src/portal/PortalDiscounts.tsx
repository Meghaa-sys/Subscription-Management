import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { Card, formatDate, Message, PageHeader, portalInputClass, usePortalData } from './shared';

export const PortalDiscounts: React.FC = () => {
  const [params] = useSearchParams();
  const load = useCallback(async () => {
    const [subscriptions, requests] = await Promise.all([api.getPortalSubscriptions(), api.getMyDiscountRequests()]);
    return { subscriptions: subscriptions.filter(row => row.status === 'active' || row.status === 'paused'), requests };
  }, []);
  const { data, loading, reload } = usePortalData(load, 'Failed to load discount requests');
  const { success, error } = useToast();

  const [subscriptionId, setSubscriptionId] = useState(params.get('subscription') ?? '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSending(true);
      await api.requestDiscount(subscriptionId, message);
      success('Request sent', 'The Brightloop team will review it.');
      setMessage('');
      setSubscriptionId('');
      await reload();
    } catch (err: any) {
      error('Failed to send request', err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Message>Loading...</Message>;
  if (!data) return <Message>Discount requests could not be loaded.</Message>;

  return (
    <>
      <PageHeader title="Discounts" subtitle="Ask for a discount on a subscription and follow its review here." />

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Request a discount</h2>
        {data.subscriptions.length === 0 ? (
          <p className="text-sm text-slate-400">You need an active subscription to request a discount.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="subscription" className="block text-xs font-medium text-slate-700 mb-1">
                Subscription
              </label>
              <select
                id="subscription"
                required
                value={subscriptionId}
                onChange={e => setSubscriptionId(e.target.value)}
                className={portalInputClass}
              >
                <option value="">Choose a subscription</option>
                {data.subscriptions.map(row => (
                  <option key={row.id} value={row.id}>
                    {row.number} · {row.planName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reason" className="block text-xs font-medium text-slate-700 mb-1">
                Why are you asking?
              </label>
              <textarea
                id="reason"
                required
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className={portalInputClass}
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm shadow-emerald-600/25 disabled:opacity-50 transition-all"
            >
              {sending ? 'Sending...' : 'Send request'}
            </button>
          </form>
        )}
      </Card>

      <Card>
        <h2 className="px-5 py-4 border-b border-slate-100 text-sm font-semibold text-slate-900">Your requests</h2>
        {data.requests.length === 0 ? (
          <Message>You have not requested a discount yet.</Message>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.requests.map(row => (
              <li key={row.id} className="flex items-start justify-between gap-3 px-5 py-4">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900">{row.subscriptionNumber}</span>
                  <span className="block text-xs text-slate-500 mt-0.5 break-words">{row.message}</span>
                  <span className="block text-[11px] text-slate-400 mt-1">
                    Sent {formatDate(row.createdAt)}
                    {row.discountName ? ` · ${row.discountName} applied` : ''}
                  </span>
                </span>
                <StatusBadge status={row.status} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
};
