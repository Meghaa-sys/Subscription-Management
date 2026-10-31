import React from 'react';
import { api } from '../api/client';
import { Card, formatINR, INTERVAL_LABELS, Message, PageHeader, usePortalData } from './shared';

export const PortalPlans: React.FC = () => {
  const { data, loading } = usePortalData(api.getCatalogue, 'Failed to load plans');

  return (
    <>
      <PageHeader
        title="Plans and products"
        subtitle="What's available today. To change or add to your subscription, contact your account manager."
      />

      {loading ? (
        <Message>Loading...</Message>
      ) : !data ? (
        <Message>Plans could not be loaded.</Message>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.plans.map(plan => (
                <Card key={plan.id} className="p-5">
                  <h3 className="text-base font-semibold text-slate-900">{plan.name}</h3>
                  <p className="mt-2 text-xl font-semibold text-primary">
                    {formatINR(plan.price)}
                    <span className="text-xs font-medium text-slate-400"> / {INTERVAL_LABELS[plan.billingInterval]}</span>
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-slate-500">
                    {plan.features.map(feature => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.products.map(product => (
                <Card key={product.id} className="p-5">
                  <p className="text-xs font-medium text-slate-400">{product.category}</p>
                  <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{product.name}</h3>
                  <p className="mt-2 text-sm font-medium text-slate-900">{formatINR(product.salesPrice)}</p>
                  {product.features.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">{product.features.join(' · ')}</p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
};
