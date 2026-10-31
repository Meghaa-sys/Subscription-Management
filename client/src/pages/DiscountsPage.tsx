import React, { useState, useEffect } from 'react';
import { Percent, Plus, Tag, Check, Calendar, Users, X } from 'lucide-react';
import { api } from '../api/client';
import { Discount } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';

export const DiscountsPage: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'percentage',
    value: 20,
    validUntil: '2027-12-31',
    usageLimit: 100,
  });

  const { success, error } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getDiscounts();
      setDiscounts(data);
    } catch (err: any) {
      error('Failed to load discounts', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.value) return;

    try {
      await api.createDiscount({
        code: formData.code.toUpperCase().trim(),
        name: formData.name || formData.code,
        type: formData.type as any,
        value: Number(formData.value),
        validUntil: formData.validUntil,
        usageLimit: Number(formData.usageLimit),
      });
      success('Discount Created', `Code ${formData.code.toUpperCase()} is active.`);
      setIsAddModalOpen(false);
      setFormData({ code: '', name: '', type: 'percentage', value: 20, validUntil: '2027-12-31', usageLimit: 100 });
      loadData();
    } catch (err: any) {
      error('Failed to create discount', err.message);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1580px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Discounts &amp; Coupons</h1>
          <p className="text-sm text-slate-500 mt-1">
            Promotional codes, percentage discounts, and fixed credits.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Discount
        </button>
      </div>

      {/* Discounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {discounts.map(disc => (
          <div
            key={disc.id}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 flex flex-col justify-between card-hover-lift"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono font-bold text-sm bg-lavender-100 text-primary px-3 py-1 rounded-lg border border-primary/20">
                  {disc.code}
                </span>
                <StatusBadge status={disc.status} size="sm" />
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-2">{disc.name}</h3>
              <p className="text-2xl font-black font-mono text-slate-900 mt-3">
                {disc.type === 'percentage' ? `${disc.value}% OFF` : `₹${disc.value.toLocaleString('en-IN')} OFF`}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Usage</span>
                <span className="font-mono text-slate-800">
                  {disc.usedCount} / {disc.usageLimit} redeemed
                </span>
              </div>
              <div className="flex justify-between">
                <span>Valid Until</span>
                <span className="text-slate-800">{disc.validUntil}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">New Promotion Code</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. SUMMER2026"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Internal Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Summer Special 20% Off"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Value *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Max Redemptions</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.usageLimit}
                    onChange={e => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
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
                  Save Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
