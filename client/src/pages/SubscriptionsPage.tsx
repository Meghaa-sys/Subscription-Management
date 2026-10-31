import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Repeat,
  Plus,
  Play,
  Pause,
  XCircle,
  Filter,
  Calendar,
  AlertTriangle,
  User,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { Subscription, Customer, Plan } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';

export const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [cancelModalSub, setCancelModalSub] = useState<Subscription | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [quantity, setQuantity] = useState(1);

  const [searchParams] = useSearchParams();
  const { success, error } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [subs, custs, plns] = await Promise.all([
        api.getSubscriptions({ status: statusFilter }),
        api.getCustomers(),
        api.getPlans(),
      ]);
      setSubscriptions(subs);
      setCustomers(custs);
      setPlans(plns);
      if (custs.length > 0 && !selectedCustomerId) setSelectedCustomerId(custs[0].id);
      if (plns.length > 0 && !selectedPlanId) setSelectedPlanId(plns[0].id);
    } catch (err: any) {
      error('Failed to load subscriptions', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handlePause = async (id: string) => {
    try {
      await api.pauseSubscription(id);
      success('Subscription Paused', `Subscription #${id} has been paused.`);
      loadData();
    } catch (err: any) {
      error('Failed to pause', err.message);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.resumeSubscription(id);
      success('Subscription Resumed', `Subscription #${id} is now active.`);
      loadData();
    } catch (err: any) {
      error('Failed to resume', err.message);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalSub) return;
    try {
      await api.cancelSubscription(cancelModalSub.id, cancelReason);
      success('Subscription Cancelled', `Subscription #${cancelModalSub.id} has been cancelled.`);
      setCancelModalSub(null);
      setCancelReason('');
      loadData();
    } catch (err: any) {
      error('Failed to cancel', err.message);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedPlanId) return;

    try {
      await api.createSubscription({
        customerId: selectedCustomerId,
        planId: selectedPlanId,
        billingCycle,
        quantity: Number(quantity),
      });
      success('Subscription Created', 'Active subscription and initial invoice generated.');
      setIsAddModalOpen(false);
      loadData();
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
            Active recurring contracts, renewal monitoring, and status management.
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
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="paused">Paused</option>
              <option value="past_due">Past Due</option>
              <option value="cancelled">Cancelled</option>
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
                <th className="py-3.5 px-6">Next Renewal</th>
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
                      #{sub.id}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={sub.customerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={sub.customerName}
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
                        {sub.billingCycle} • {sub.quantity} {sub.quantity === 1 ? 'seat' : 'seats'}
                      </p>
                    </td>
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      ₹{sub.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-6 text-xs">
                      <p className="font-medium text-slate-800">{sub.nextRenewal}</p>
                      <p className="text-[11px] text-slate-400">
                        {sub.daysRemaining > 0 ? `${sub.daysRemaining} days left` : 'Due today/overdue'}
                      </p>
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {sub.status === 'active' && (
                          <button
                            onClick={() => handlePause(sub.id)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Pause Subscription"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {sub.status === 'paused' && (
                          <button
                            onClick={() => handleResume(sub.id)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Resume Subscription"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {sub.status !== 'cancelled' && (
                          <button
                            onClick={() => setCancelModalSub(sub)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Cancel Subscription"
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
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Customer *</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Pricing Plan *</label>
                <select
                  required
                  value={selectedPlanId}
                  onChange={e => setSelectedPlanId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ₹{p.price.toLocaleString('en-IN')}/{p.billingInterval}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={billingCycle}
                    onChange={e => setBillingCycle(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual (Prepaid)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Quantity / Seats</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

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

      {/* Cancel Confirmation Modal */}
      {cancelModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Cancel Subscription #{cancelModalSub.id}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                This will prevent future automated billing. Access will continue until the end of the current cycle.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reason for cancellation
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="e.g. Project finished, switched plan, budget constraints"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalSub(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
