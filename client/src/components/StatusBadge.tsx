import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = (status || '').toLowerCase().replace(/[\s-]/g, '_');

  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let dot = 'bg-slate-400';

  if (['active', 'paid', 'successful', 'accepted', 'approved'].includes(norm)) {
    bg = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    dot = 'bg-emerald-500';
  } else if (['pending', 'sent', 'trialing', 'forwarded'].includes(norm)) {
    bg = 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
    dot = 'bg-indigo-500';
  } else if (['paused', 'draft'].includes(norm)) {
    bg = 'bg-amber-50 text-amber-700 border-amber-200/60';
    dot = 'bg-amber-500';
  } else if (['overdue', 'cancelled', 'failed', 'rejected', 'past_due'].includes(norm)) {
    bg = 'bg-rose-50 text-rose-700 border-rose-200/60';
    dot = 'bg-rose-500';
  }

  const label = status
    ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
    : 'Unknown';

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bg} ${sizeClasses} capitalize transition-colors`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};
