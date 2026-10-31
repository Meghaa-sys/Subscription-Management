import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Percent,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { Quotation, Customer, Plan } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';

export const QuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [discountCode, setDiscountCode] = useState('');
  const [taxRate, setTaxRate] = useState(18.0);
  const [notes, setNotes] = useState('');

  const { success, error } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [quots, custs, plns] = await Promise.all([
        api.getQuotations(),
        api.getCustomers(),
        api.getPlans(),
      ]);
      setQuotations(quots);
      setCustomers(custs);
      setPlans(plns);
      if (custs.length > 0 && !selectedCustomerId) setSelectedCustomerId(custs[0].id);
      if (plns.length > 0 && !selectedPlanId) setSelectedPlanId(plns[0].id);
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
      const res = await api.convertQuotation(id);
      success(
        'Quotation Converted!',
        `${quoteNumber} converted to active Subscription #${res.subscription.id} and Invoice #${res.invoice.invoiceNumber}.`
      );
      loadData();
    } catch (err: any) {
      error('Conversion failed', err.message);
    } finally {
      setConvertingId(null);
    }
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan || !selectedCustomerId) return;

    try {
      const items = [
        {
          planId: plan.id,
          name: `${plan.name} (${plan.billingInterval})`,
          quantity: Number(quantity),
          unitPrice: plan.price,
          total: plan.price * Number(quantity),
        },
      ];

      await api.createQuotation({
        customerId: selectedCustomerId,
        items,
        discountCode: discountCode || null,
        taxRate: Number(taxRate),
        notes,
      });

      success('Quotation Created', 'New quotation saved in draft status.');
      setIsCreateModalOpen(false);
      setNotes('');
      setDiscountCode('');
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
            Enterprise proposals, discounts, tax calculations, and subscription conversions.
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
                      ₹{quote.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      ₹{quote.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-500">
                      {quote.validUntil}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      {quote.status !== 'accepted' ? (
                        <button
                          onClick={() => handleConvertQuotation(quote.id, quote.quotationNumber)}
                          disabled={convertingId === quote.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 border border-emerald-200/60 transition-colors disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          {convertingId === quote.id ? 'Converting...' : 'Accept & Convert'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Converted
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Plan / Tier *</label>
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
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Promo Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={discountCode}
                    onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GROWTH20"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    GST Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxRate}
                    onChange={e => setTaxRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Proposal Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Terms, custom SLA guarantees, validity terms..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

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
