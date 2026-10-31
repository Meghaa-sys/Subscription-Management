import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Repeat, FileText, X, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { Customer, Invoice, Subscription } from '../types';
import { StatusBadge } from './StatusBadge';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    customers: Customer[];
    invoices: Invoice[];
    subscriptions: Subscription[];
  }>({ customers: [], invoices: [], subscriptions: [] });

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ customers: [], invoices: [], subscriptions: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ customers: [], invoices: [], subscriptions: [] });
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search(query);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle keydown for escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalResults =
    results.customers.length + results.invoices.length + results.subscriptions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search customers, subscriptions, invoices (e.g. a name, INV/2026, SUB-00012)..."
            className="w-full text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:outline-hidden bg-transparent"
          />
          {loading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />}
          {query && !loading && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-medium text-slate-400 bg-slate-100 rounded border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">
          {!query.trim() ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500">Quickly find customers, billing records, or invoices</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">Try "INV/2026"</span>
                <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">Try "SUB-00012"</span>
              </div>
            </div>
          ) : totalResults === 0 && !loading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No matching records found for "{query}".
            </div>
          ) : (
            <>
              {/* Customers list */}
              {results.customers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <Users className="w-3.5 h-3.5" />
                    Customers
                  </div>
                  <div className="space-y-1">
                    {results.customers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onClose();
                          navigate(`/customers?id=${c.id}`);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={c.avatar}
                            alt={c.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-900 group-hover:text-primary transition-colors">
                              {c.name}
                            </p>
                            <p className="text-xs text-slate-400">{c.email} • {c.company}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={c.status} size="sm" />
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices list */}
              {results.invoices.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <FileText className="w-3.5 h-3.5" />
                    Invoices
                  </div>
                  <div className="space-y-1">
                    {results.invoices.map(inv => (
                      <div
                        key={inv.id}
                        onClick={() => {
                          onClose();
                          navigate(`/invoices?id=${inv.id}`);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-primary flex items-center justify-center font-mono text-xs font-semibold">
                            INV
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 group-hover:text-primary transition-colors">
                              {inv.invoiceNumber}
                            </p>
                            <p className="text-xs text-slate-400">Due {inv.dueDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-900">₹{inv.total.toFixed(2)}</span>
                          <StatusBadge status={inv.status} size="sm" />
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subscriptions list */}
              {results.subscriptions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <Repeat className="w-3.5 h-3.5" />
                    Subscriptions
                  </div>
                  <div className="space-y-1">
                    {results.subscriptions.map(sub => (
                      <div
                        key={sub.id}
                        onClick={() => {
                          onClose();
                          navigate(`/subscriptions?id=${sub.id}`);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900 group-hover:text-primary transition-colors">
                            {sub.number} • {sub.customerName}
                          </p>
                          <p className="text-xs text-slate-400">
                            ₹{sub.amount}/{sub.billingCycle} • Next billing {sub.nextRenewal}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={sub.status} size="sm" />
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">ESC</kbd> to exit</span>
          <span>Instant Unified Search</span>
        </div>
      </div>
    </div>
  );
};
