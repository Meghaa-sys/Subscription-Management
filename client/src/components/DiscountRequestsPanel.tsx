import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Discount, DiscountRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from './StatusBadge';

/** Customer discount requests: staff forward or reject, the admin approves or rejects. */
export const DiscountRequestsPanel: React.FC<{ discounts: Discount[] }> = ({ discounts }) => {
  const [requests, setRequests] = useState<DiscountRequest[]>([]);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState('');
  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const load = async () => {
    try {
      setRequests(await api.getDiscountRequests(['pending', 'forwarded']));
    } catch (err: any) {
      error('Failed to load discount requests', err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (request: DiscountRequest, action: () => Promise<unknown>, done: string) => {
    try {
      setWorkingId(request.id);
      await action();
      success(done, `${request.customerName}, ${request.subscriptionNumber}`);
      await load();
    } catch (err: any) {
      error('That did not work', err.message);
    } finally {
      setWorkingId('');
    }
  };

  const activeDiscounts = discounts.filter(discount => discount.status === 'active');

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">Customer requests</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {isAdmin ? 'Approve or reject requests.' : 'Forward requests to the admin, or reject them.'}
        </p>
      </div>

      {requests.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No requests waiting.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {requests.map(request => (
            <li key={request.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-6 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{request.customerName}</span>
                  <StatusBadge status={request.status} size="sm" />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{request.subscriptionNumber}</p>
                <p className="text-xs text-slate-600 mt-1 break-words">{request.message}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isAdmin && (
                  <>
                    <select
                      aria-label="Discount to apply"
                      value={chosen[request.id] ?? ''}
                      onChange={e => setChosen({ ...chosen, [request.id]: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                    >
                      <option value="">No discount attached</option>
                      {activeDiscounts.map(discount => (
                        <option key={discount.id} value={discount.id}>
                          {discount.name}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={workingId === request.id}
                      onClick={() =>
                        act(request, () => api.approveDiscountRequest(request.id, chosen[request.id]), 'Request approved')
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  </>
                )}
                {!isAdmin && request.status === 'pending' && (
                  <button
                    disabled={workingId === request.id}
                    onClick={() => act(request, () => api.forwardDiscountRequest(request.id), 'Request forwarded')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    Forward
                  </button>
                )}
                <button
                  disabled={workingId === request.id}
                  onClick={() => act(request, () => api.rejectDiscountRequest(request.id), 'Request rejected')}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
