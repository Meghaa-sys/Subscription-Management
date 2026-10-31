import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Check, Users, Calendar, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { Plan, Product } from '../types';
import { useToast } from '../context/ToastContext';

export const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [intervalFilter, setIntervalFilter] = useState<'all' | 'monthly' | 'annual'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    productId: '',
    name: '',
    billingInterval: 'monthly',
    price: 99,
    seatBased: false,
    pricePerSeat: 20,
    features: '',
  });

  const { success, error } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [plns, prods] = await Promise.all([api.getPlans(), api.getProducts()]);
      setPlans(plns);
      setProducts(prods);
      if (prods.length > 0 && !formData.productId) {
        setFormData(prev => ({ ...prev, productId: prods[0].id }));
      }
    } catch (err: any) {
      error('Failed to load plans', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.productId) return;

    try {
      const featArray = formData.features.split(',').map(s => s.trim()).filter(Boolean);
      await api.createPlan({
        productId: formData.productId,
        name: formData.name,
        billingInterval: formData.billingInterval as any,
        price: Number(formData.price),
        seatBased: Boolean(formData.seatBased),
        pricePerSeat: formData.seatBased ? Number(formData.pricePerSeat) : 0,
        features: featArray,
      });
      success('Plan created', `${formData.name} is now available.`);
      setIsAddModalOpen(false);
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
            Pricing structures, billing cadence, seat matrices, and features.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Interval Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-medium">
            <button
              onClick={() => setIntervalFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                intervalFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setIntervalFilter('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                intervalFilter === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIntervalFilter('annual')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                intervalFilter === 'annual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Annual
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Plan
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map(plan => {
          const product = products.find(p => p.id === plan.productId);

          return (
            <div
              key={plan.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 flex flex-col justify-between card-hover-lift relative overflow-hidden"
            >
              {/* Product tag */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-primary bg-lavender-100 px-2.5 py-0.5 rounded-full">
                  {product ? product.name : 'Platform Plan'}
                </span>
                <span className="text-xs text-slate-400 capitalize">
                  {plan.billingInterval} cadence
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>

                {/* Price Display */}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">
                    ${plan.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    /{plan.billingInterval === 'annual' ? 'yr' : 'mo'}
                  </span>
                </div>

                {/* Seat based indicator */}
                {plan.seatBased ? (
                  <p className="text-xs text-indigo-600 font-medium mt-1">
                    +${plan.pricePerSeat}/seat/mo for extra members
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Flat rate • Unlimited users</p>
                )}

                {/* Features */}
                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-slate-600">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subscribers Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Subscribers</span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  {plan.activeSubscribers} clients
                </span>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Parent Product *</label>
                <select
                  required
                  value={formData.productId}
                  onChange={e => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

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
                    onChange={e => setFormData({ ...formData, billingInterval: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Base Price ($) *</label>
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

              {/* Seat based toggle */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.seatBased}
                    onChange={e => setFormData({ ...formData, seatBased: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-semibold text-slate-800">Enable Seat-Based Pricing</span>
                </label>
                {formData.seatBased && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Price per additional seat ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.pricePerSeat}
                      onChange={e => setFormData({ ...formData, pricePerSeat: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Included Features (comma separated)</label>
                <input
                  type="text"
                  value={formData.features}
                  onChange={e => setFormData({ ...formData, features: e.target.value })}
                  placeholder="e.g. 50k MAU, Dedicated Slack, 99.99% SLA"
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
