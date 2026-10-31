import { useCallback, useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useToast } from '../context/ToastContext';

export const formatINR = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDate = (value?: string | null) => {
  if (!value || value === '—') return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const INTERVAL_LABELS: Record<string, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  annual: 'year',
};

export const portalInputClass =
  'w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all';

/** Loads one screen's data. `load` must be stable: wrap it in useCallback if it uses props. */
export function usePortalData<T>(load: () => Promise<T>, errorTitle: string) {
  const { error } = useToast();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setData(await load());
    } catch (err: any) {
      setData(null);
      error(errorTitle, err.message);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, reload };
}

export const PageHeader: FC<{ title: string; subtitle?: string; action?: ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const Card: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-emerald-950/5 shadow-card hover:border-emerald-200/70 transition-colors ${className}`}>{children}</div>
);

export const Message: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="py-12 px-6 text-center text-sm text-slate-400">{children}</p>
);
