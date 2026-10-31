import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, Users, Sparkles, Zap, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { BillingInterval, Plan } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const PERIOD_LABEL: Record<BillingInterval, string> = {
  daily: 'day',
  weekly: 'wk',
  monthly: 'mo',
  annual: 'yr',
};

const EMPTY_FORM = {
  name: '',
  billingInterval: 'monthly' as BillingInterval,
  price: 999,
  minQuantity: 1,
};

export const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [intervalFilter, setIntervalFilter] = useState<'all' | BillingInterval>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const loadData = async () => {
    try {
      setPlans(await api.getPlans());
    } catch (err: any) {
      error('Failed to load plans', err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      await api.createPlan(formData);

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#5145E5', '#10B981'],
      });

      success('Plan Created', `${formData.name} is now available.`);
      setIsAddModalOpen(false);
      setFormData(EMPTY_FORM);
      loadData();
    } catch (err: any) {
      error('Failed to create plan', err.message);
    }
  };

  const filteredPlans = plans.filter(p => {
    if (intervalFilter === 'all') return true;
    return p.billingInterval === intervalFilter;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1580px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Subscription Plans</h1>
          <p className="text-sm text-slate-500 mt-1">
            Billing cadence and the lifecycle rules each plan allows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Interval Toggle */}
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center text-xs font-medium shadow-2xs">
            {(['all', 'daily', 'weekly', 'monthly', 'annual'] as const).map(interval => (
              <button
                key={interval}
                onClick={() => setIntervalFilter(interval)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  intervalFilter === interval ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {interval}
              </button>
            ))}
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm btn-interaction transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Plan
            </button>
          )}
        </div>
      </div>

      {/* Plans Grid with Signature Click-to-Brighten Theme Interaction */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map(plan => {
          return (
            <div
              key={plan.id}
              onClick={() => navigate('/subscriptions')}
              className="group rounded-2xl p-6 flex flex-col justify-between cursor-pointer select-none card-theme-brighten bg-white border border-slate-200/80 shadow-card"
            >
              {/* Top Accent Line illuminates on Hover */}
              <div className="absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r from-primary via-lavender-300 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div>
                {/* Header Tag and Interval */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-all duration-200 text-primary bg-lavender-100 group-hover:bg-primary group-hover:text-white group-hover:shadow-xs">
                    Plan
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Active
                    </span>
                    <span className="text-xs text-slate-400 capitalize font-medium">
                      {plan.billingInterval} Cadence
                    </span>
                  </div>
                </div>

                {/* Plan Title */}
                <h3 className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-primary transition-colors">
                  {plan.name}
                </h3>

                {/* Price Display */}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight group-hover:scale-105 transition-transform origin-left">
                    ${plan.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    /{PERIOD_LABEL[plan.billingInterval]}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">List price. Invoices are built from product lines.</p>

                {/* Features List */}
                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-slate-600">
                      <Check className="w-3.5 h-3.5 shrink-0 text-emerald-500 group-hover:text-primary transition-colors" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Interactive Section */}
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                {/* Subscribers count & estimated run rate */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Subscribers</span>
                  <span className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg border text-slate-900 bg-slate-50 border-slate-100 group-hover:bg-lavender-100 group-hover:text-primary group-hover:border-primary/20 transition-colors">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    {plan.activeSubscribers} clients
                  </span>
                </div>

                {/* Expanded Actions on Hover */}
                <div className="pt-2 border-t border-primary/10 flex items-center gap-2 max-h-0 group-hover:max-h-16 opacity-0 group-hover:opacity-100 overflow-hidden transition-all duration-300">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      navigate('/quotations');
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs flex items-center justify-center gap-1.5 btn-interaction"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Create Quote
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      navigate('/subscriptions');
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-white border border-primary/30 text-primary text-xs font-semibold hover:bg-lavender-50 shadow-2xs flex items-center justify-center gap-1.5 btn-interaction"
                  >
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Plan Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Create Pricing Plan</h3>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Enterprise Custom Tier"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Billing Interval</label>
                  <select
                    value={formData.billingInterval}
                    onChange={e => setFormData({ ...formData, billingInterval: e.target.value as BillingInterval })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">List Price *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Minimum Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={formData.minQuantity}
                  onChange={e => setFormData({ ...formData, minQuantity: Math.max(1, Number(e.target.value)) })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
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
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
