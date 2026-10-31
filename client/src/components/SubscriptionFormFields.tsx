import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Customer, Discount, NewSubscription, PaymentTerm, Plan, Product } from '../types';
import { useToast } from '../context/ToastContext';

const FIELD = 'w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden';
const LABEL = 'block text-xs font-medium text-slate-700 mb-1';

export const EMPTY_SUBSCRIPTION: NewSubscription = {
  customerId: '',
  planId: '',
  productId: '',
  quantity: 1,
  paymentTermId: '',
  discountId: '',
  notes: '',
};

interface Props {
  value: NewSubscription;
  onChange: (value: NewSubscription) => void;
  showNotes?: boolean;
}

/** The fields a quotation and a subscription share. Loads its own dropdown lists. */
export const SubscriptionFormFields: React.FC<Props> = ({ value, onChange, showNotes = false }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [terms, setTerms] = useState<PaymentTerm[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const { error } = useToast();

  useEffect(() => {
    Promise.all([api.getCustomers(), api.getPlans(), api.getProducts(), api.getPaymentTerms(), api.getDiscounts()])
      .then(([custs, plns, prods, paymentTerms, discs]) => {
        const sellable = prods.filter(p => p.productType !== 'addon');
        setCustomers(custs);
        setPlans(plns);
        setProducts(sellable);
        setTerms(paymentTerms);
        setDiscounts(discs.filter(d => d.status === 'active'));
        onChange({
          ...value,
          customerId: value.customerId || custs[0]?.id || '',
          planId: value.planId || plns[0]?.id || '',
          productId: value.productId || sellable[0]?.id || '',
          paymentTermId: value.paymentTermId || paymentTerms[0]?.id || '',
        });
      })
      .catch(err => error('Failed to load form options', err.message));
  }, []);

  const set = (changes: Partial<NewSubscription>) => onChange({ ...value, ...changes });

  return (
    <>
      <div>
        <label className={LABEL}>Customer *</label>
        <select required value={value.customerId} onChange={e => set({ customerId: e.target.value })} className={FIELD}>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.company})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL}>Plan *</label>
        <select required value={value.planId} onChange={e => set({ planId: e.target.value })} className={FIELD}>
          {plans.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.billingInterval}, minimum {p.minQuantity})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={LABEL}>Product *</label>
          <select required value={value.productId} onChange={e => set({ productId: e.target.value })} className={FIELD}>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} - ${p.salesPrice}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Quantity</label>
          <input
            type="number"
            min={1}
            value={value.quantity}
            onChange={e => set({ quantity: Math.max(1, Number(e.target.value)) })}
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Payment Terms</label>
          <select value={value.paymentTermId} onChange={e => set({ paymentTermId: e.target.value })} className={FIELD}>
            {terms.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Discount (Optional)</label>
          <select value={value.discountId} onChange={e => set({ discountId: e.target.value })} className={FIELD}>
            <option value="">None</option>
            {discounts.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showNotes && (
        <div>
          <label className={LABEL}>Notes</label>
          <textarea
            rows={2}
            value={value.notes}
            onChange={e => set({ notes: e.target.value })}
            placeholder="Terms or anything the customer should know"
            className={FIELD}
          />
        </div>
      )}
    </>
  );
};
