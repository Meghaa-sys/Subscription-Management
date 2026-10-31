import React from 'react';
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
  UserCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
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
  { to: '/users', label: 'Users', icon: UserCheck },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const { success, error } = useToast();
  const [runningCycle, setRunningCycle] = React.useState(false);

  const handleRunCycle = async () => {
    try {
      setRunningCycle(true);
      const res = await api.runBillingCycle();
      success(
        'Billing cycle executed',
        `${res.renewalsProcessed} renewals invoiced, ${res.invoicesMarkedOverdue} overdue status checked.`
      );
      // Trigger a soft event for pages to refetch
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
        {/* Header / Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <NavLink to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/30">
              <span className="text-white font-bold text-base tracking-tight">S</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900 text-[15px] tracking-tight leading-none">
                  SubscriptIQ
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mt-1">
                  Brightloop Software
                </span>
              </div>
            )}
          </NavLink>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-lavender-100 text-primary font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  } ${collapsed ? 'justify-center px-0 h-10 w-full' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 transition-colors ${
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

        {/* Footer: Scheduled Billing Automation Action */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          {!collapsed ? (
            <div className="bg-white rounded-xl p-3 border border-slate-200/70 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Billing Automation
                </span>
                <span className="text-[10px] text-slate-400">Scheduled</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2 leading-tight">
                Scheduled engine checks for renewals &amp; overdue dunning.
              </p>
              <button
                onClick={handleRunCycle}
                disabled={runningCycle}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-primary transition-colors disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 text-amber-300 ${runningCycle ? 'animate-spin' : ''}`} />
                {runningCycle ? 'Running Cycle...' : 'Run Billing Cycle'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleRunCycle}
              disabled={runningCycle}
              title="Run Automated Billing Cycle"
              className="w-full h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-primary transition-colors disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 text-amber-300 ${runningCycle ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
