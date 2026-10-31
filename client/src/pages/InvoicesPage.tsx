import React, { useCallback, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Printer, DollarSign, X, CheckCircle, BadgeCheck } from 'lucide-react';
import { api } from '../api/client';
import { Invoice, PaymentMethod } from '../types';
import { LoadMore } from '../components/LoadMore';
import { RecordPaymentFields } from '../components/RecordPaymentFields';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePagedList } from '../hooks/usePagedList';

const canPay = (invoice: Invoice) => invoice.status === 'pending' || invoice.status === 'overdue';

export const InvoicesPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  // Selected Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Quick Payment Modal
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [paymentAmount, setPaymentAmount] = useState('');

  const [searchParams] = useSearchParams();
  const { success, error } = useToast();

  const load = useCallback(
    (pageNumber: number) => api.getInvoices({ status: statusFilter, search: debouncedSearch, pageNumber }),
    [statusFilter, debouncedSearch]
  );
  const {
    rows: invoices,
    total,
    loading,
    loadingMore,
    reload: loadInvoices,
    loadMore,
  } = usePagedList(load, message => error('Failed to load invoices', message));

  const openPayment = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setPaymentAmount(invoice.balance.toFixed(2));
  };

  // Open invoice if query ?id=... is present
  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl) {
      handleViewInvoice(idFromUrl);
    }
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl) {
      setStatusFilter(statusFromUrl);
    }
  }, [searchParams]);

  const handleViewInvoice = async (id: string) => {
    try {
      setSelectedInvoice(await api.getInvoice(id));
    } catch (err: any) {
      error('Failed to load invoice details', err.message);
    }
  };

  const handleConfirmInvoice = async (invoice: Invoice) => {
    try {
      await api.confirmInvoice(invoice.id);
      success('Invoice Confirmed', `${invoice.invoiceNumber} can now receive payments.`);
      loadInvoices();
    } catch (err: any) {
      error('Failed to confirm invoice', err.message);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;

    try {
      const updated = await api.recordPayment({
        invoiceId: paymentInvoice.id,
        paymentMethod,
        amount: Number(paymentAmount),
      });
      success('Payment Recorded', `$${Number(paymentAmount).toFixed(2)} applied to ${updated.invoiceNumber}.`);
      setPaymentInvoice(null);
      if (selectedInvoice && selectedInvoice.id === updated.id) {
        setSelectedInvoice(updated);
      }
      loadInvoices();
    } catch (err: any) {
      error('Payment recording failed', err.message);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1580px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated billing statements, payment reconciliation, and audit archives.
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
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
              <option value="void">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice # or customer..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Invoice #</th>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Issue Date</th>
                <th className="py-3.5 px-6">Due Date</th>
                <th className="py-3.5 px-6">Total Amount</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map(inv => (
                  <tr
                    key={inv.id}
                    onClick={() => handleViewInvoice(inv.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-6 font-mono font-semibold text-primary">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-6 font-medium text-slate-900">
                      {inv.customerName}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-500">{inv.issueDate}</td>
                    <td className="py-3.5 px-6 text-xs text-slate-500">{inv.dueDate}</td>
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      ₹{inv.total.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-6 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {inv.status === 'draft' && (
                          <button
                            onClick={() => handleConfirmInvoice(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-lavender-100 text-primary text-xs font-medium hover:bg-lavender-200 border border-primary/20 transition-colors"
                          >
                            <BadgeCheck className="w-3.5 h-3.5" />
                            Confirm
                          </button>
                        )}
                        {canPay(inv) && (
                          <button
                            onClick={() => openPayment(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 border border-emerald-200/60 transition-colors"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Record Pay
                          </button>
                        )}
                        <button
                          onClick={() => handleViewInvoice(inv.id)}
                          className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-medium transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && <LoadMore shown={invoices.length} total={total} loading={loadingMore} onClick={loadMore} />}
      </div>

      {/* Invoice Detail & Printable View Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Actions Bar */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 print:hidden">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Invoice Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / PDF
                </button>
                {canPay(selectedInvoice) && (
                  <button
                    onClick={() => openPayment(selectedInvoice)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Record Payment
                  </button>
                )}
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Formal Invoice Letterhead Content */}
            <div className="p-8 space-y-6">
              {/* Header: Company & Invoice Info */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">
                      S
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">
                      Brightloop Software
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <h2 className="text-2xl font-black font-mono text-slate-900">
                    {selectedInvoice.invoiceNumber}
                  </h2>
                  <div className="mt-1">
                    <StatusBadge status={selectedInvoice.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Issue Date: <span className="font-medium text-slate-800">{selectedInvoice.issueDate}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Due Date: <span className="font-medium text-slate-800">{selectedInvoice.dueDate}</span>
                  </p>
                </div>
              </div>

              {/* Billed To */}
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Billed To
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {selectedInvoice.customerName}
                </p>
                <p>{selectedInvoice.customerCompany}</p>
                <p>{selectedInvoice.customerEmail}</p>
                <p>{selectedInvoice.customerAddress}</p>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Unit Price</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.lineItems?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{item.description}</td>
                        <td className="py-2.5 px-4 text-center text-slate-500">{item.quantity}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                          ₹{item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900">
                          ₹{item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end text-xs">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-mono">₹{selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount</span>
                      <span className="font-mono">-₹{selectedInvoice.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>Tax</span>
                    <span className="font-mono">₹{selectedInvoice.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                    <span>Total Amount</span>
                    <span className="font-mono">₹{selectedInvoice.total.toFixed(2)}</span>
                  </div>
                  {canPay(selectedInvoice) && (
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>Balance Due</span>
                      <span className="font-mono">₹{selectedInvoice.balance.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Proof / Settlement Info */}
              {selectedInvoice.status === 'paid' && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs text-emerald-900">
                    <p className="font-semibold">Invoice Fully Settled</p>
                    {selectedInvoice.paidAt && (
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Last payment on {selectedInvoice.paidAt} via {selectedInvoice.paymentMethod}.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Dialog */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Record Payment for {paymentInvoice.invoiceNumber}
              </h3>
              <button
                onClick={() => setPaymentInvoice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Customer</span>
                  <span className="font-medium text-slate-800">{paymentInvoice.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Balance Due</span>
                  <span className="font-bold text-slate-900 font-mono">
                    ${paymentInvoice.balance.toFixed(2)}
                  </span>
                </div>
              </div>

              <RecordPaymentFields
                amount={paymentAmount}
                balance={paymentInvoice.balance}
                method={paymentMethod}
                onAmountChange={setPaymentAmount}
                onMethodChange={setPaymentMethod}
              />

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentInvoice(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm transition-colors"
                >
                  Confirm &amp; Reconcile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
