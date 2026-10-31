import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CreditCard, FileText, LayoutDashboard, LogOut, Package, Percent, Repeat, UserRound } from 'lucide-react';
import { LayoutGroup, motion } from 'framer-motion';
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

const getIconHoverAnimation = (label: string) => {
  switch (label) {
    case 'Dashboard':
      return { scale: 1.22, rotate: 10 };
    case 'Subscriptions':
      return { scale: 1.22, rotate: 180 };
    case 'Invoices':
      return { scale: 1.22, y: -2.5 };
    case 'Payments':
      return { scale: 1.22, rotate: -12 };
    case 'Plans':
      return { scale: 1.22, rotate: -8 };
    case 'Discounts':
      return { scale: 1.22, rotate: 45 };
    case 'Profile':
      return { scale: 1.22, y: -2.5 };
    default:
      return { scale: 1.2 };
  }
};

export const PortalLayout: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#F6FAF7] text-text-main font-sans antialiased selection:bg-emerald-200 selection:text-emerald-900">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-emerald-950/10 shadow-xs print:hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="h-20 flex items-center justify-between gap-4">
            {/* Brand Logo & Name (No subtitle badge) */}
            <NavLink to="/portal" className="flex items-center gap-3.5 min-w-0 group">
              <motion.span
                whileHover={{ rotate: -8, scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shrink-0 text-white font-extrabold text-xl shadow-md shadow-emerald-600/30 transition-transform"
              >
                B
              </motion.span>
              <span className="block font-bold text-slate-900 text-lg sm:text-xl tracking-tight group-hover:text-emerald-700 transition-colors">
                Brightloop
              </span>
            </NavLink>

            {/* Signout Button pushed to the very right */}
            <div className="flex items-center ml-auto">
              <button
                onClick={logout}
                className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200/80 active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                Sign out
              </button>
            </div>
          </div>

          {/* Smooth Toggle Navigation with Icon Micro-interactions */}
          <LayoutGroup id="portal-nav">
            <nav className="flex gap-2 overflow-x-auto pb-3.5 pt-1 -mx-1 px-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className="relative group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-colors select-none"
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="portalActiveTab"
                          className="absolute inset-0 bg-emerald-100/90 rounded-xl border border-emerald-300/80 shadow-xs z-0"
                          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        />
                      )}
                      <motion.span
                        className="relative z-10 flex items-center justify-center"
                        whileHover={getIconHoverAnimation(label)}
                        whileTap={{ scale: 0.88 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                      >
                        <Icon
                          className={`w-5 h-5 transition-colors ${
                            isActive ? 'text-emerald-900' : 'text-slate-500 group-hover:text-emerald-700'
                          }`}
                        />
                      </motion.span>
                      <span
                        className={`relative z-10 transition-colors ${
                          isActive ? 'text-emerald-950 font-bold' : 'text-slate-600 group-hover:text-slate-900 font-semibold'
                        }`}
                      >
                        {label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </LayoutGroup>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <Outlet />
      </main>
    </div>
  );
};
