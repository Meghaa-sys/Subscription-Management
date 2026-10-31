import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CreditCard, FileText, LayoutDashboard, LogOut, Package, Percent, Repeat, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/portal', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/portal/subscriptions', label: 'Subscriptions', icon: Repeat },
  { to: '/portal/invoices', label: 'Invoices', icon: FileText },
  { to: '/portal/payments', label: 'Payments', icon: CreditCard },
  { to: '/portal/plans', label: 'Plans', icon: Package },
  { to: '/portal/discounts', label: 'Discounts', icon: Percent },
  { to: '/portal/profile', label: 'Profile', icon: UserRound },
];

export const PortalLayout: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background text-text-main font-sans antialiased">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between gap-4">
            <NavLink to="/portal" className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 text-white font-bold text-sm">
                B
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900 text-sm leading-tight">Brightloop</span>
                <span className="block text-[10px] text-slate-400 font-medium">Customer portal</span>
              </span>
            </NavLink>

            <div className="flex items-center gap-3 min-w-0">
              <span className="hidden sm:block text-xs font-medium text-slate-600 truncate">{user?.name}</span>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive ? 'bg-lavender-100 text-primary font-semibold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <Outlet />
      </main>
    </div>
  );
};
