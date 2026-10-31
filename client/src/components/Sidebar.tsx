import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  FileSpreadsheet,
  Repeat,
  FileText,
  DollarSign,
  Percent,
  Receipt,
  BarChart3,
  CalendarDays,
  UserCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/plans', label: 'Plans', icon: CreditCard },
  { to: '/quotations', label: 'Quotations', icon: FileSpreadsheet },
  { to: '/subscriptions', label: 'Subscriptions', icon: Repeat },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/payments', label: 'Payments', icon: DollarSign },
  { to: '/discounts', label: 'Discounts', icon: Percent },
  { to: '/taxes', label: 'Taxes', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/calendar', label: 'Sales Calendar', icon: CalendarDays },
  { to: '/users', label: 'Users', icon: UserCheck, adminOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();
  const [runningCycle, setRunningCycle] = useState(false);

  const handleRunCycle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bill every subscription due today? This creates real invoices in the shared database.')) return;
    try {
      setRunningCycle(true);
      const res = await api.runBillingCycle();
      
      // Fire celebratory confetti!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.85, x: 0.1 },
        colors: ['#5145E5', '#818CF8', '#10B981', '#EEEBFF'],
      });

      success(
        'Billing Run Complete',
        `${res.created} invoices created, ${res.skipped} already billed, ${res.failed} failed.`
      );
      window.dispatchEvent(new Event('billing-cycle-complete'));
    } catch (e: any) {
      error('Failed to run cycle', e.message);
    } finally {
      setRunningCycle(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200/80 transition-all duration-300 ease-in-out lg:static ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header / Brand & Workspace Environment Switcher */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-100 relative">
          {!collapsed ? (
            <NavLink to="/" className="flex-1 min-w-0 pr-2 flex items-center gap-2.5 p-1.5 -ml-1 rounded-xl">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/30">
                <span className="text-white font-bold text-sm tracking-tight">B</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-slate-900 text-sm tracking-tight leading-tight truncate">
                  Brightloop
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Subscription Management</span>
              </div>
            </NavLink>
          ) : (
            <NavLink to="/" className="w-full flex justify-center">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/30 hover:scale-105 transition-transform">
                <span className="text-white font-bold text-base tracking-tight">B</span>
              </div>
            </NavLink>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {navItems.filter(item => isAdmin || !item.adminOnly).map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 group ${
                    isActive
                      ? 'bg-lavender-100 text-primary font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  } ${collapsed ? 'justify-center px-0 h-10 w-full' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active Route Left Accent Pip */}
                    {isActive && (
                      <span className="absolute left-1 w-1 h-4 rounded-full bg-primary" />
                    )}
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                        isActive ? 'text-primary' : 'text-slate-500'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Billing Run (admin only, as the API requires) */}
        {isAdmin && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          {!collapsed ? (
            <div className="group">
              <button
                onClick={handleRunCycle}
                disabled={runningCycle}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold btn-interaction transition-all bg-slate-900 text-white group-hover:bg-primary group-hover:shadow-md group-hover:shadow-primary/30 disabled:opacity-50"
              >
                <Zap
                  className={`w-3.5 h-3.5 ${
                    runningCycle ? 'animate-spin' : 'text-slate-300 group-hover:text-amber-300'
                  }`}
                />
                {runningCycle ? 'Running Automation...' : 'Trigger Billing Run'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleRunCycle}
              disabled={runningCycle}
              title="Run Automated Billing Cycle"
              className="w-full h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-primary btn-interaction transition-colors disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 text-amber-300 ${runningCycle ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        )}
      </aside>
    </>
  );
};
