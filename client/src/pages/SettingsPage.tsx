import React, { useState, useEffect } from 'react';
import { CalendarClock, Clock, UserRound } from 'lucide-react';
import { api } from '../api/client';
import { PaymentTerm } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const [terms, setTerms] = useState<PaymentTerm[]>([]);
  const { user } = useAuth();
  const { error } = useToast();

  useEffect(() => {
    api
      .getPaymentTerms()
      .then(setTerms)
      .catch(err => error('Failed to load payment terms', err.message));
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1580px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Your account and billing configuration.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
            <UserRound className="w-4 h-4 text-primary" />
            Your Account
          </div>
          <p className="text-sm font-medium text-slate-900">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
          <p className="text-xs text-slate-500 capitalize">Role: {user?.role}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
            <CalendarClock className="w-4 h-4 text-primary" />
            Payment Terms
          </div>
          {terms.map(term => (
            <div key={term.id} className="flex items-center justify-between text-xs text-slate-600">
              <span>{term.name}</span>
              <span className="font-mono text-slate-900">{term.dueDays} days</span>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-primary" />
            Billing Schedule
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            The scheduler bills everything due at 00:05 and closes expired subscriptions at 00:10,
            Asia/Kolkata time, while <span className="font-mono">manage.py scheduler</span> is running.
          </p>
        </div>
      </div>
    </div>
  );
};
