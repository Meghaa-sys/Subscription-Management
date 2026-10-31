import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { api } from '../api/client';
import { Tax } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const EMPTY_FORM = { name: '', rate: 18, taxType: 'percent' as Tax['taxType'] };

export const TaxesPage: React.FC = () => {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      setTaxes(await api.getTaxes());
    } catch (err: any) {
      error('Failed to load taxes', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      await api.createTax({ ...formData, rate: Number(formData.rate) });
      success('Tax Rule Added', `${formData.name} is now configured.`);
      setIsAddModalOpen(false);
      setFormData(EMPTY_FORM);
      loadData();
    } catch (err: any) {
      error('Failed to create tax rule', err.message);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1580px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tax Configurations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Taxes attached to products and applied when invoices are generated.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Tax Rule
          </button>
        )}
      </div>

      {/* Taxes Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Tax Name</th>
                <th className="py-3.5 px-6">Rate</th>
                <th className="py-3.5 px-6">Type</th>
                <th className="py-3.5 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    Loading tax rules...
                  </td>
                </tr>
              ) : taxes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No tax rules found.
                  </td>
                </tr>
              ) : (
                taxes.map(tax => (
                  <tr key={tax.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">{tax.name}</td>
                    <td className="py-3.5 px-6 font-mono font-bold text-primary">
                      {tax.taxType === 'percent' ? `${tax.rate.toFixed(2)}%` : `$${tax.rate.toFixed(2)}`}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-500">
                      {tax.taxType === 'percent' ? 'Percentage' : 'Fixed amount'}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <StatusBadge status={tax.status} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Tax Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">New Tax Rule</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. GST 18%"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.taxType}
                    onChange={e => setFormData({ ...formData, taxType: e.target.value as Tax['taxType'] })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Rate *</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={formData.rate}
                    onChange={e => setFormData({ ...formData, rate: Number(e.target.value) })}
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
                  Save Tax Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
