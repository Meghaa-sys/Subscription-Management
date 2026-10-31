import React, { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Printer } from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Card, formatDate, formatINR, Message, PageHeader, usePortalData } from './shared';

export const PortalInvoices: React.FC = () => {
  const { data, loading } = usePortalData(api.getPortalInvoices, 'Failed to load invoices');

  return (
    <>
      <PageHeader title="Invoices" subtitle="Open one to see its details or print it." />
      <Card>
        {loading ? (
          <Message>Loading...</Message>
        ) : !data || data.length === 0 ? (
          <Message>You have no invoices yet.</Message>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.map(row => (
              <li key={row.id}>
                <Link
                  to={`/portal/invoices/${row.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 truncate">{row.invoiceNumber}</span>
                    <span className="block text-xs text-slate-400 mt-0.5">
                      Issued {formatDate(row.issueDate)} · Due {formatDate(row.dueDate)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="text-right">
                      <span className="block text-sm font-medium text-slate-900">{formatINR(row.total)}</span>
                      {row.balance > 0 && row.status !== 'void' && (
                        <span className="block text-[11px] text-slate-400">{formatINR(row.balance)} due</span>
                      )}
                    </span>
                    <StatusBadge status={row.status} size="sm" />
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
};

const TotalRow: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className={`flex justify-between gap-6 ${strong ? 'text-base font-semibold text-slate-900' : 'text-sm text-slate-600'}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export const PortalInvoiceDetail: React.FC = () => {
  const { id = '' } = useParams();
  const load = useCallback(() => api.getPortalInvoice(id), [id]);
  const { data: invoice, loading } = usePortalData(load, 'Failed to load invoice');

  const back = (
    <Link
      to="/portal/invoices"
      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 print:hidden"
    >
      <ArrowLeft className="w-3.5 h-3.5" /> All invoices
    </Link>
  );

  if (loading) return <Message>Loading...</Message>;
  if (!invoice) {
    return (
      <>
        {back}
        <Message>This invoice could not be found on your account.</Message>
      </>
    );
  }

  return (
    <>
      {back}
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`Billing period ${formatDate(invoice.periodStart)} to ${formatDate(invoice.periodEnd)}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={invoice.status} />
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors print:hidden"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        }
      />

      <Card className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">Billed to</p>
            <p className="font-medium text-slate-900 mt-0.5">{invoice.customerName}</p>
            {invoice.customerCompany && <p className="text-slate-600">{invoice.customerCompany}</p>}
            {invoice.customerAddress && <p className="text-slate-600 whitespace-pre-line">{invoice.customerAddress}</p>}
          </div>
          <div>
            <p className="text-xs text-slate-400">Issued</p>
            <p className="font-medium text-slate-900 mt-0.5">{formatDate(invoice.issueDate)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Due</p>
            <p className="font-medium text-slate-900 mt-0.5">{formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[440px]">
            <thead>
              <tr className="text-xs text-slate-400 text-left border-b border-slate-100">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 font-medium text-right">Qty</th>
                <th className="py-2 font-medium text-right">Unit price</th>
                <th className="py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lineItems.map((item, index) => (
                <tr key={index}>
                  <td className="py-3 text-slate-900">{item.description}</td>
                  <td className="py-3 text-right text-slate-600">{item.quantity}</td>
                  <td className="py-3 text-right text-slate-600">{formatINR(item.unitPrice)}</td>
                  <td className="py-3 text-right font-medium text-slate-900">{formatINR(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sm:ml-auto sm:w-72 space-y-2 pt-3 border-t border-slate-100">
          <TotalRow label="Subtotal" value={formatINR(invoice.subtotal)} />
          {invoice.discountAmount > 0 && <TotalRow label="Discount" value={`-${formatINR(invoice.discountAmount)}`} />}
          <TotalRow label="Tax" value={formatINR(invoice.taxAmount)} />
          <TotalRow label="Total" value={formatINR(invoice.total)} strong />
          <TotalRow label="Paid" value={formatINR(invoice.total - invoice.balance)} />
          <TotalRow label="Balance due" value={formatINR(invoice.balance)} strong />
        </div>
      </Card>

      {invoice.payments.length > 0 && (
        <Card>
          <h2 className="px-5 py-4 border-b border-slate-100 text-sm font-semibold text-slate-900">Payments</h2>
          <ul className="divide-y divide-slate-100">
            {invoice.payments.map(payment => (
              <li key={payment.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="text-slate-600">
                  {formatDate(payment.paymentDate)} · {payment.paymentMethod}
                </span>
                <span className="font-medium text-slate-900">{formatINR(payment.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
};
