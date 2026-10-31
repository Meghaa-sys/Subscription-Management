import React, { useCallback, useState } from 'react';
import { Plus, Play, Pause, XCircle, Filter, AlertTriangle, Search, X } from 'lucide-react';
import { api, formatMoney } from '../api/client';
import { NewSubscription, Subscription } from '../types';
import { LoadMore } from '../components/LoadMore';
import { StatusBadge } from '../components/StatusBadge';
import { EMPTY_SUBSCRIPTION, SubscriptionFormFields } from '../components/SubscriptionFormFields';
import { useToast } from '../context/ToastContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePagedList } from '../hooks/usePagedList';

const NOT_YET_ACTIVE = ['draft', 'quotation', 'confirmed'];

export const SubscriptionsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [closeModalSub, setCloseModalSub] = useState<Subscription | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [form, setForm] = useState<NewSubscription>(EMPTY_SUBSCRIPTION);

  const { success, error } = useToast();

  const load = useCallback(
    (pageNumber: number) => api.getSubscriptions({ status: statusFilter, search: debouncedSearch, pageNumber }),
    [statusFilter, debouncedSearch]
  );
  const {
    rows: subscriptions,
    total,
    loading,
    loadingMore,
    reload,
    loadMore,
  } = usePagedList(load, message => error('Failed to load subscriptions', message));

  const runAction = async (action: Promise<unknown>, done: string, failed: string) => {
    try {
      await action;
      success(done, 'Saved.');
      reload();
    } catch (err: any) {
      error(failed, err.message);
    }
  };

  const handleConfirmClose = async () => {
    if (!closeModalSub) return;
    try {
      await api.closeSubscription(closeModalSub.id, closeReason);
      success('Subscription Closed', `${closeModalSub.number} has been closed.`);
      setCloseModalSub(null);
      setCloseReason('');
      reload();
    } catch (err: any) {
      error('Failed to close', err.message);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createSubscription(form);
      success('Subscription Active', `${created.number} is active. Its first invoice comes from the next billing run.`);
      setIsAddModalOpen(false);
      setForm(EMPTY_SUBSCRIPTION);
      reload();
    } catch (err: any) {
      error('Failed to create subscription', err.message);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1580px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Subscriptions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Recurring contracts, billing dates, and status management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-transparent focus:outline-hidden"
            >
              <option value="all">All States</option>
              <option value="draft">Draft</option>
              <option value="quotation">Quotation</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            New Subscription
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by subscription # or customer..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Subscription</th>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Plan &amp; Cycle</th>
                <th className="py-3.5 px-6">Billing Amount</th>
                <th className="py-3.5 px-6">Next Billing</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No subscriptions matching filter.
                  </td>
                </tr>
              ) : (
                subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-medium text-slate-900">
                      {sub.number}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={sub.customerAvatar}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">
                            {sub.customerName}
                          </p>
                          <p className="text-xs text-slate-400">{sub.customerEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <p className="font-medium text-slate-900">{sub.planName}</p>
                      <p className="text-xs text-slate-400 capitalize">
                        {sub.billingCycle} • Qty {sub.quantity}
                      </p>
                    </td>
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      ₹{formatMoney(sub.amount)}
                    </td>
                    <td className="py-3.5 px-6 text-xs">
                      <p className="font-medium text-slate-800">{sub.nextRenewal}</p>
                      {sub.status === 'active' && (
                        <p className="text-[11px] text-slate-400">
                          {sub.daysRemaining > 0
                            ? `in ${sub.daysRemaining} ${sub.daysRemaining === 1 ? 'day' : 'days'}`
                            : 'Due for billing'}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {NOT_YET_ACTIVE.includes(sub.status) && (
                          <button
                            onClick={() =>
                              runAction(api.activateSubscription(sub.id), 'Subscription Activated', 'Failed to activate')
                            }
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Activate Subscription"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {sub.status === 'active' && (
                          <button
                            onClick={() =>
                              runAction(api.pauseSubscription(sub.id), 'Subscription Paused', 'Failed to pause')
                            }
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Pause Subscription"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {sub.status === 'paused' && (
                          <button
                            onClick={() =>
                              runAction(api.resumeSubscription(sub.id), 'Subscription Resumed', 'Failed to resume')
                            }
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Resume Subscription"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {(sub.status === 'active' || sub.status === 'paused') && (
                          <button
                            onClick={() => setCloseModalSub(sub)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Close Subscription"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <LoadMore shown={subscriptions.length} total={total} loading={loadingMore} onClick={loadMore} />
        )}
      </div>

      {/* New Subscription Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">New Subscription</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <SubscriptionFormFields value={form} onChange={setForm} />

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary-hover shadow-sm"
                >
                  Activate Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Confirmation Modal */}
      {closeModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Close {closeModalSub.number}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Billing stops for good. A closed subscription cannot be reopened.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reason for closing
              </label>
              <textarea
                rows={2}
                maxLength={255}
                value={closeReason}
                onChange={e => setCloseReason(e.target.value)}
                placeholder="e.g. Project finished, switched plan, budget constraints"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCloseModalSub(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Keep Open
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-sm"
              >
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
