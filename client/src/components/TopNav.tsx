import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  Calendar,
  Check,
  RefreshCw,
  LogOut,
  Building,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api/client';
import { AuditLog } from '../types';
import { useToast } from '../context/ToastContext';

interface TopNavProps {
  onOpenSearch: () => void;
  onOpenMobileSidebar: () => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenSearch,
  onOpenMobileSidebar,
  dateFilter,
  setDateFilter,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [notifications, setNotifications] = useState<AuditLog[]>([]);
  const [hasUnread, setHasUnread] = useState(true);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const { success, error } = useToast();

  useEffect(() => {
    api.getAuditLogs().then(data => setNotifications(data.slice(0, 5))).catch(console.error);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setShowDateMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResetData = async () => {
    try {
      await api.resetDemoData();
      success('Database reset', 'Demo data restored to pristine initial state.');
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      error('Failed to reset', e.message);
    }
  };

  const dateOptions = [
    { label: 'Last 7 Days', value: '7 days' },
    { label: 'Last 30 Days', value: '30 days' },
    { label: 'Last 3 Months', value: '3 months' },
    { label: 'Last 12 Months', value: '12 months' },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile Hamburger & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-400 hover:border-slate-300 hover:bg-white transition-all duration-150 text-left shadow-2xs group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
            <span className="truncate">Search customers, invoices, subscriptions...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-medium text-slate-400 bg-white border border-slate-200 rounded-md">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Date Filter Dropdown */}
        <div className="relative" ref={dateRef}>
          <button
            onClick={() => setShowDateMenu(!showDateMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">{dateOptions.find(o => o.value === dateFilter)?.label || dateFilter}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showDateMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-dropdown border border-slate-200 py-1 z-40 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Time Period
              </div>
              {dateOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setDateFilter(opt.value);
                    setShowDateMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                    dateFilter === opt.value
                      ? 'bg-lavender-100 text-primary font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  {dateFilter === opt.value && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setHasUnread(false);
            }}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-dropdown border border-slate-200 p-2 z-40 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-900">Billing &amp; Audit Activity</span>
                <span className="text-[10px] bg-lavender-100 text-primary px-2 py-0.5 rounded-full font-medium">
                  Live Stream
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No recent billing events</p>
                ) : (
                  notifications.map(item => (
                    <div key={item.id} className="p-3 hover:bg-slate-50 transition-colors rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-900 leading-tight">
                          {item.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">{item.details}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <span>Actor: {item.actor}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1 sm:px-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Megha"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20"
            />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-none">Megha</span>
              <span className="text-[10px] text-slate-400 mt-0.5 leading-none">Admin</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-dropdown border border-slate-200 p-1.5 z-40 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-semibold text-slate-900">Megha</p>
                <p className="text-[11px] text-slate-500 truncate">megha@brightloop.io</p>
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-medium bg-lavender-100 text-primary px-2 py-0.5 rounded-md">
                  <Building className="w-3 h-3" /> Brightloop Software
                </div>
              </div>

              <button
                onClick={handleResetData}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset Demo Dataset</span>
              </button>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  success('Signed in as Megha', 'Administrator session active.');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                <span>RBAC Permissions: Full</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                onClick={() => setShowUserMenu(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
