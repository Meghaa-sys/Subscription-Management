import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import { api } from '../api/client';
import { NewSubscription, Quotation } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { EMPTY_SUBSCRIPTION, SubscriptionFormFields } from '../components/SubscriptionFormFields';
import { useToast } from '../context/ToastContext';

export const QuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewSubscription>(EMPTY_SUBSCRIPTION);

  const { success, error } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getQuotations();
      setQuotations(data.results);
      setTotal(data.count);
    } catch (err: any) {
      error('Failed to load quotations', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConvertQuotation = async (id: string, quoteNumber: string) => {
    try {
      setConvertingId(id);
      await api.convertQuotation(id);
      success('Quotation Converted', `${quoteNumber} is now active. Its first invoice comes from the next billing run.`);
      loadData();
    } catch (err: any) {
      error('Conversion failed', err.message);
    } finally {
      setConvertingId(null);
    }
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createQuotation(form);
      success('Quotation Created', `${created.quotationNumber} is ready, valid for 30 days.`);
      setIsCreateModalOpen(false);
      setForm(EMPTY_SUBSCRIPTION);
      loadData();
    } catch (err: any) {
      error('Failed to create quotation', err.message);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1580px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Quotations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Proposals waiting for acceptance. Converting one activates its subscription.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Quotation
        </button>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Quote #</th>
                <th className="py-3.5 px-6">Client</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Subtotal</th>
                <th className="py-3.5 px-6">Total (inc. Tax)</th>
                <th className="py-3.5 px-6">Valid Until</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading quotations...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No quotations found.
                  </td>
                </tr>
              ) : (
                quotations.map(quote => (
                  <tr key={quote.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-semibold text-primary">
                      {quote.quotationNumber}
                    </td>
                    <td className="py-3.5 px-6 font-medium text-slate-900">
                      <div>
                        <span>{quote.customerName}</span>
                        <span className="block text-xs text-slate-400">{quote.contactEmail}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={quote.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-600">
                      ${quote.subtotal.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      ${quote.total.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-500">
                      {quote.validUntil}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => handleConvertQuotation(quote.id, quote.quotationNumber)}
                        disabled={convertingId === quote.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 border border-emerald-200/60 transition-colors disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        {convertingId === quote.id ? 'Converting...' : 'Accept & Convert'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && total > quotations.length && (
          <p className="px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
            Showing the latest {quotations.length.toLocaleString()} of {total.toLocaleString()}.
          </p>
        )}
      </div>

      {/* Create Quotation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Create New Quotation</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4">
              <SubscriptionFormFields value={form} onChange={setForm} showNotes />

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary-hover shadow-sm"
                >
                  Generate Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
