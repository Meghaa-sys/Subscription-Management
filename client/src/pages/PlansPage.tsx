import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Check,
  Users,
  Calendar,
  ArrowRight,
  Sparkles,
  Zap,
  Calculator,
  X,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { Plan, Product } from '../types';
import { useToast } from '../context/ToastContext';

export const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [intervalFilter, setIntervalFilter] = useState<'all' | 'monthly' | 'annual'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Selected / Brightened plan card state
  const [brightenedPlanId, setBrightenedPlanId] = useState<string | null>(null);

  // Interactive seat simulation counters per plan
  const [seatSimulations, setSeatSimulations] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    productId: '',
    name: '',
    billingInterval: 'monthly',
    price: 99,
    seatBased: false,
    pricePerSeat: 20,
    features: '',
  });

  const navigate = useNavigate();
  const { success, error } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [plns, prods] = await Promise.all([api.getPlans(), api.getProducts()]);
      setPlans(plns);
      setProducts(prods);

      // Initialize default brightened plan
      if (plns.length > 0 && !brightenedPlanId) {
        setBrightenedPlanId(plns[0].id);
      }

      // Initialize seat counters
      const initialSeats: Record<string, number> = {};
      plns.forEach(p => {
        initialSeats[p.id] = p.seatBased ? 5 : 1;
      });
      setSeatSimulations(initialSeats);

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

  const handleCardClick = (planId: string) => {
    setBrightenedPlanId(prev => (prev === planId ? null : planId));
  };

  const handleSeatChange = (planId: string, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSeatSimulations(prev => {
      const current = prev[planId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [planId]: next };
    });
  };

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

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#5145E5', '#10B981'],
      });

      success('Plan Created', `${formData.name} is now available.`);
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
            Pricing structures, billing cadence, seat matrices, and features. Click any plan box to inspect and brighten with theme.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Interval Toggle */}
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center text-xs font-medium shadow-2xs">
            <button
              onClick={() => setIntervalFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                intervalFilter === 'all' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setIntervalFilter('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                intervalFilter === 'monthly' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIntervalFilter('annual')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                intervalFilter === 'annual' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm btn-interaction transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Plan
          </button>
        </div>
      </div>

      {/* Plans Grid with Signature Click-to-Brighten Theme Interaction */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map(plan => {
          const product = products.find(p => p.id === plan.productId);
          const isBrightened = brightenedPlanId === plan.id;
          const seats = seatSimulations[plan.id] || 1;
          const calculatedPrice = plan.seatBased
            ? plan.price + Math.max(0, seats - 1) * plan.pricePerSeat
            : plan.price;
          const mrrYield = calculatedPrice * (plan.activeSubscribers || 1);

          return (
            <div
              key={plan.id}
              onClick={() => navigate(`/subscriptions?plan=${plan.id}`)}
              className="group rounded-2xl p-6 flex flex-col justify-between cursor-pointer select-none card-theme-brighten bg-white border border-slate-200/80 shadow-card"
            >
              {/* Top Accent Line illuminates on Hover */}
              <div className="absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r from-primary via-lavender-300 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div>
                {/* Header Tag and Interval */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-all duration-200 text-primary bg-lavender-100 group-hover:bg-primary group-hover:text-white group-hover:shadow-xs">
                    {product ? product.name : 'Platform Plan'}
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
                    ₹{calculatedPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    /{plan.billingInterval === 'annual' ? 'yr' : 'mo'}
                  </span>
                </div>

                {/* Seat Stepper or Flat indicator */}
                {plan.seatBased ? (
                  <div className="mt-2.5 p-2 rounded-xl bg-slate-50/80 border border-slate-200/70 group-hover:bg-white/90 group-hover:border-primary/30 transition-colors flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">
                      Seats ({seats}):
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={e => handleSeatChange(plan.id, -1, e)}
                        className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-transform"
                        title="Remove seat"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold text-primary w-5 text-center">
                        {seats}
                      </span>
                      <button
                        onClick={e => handleSeatChange(plan.id, 1, e)}
                        className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-transform"
                        title="Add seat"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Flat rate • Unlimited users</p>
                )}

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
                      navigate(`/quotations?plan=${plan.id}`);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs flex items-center justify-center gap-1.5 btn-interaction"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Create Quote
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      navigate(`/subscriptions?plan=${plan.id}`);
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
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Billing Interval</label>
                  <select
                    value={formData.billingInterval}
                    onChange={e => setFormData({ ...formData, billingInterval: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Base Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Min Quantity</label>
                  <input
                    type="number"
                    min={1}
                    defaultValue={1}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Availability Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Available From</label>
                  <input
                    type="date"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Available Until (optional)</label>
                  <input
                    type="date"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Lifecycle Controls */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Plan Lifecycle Controls</p>
                {[
                  { id: 'autoClose', label: 'Auto-close when availability period ends', default: true },
                  { id: 'allowEarlyClose', label: 'Allow early cancellation before expiry', default: true },
                  { id: 'allowPause', label: 'Allow subscription pause / resume', default: true },
                  { id: 'allowRenewal', label: 'Allow early manual renewal', default: true },
                ].map(ctrl => (
                  <label key={ctrl.id} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      defaultChecked={ctrl.default}
                      className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                    />
                    <span className="text-xs text-slate-700 group-hover:text-slate-900">{ctrl.label}</span>
                  </label>
                ))}
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
                      Price per additional seat (₹)
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
