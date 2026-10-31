import React, { useState } from 'react';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { Card, formatINR, INTERVAL_LABELS, Message, PageHeader, usePortalData } from './shared';
import { FakePaymentModal, PaymentItem } from './FakePaymentModal';

export const PortalPlans: React.FC = () => {
  const { data, loading } = usePortalData(api.getCatalogue, 'Failed to load plans');
  const [paymentItem, setPaymentItem] = useState<PaymentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePurchasePlan = (plan: any) => {
    setPaymentItem({
      id: plan.id,
      name: `${plan.name} Plan`,
      amount: plan.price,
      type: 'plan',
      interval: INTERVAL_LABELS[plan.billingInterval],
    });
    setIsModalOpen(true);
  };

  const handlePurchaseProduct = (product: any) => {
    setPaymentItem({
      id: product.id,
      name: product.name,
      amount: product.salesPrice,
      type: 'product',
    });
    setIsModalOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Plans and products"
        subtitle="Choose a plan or product below to purchase instantly with our secure checkout."
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
                <Card key={plan.id} className="p-5 border-emerald-950/5 hover:border-emerald-300/80 transition-all flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{plan.name}</h3>
                    <p className="mt-2 text-xl font-semibold text-emerald-600">
                      {formatINR(plan.price)}
                      <span className="text-xs font-medium text-slate-400"> / {INTERVAL_LABELS[plan.billingInterval]}</span>
                    </p>
                    <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
                      {plan.features.map(feature => (
                        <li key={feature} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handlePurchasePlan(plan)}
                    className="w-full mt-5 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs shadow-sm shadow-emerald-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Subscribe & Pay Now
                  </button>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.products.map(product => (
                <Card key={product.id} className="p-5 border-emerald-950/5 hover:border-emerald-300/80 transition-all flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-400">{product.category}</p>
                    <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{product.name}</h3>
                    <p className="mt-2 text-sm font-medium text-slate-900">{formatINR(product.salesPrice)}</p>
                    {product.features.length > 0 && (
                      <p className="mt-2 text-xs text-slate-500">{product.features.join(' · ')}</p>
                    )}
                  </div>

                  <button
                    onClick={() => handlePurchaseProduct(product)}
                    className="w-full mt-4 py-2 px-3 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-semibold text-xs border border-slate-200/80 hover:border-emerald-300/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    Buy Now
                  </button>
                </Card>
              ))}
            </div>
          </section>

          <FakePaymentModal
            item={paymentItem}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        </>
      )}
    </>
  );
};
