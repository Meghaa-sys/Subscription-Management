import React, { useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { GlobalSearchModal } from './components/GlobalSearchModal';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { ProductsPage } from './pages/ProductsPage';
import { PlansPage } from './pages/PlansPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { DiscountsPage } from './pages/DiscountsPage';
import { TaxesPage } from './pages/TaxesPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

// Customer portal
import { PortalLayout } from './portal/PortalLayout';
import { PortalDashboard } from './portal/PortalDashboard';
import { PortalSubscriptions, PortalSubscriptionDetail } from './portal/PortalSubscriptions';
import { PortalInvoices, PortalInvoiceDetail } from './portal/PortalInvoices';
import { PortalPayments } from './portal/PortalPayments';
import { PortalPlans } from './portal/PortalPlans';
import { PortalDiscounts } from './portal/PortalDiscounts';
import { PortalProfile } from './portal/PortalProfile';

function CustomerPortal() {
  return (
    <Routes>
      <Route path="/portal" element={<PortalLayout />}>
        <Route index element={<PortalDashboard />} />
        <Route path="subscriptions" element={<PortalSubscriptions />} />
        <Route path="subscriptions/:id" element={<PortalSubscriptionDetail />} />
        <Route path="invoices" element={<PortalInvoices />} />
        <Route path="invoices/:id" element={<PortalInvoiceDetail />} />
        <Route path="payments" element={<PortalPayments />} />
        <Route path="plans" element={<PortalPlans />} />
        <Route path="discounts" element={<PortalDiscounts />} />
        <Route path="profile" element={<PortalProfile />} />
      </Route>
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}

function AppContent() {
  const { isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('12 months');

  // Global Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-row text-text-main font-sans antialiased selection:bg-lavender-200 selection:text-primary">
      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopNav
          onOpenSearch={() => setSearchOpen(true)}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
        />

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage dateFilter={dateFilter} />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/quotations" element={<QuotationsPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/discounts" element={<DiscountsPage />} />
            <Route path="/taxes" element={<TaxesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/users" element={isAdmin ? <UsersPage /> : <Navigate to="/" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Spotlight Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function SessionGate() {
  const { user, checkingSession } = useAuth();
  const { pathname } = useLocation();

  if (pathname === '/reset-password') return <ResetPasswordPage />;
  if (checkingSession) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!user) return <LoginPage />;
  return user.role === 'customer' ? <CustomerPortal /> : <AppContent />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <SessionGate />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
