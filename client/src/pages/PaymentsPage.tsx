import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { api } from '../api/client';
import { Invoice, PaymentMethod } from '../types';
import { LoadMore } from '../components/LoadMore';
import { RecordPaymentFields } from '../components/RecordPaymentFields';
import { useToast } from '../context/ToastContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePagedList } from '../hooks/usePagedList';

export const PaymentsPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [amount, setAmount] = useState('');

  const { success, error } = useToast();

  const load = useCallback(
    (pageNumber: number) => api.getPayments({ search: debouncedSearch, pageNumber }),
    [debouncedSearch]
  );
  const { rows: payments, total, loading, loadingMore, reload, loadMore } = usePagedList(load, message =>
    error('Failed to load payments', message)
  );

  const selectInvoice = (invoice?: Invoice) => {
    setSelectedInvoiceId(invoice?.id ?? '');
    setAmount(invoice ? invoice.balance.toFixed(2) : '');
  };

  useEffect(() => {
    if (!isRecordModalOpen) return;
    api
      .getOpenInvoices()
      .then(data => {
        setInvoices(data.results);
        selectInvoice(data.results[0]);
      })
      .catch(err => error('Failed to load open invoices', err.message));
  }, [isRecordModalOpen]);

  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) return;

    try {
      const invoice = await api.recordPayment({
        invoiceId: selectedInvoiceId,
        paymentMethod,
        amount: Number(amount),
      });
      success('Payment Recorded', `₹${Number(amount).toFixed(2)} applied to ${invoice.invoiceNumber}.`);
      setIsRecordModalOpen(false);
      reload();
    } catch (err: any) {
      error('Payment Failed', err.message);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1580px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Money received against invoices. Payments are recorded here, not collected online.
          </p>
        </div>

        <button
          onClick={() => setIsRecordModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice #, customer, or note..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Payment Ref</th>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Invoice #</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6">Method</th>
                <th className="py-3.5 px-6">Note</th>
                <th className="py-3.5 px-6 text-right">Payment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payments found.
                  </td>
                </tr>
              ) : (
                payments.map(pay => (
                  <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-medium text-slate-900">
                      {pay.paymentReference}
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      {pay.customerName}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-primary text-xs">
                      {pay.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      ₹{pay.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-600">{pay.paymentMethod}</td>
                    <td className="py-3.5 px-6 text-xs text-slate-400">{pay.note || '—'}</td>
                    <td className="py-3.5 px-6 text-right text-xs text-slate-500">{pay.paymentDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && <LoadMore shown={payments.length} total={total} loading={loadingMore} onClick={loadMore} />}
      </div>

      {/* Record Payment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Record Payment</h3>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No confirmed invoices have a balance to pay.
              </div>
            ) : (
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Open Invoice (oldest first) *
                  </label>
                  <select
                    required
                    value={selectedInvoiceId}
                    onChange={e => selectInvoice(invoices.find(i => i.id === e.target.value))}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.customerName} (₹{inv.balance.toFixed(2)} due)
                      </option>
                    ))}
                  </select>
                </div>

                <RecordPaymentFields
                  amount={amount}
                  balance={selectedInvoice?.balance ?? 0}
                  method={paymentMethod}
                  onAmountChange={setAmount}
                  onMethodChange={setPaymentMethod}
                />

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRecordModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary-hover shadow-sm"
                  >
                    Post Payment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
