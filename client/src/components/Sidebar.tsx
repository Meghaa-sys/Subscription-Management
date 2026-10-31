import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
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
  TrendingUp,
  Server,
  Check,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
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
  { to: '/calendar', label: 'Sales Calendar', icon: CalendarDays },
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
  const [runningCycle, setRunningCycle] = useState(false);
  const [isWidgetBrightened, setIsWidgetBrightened] = useState(false);
  const [isEnvMenuOpen, setIsEnvMenuOpen] = useState(false);
  const [currentEnv, setCurrentEnv] = useState('Production Mumbai (AWS)');

  const envs = [
    { name: 'Production Mumbai (AWS)', ping: '11ms', status: 'live' },
    { name: 'DR Hyderabad Cluster', ping: '22ms', status: 'live' },
    { name: 'Staging Environment', ping: '14ms', status: 'ready' },
  ];

  const handleRunCycle = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
        'Billing Cycle Complete',
        `${res.renewalsProcessed} renewals invoiced, ${res.invoicesMarkedOverdue} overdue status checked.`
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
            <div className="flex-1 min-w-0 pr-2">
              <button
                onClick={() => setIsEnvMenuOpen(!isEnvMenuOpen)}
                className="w-full flex items-center justify-between p-1.5 -ml-1 rounded-xl hover:bg-slate-50 transition-colors group text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/30 group-hover:scale-105 transition-transform">
                    <span className="text-white font-bold text-sm tracking-tight">B</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-slate-900 text-sm tracking-tight leading-tight truncate">
                      Brightloop
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="truncate">{currentEnv}</span>
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
              </button>

              {/* Environment Popover Menu */}
              {isEnvMenuOpen && (
                <div className="absolute top-14 left-3 right-3 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 px-2 py-1 block">
                    Active Cluster
                  </span>
                  {envs.map(env => (
                    <button
                      key={env.name}
                      onClick={() => {
                        setCurrentEnv(env.name);
                        setIsEnvMenuOpen(false);
                        success('Workspace Switched', `Connected to ${env.name}`);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                        currentEnv === env.name
                          ? 'bg-lavender-100 text-primary font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{env.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{env.ping}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink to="/" className="w-full flex justify-center">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/30 hover:scale-105 transition-transform">
                <span className="text-white font-bold text-base tracking-tight">S</span>
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
          {navItems.map(item => {
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

        {/* Creative Interactive Side Panel Widget: Hover to Brighten with Theme! */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          {!collapsed ? (
            <div
              className="group rounded-2xl p-3.5 border cursor-pointer select-none transition-all duration-300 card-theme-brighten bg-white border-slate-200/80 shadow-xs"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:bg-primary group-hover:animate-ping transition-colors" />
                  MRR Target Goal
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all duration-200 bg-lavender-100 text-primary group-hover:bg-primary group-hover:text-white group-hover:shadow-xs">
                  78% Achieved
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-500 bg-primary group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-lavender-300 w-[78%]" />
              </div>

              {/* Figures */}
              <div className="flex items-baseline justify-between text-xs mb-2">
                <span className="font-bold text-slate-900 font-mono group-hover:text-primary transition-colors">₹19,45,000</span>
                <span className="text-slate-400 font-medium">Goal: ₹25L</span>
              </div>

              {/* Expanded Velocity Details on Hover */}
              <div className="max-h-0 group-hover:max-h-24 overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 pt-0 group-hover:pt-2 border-t border-transparent group-hover:border-primary/20 mb-0 group-hover:mb-2.5 space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Monthly Run Rate:</span>
                  <span className="font-semibold text-primary font-mono">+₹1,65,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pace:</span>
                  <span className="font-semibold text-emerald-600">4 days ahead</span>
                </div>
              </div>

              {/* Run Cycle Button */}
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
      </aside>
    </>
  );
};
