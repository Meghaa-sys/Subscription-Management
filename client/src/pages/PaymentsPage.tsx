import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, CheckCircle, AlertCircle, Clock, CreditCard, Search, X } from 'lucide-react';
import { api } from '../api/client';
import { Payment, Invoice } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  const { success, error } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [payList, invList] = await Promise.all([
        api.getPayments(),
        api.getInvoices({ status: 'all' }),
      ]);
      setPayments(payList);
      const unpaid = invList.filter(i => i.status !== 'paid');
      setInvoices(unpaid);
      if (unpaid.length > 0 && !selectedInvoiceId) {
        setSelectedInvoiceId(unpaid[0].id);
      }
    } catch (err: any) {
      error('Failed to load payments', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) return;

    try {
      const targetInvoice = invoices.find(i => i.id === selectedInvoiceId);
      const res = await api.recordPayment({
        invoiceId: selectedInvoiceId,
        paymentMethod,
        amount: targetInvoice?.total,
      });
      success('Payment Recorded', `Successfully reconciled ₹${res.payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} for ${res.invoice.invoiceNumber}.`);
      setIsRecordModalOpen(false);
      loadData();
    } catch (err: any) {
      error('Payment Failed', err.message);
    }
  };

  const filteredPayments = payments.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.paymentReference.toLowerCase().includes(q) ||
      (p.customerName || '').toLowerCase().includes(q) ||
      p.transactionId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1580px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time transaction settlements, gateway reconciliations, and payout ledger.
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
            placeholder="Search by payment reference, customer, or transaction ID..."
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
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Transaction ID</th>
                <th className="py-3.5 px-6 text-right">Settled Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No payments found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map(pay => (
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
                      ₹{pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-600 capitalize">
                      {pay.paymentMethod.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={pay.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-400">
                      {pay.transactionId}
                    </td>
                    <td className="py-3.5 px-6 text-right text-xs text-slate-500">
                      {new Date(pay.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Record Offline Payment</h3>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                All existing invoices are currently settled! No open balances.
              </div>
            ) : (
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Select Open Invoice *
                  </label>
                  <select
                    required
                    value={selectedInvoiceId}
                    onChange={e => setSelectedInvoiceId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.customerName} (₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Settlement Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="upi">UPI AutoPay / e-Mandate (NPCI)</option>
                    <option value="bank_transfer">HDFC Corporate NetBanking (NEFT/RTGS)</option>
                    <option value="credit_card">Corporate RuPay / Visa Business Card</option>
                    <option value="wire">Corporate RTGS Settlement</option>
                  </select>
                </div>

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
