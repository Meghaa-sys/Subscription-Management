import React from 'react';
import { PAYMENT_METHODS, PaymentMethod } from '../types';

const FIELD = 'w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden';
const LABEL = 'block text-xs font-medium text-slate-700 mb-1';

interface Props {
  amount: string;
  balance: number;
  method: PaymentMethod;
  onAmountChange: (amount: string) => void;
  onMethodChange: (method: PaymentMethod) => void;
}

/** Amount and method for a payment. A smaller amount records a part payment. */
export const RecordPaymentFields: React.FC<Props> = ({ amount, balance, method, onAmountChange, onMethodChange }) => (
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className={LABEL}>Amount Received *</label>
      <input
        type="number"
        required
        min="0.01"
        max={balance}
        step="0.01"
        value={amount}
        onChange={e => onAmountChange(e.target.value)}
        className={FIELD}
      />
    </div>
    <div>
      <label className={LABEL}>Payment Method *</label>
      <select value={method} onChange={e => onMethodChange(e.target.value as PaymentMethod)} className={FIELD}>
        {PAYMENT_METHODS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </div>
);
