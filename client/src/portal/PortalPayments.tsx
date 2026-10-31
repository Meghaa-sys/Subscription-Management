import React from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Card, formatDate, formatINR, Message, PageHeader, usePortalData } from './shared';

export const PortalPayments: React.FC = () => {
  const { data, loading } = usePortalData(api.getPortalPayments, 'Failed to load payments');

  return (
    <>
      <PageHeader title="Payments" subtitle="Payments appear here once the Brightloop team has recorded them." />
      <Card>
        {loading ? (
          <Message>Loading...</Message>
        ) : !data || data.length === 0 ? (
          <Message>No payments recorded yet.</Message>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.map(row => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{row.paymentReference}</span>
                  <span className="block text-xs text-slate-400 mt-0.5">
                    {formatDate(row.paymentDate)} · {row.paymentMethod} ·{' '}
                    <Link to={`/portal/invoices/${row.invoiceId}`} className="text-emerald-600 hover:text-emerald-700 hover:underline">
                      {row.invoiceNumber}
                    </Link>
                  </span>
                </span>
                <span className="text-sm font-medium text-slate-900 shrink-0">{formatINR(row.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
};
