import React from 'react';

interface LoadMoreProps {
  shown: number;
  total: number;
  loading: boolean;
  onClick: () => void;
}

/** "Showing X of Y" under a long table, with a button while more rows exist. */
export const LoadMore: React.FC<LoadMoreProps> = ({ shown, total, loading, onClick }) => {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
      <span>
        Showing {shown.toLocaleString()} of {total.toLocaleString()}
      </span>
      {shown < total && (
        <button
          onClick={onClick}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
};
