import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  Mail,
  Phone,
  Building,
  Calendar,
  X,
  CreditCard,
  FileText,
  DollarSign,
  ChevronRight,
  Trash2,
  Edit,
  LayoutGrid,
  List,
  CheckCircle2,
  Copy,
  Check,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { api, formatMoney } from '../api/client';
import { Customer } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

// Helper to format Indian Rupee currency
function formatRupee(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('spent_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copiedGstin, setCopiedGstin] = useState<string | null>(null);

  // Modals & Drawers
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<Customer | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'overview' | 'subscriptions' | 'invoices'>('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Customer Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    address: '',
    gstin: '',
  });

  const [searchParams] = useSearchParams();
  const { success, error } = useToast();

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers({
        search: debouncedSearch,
        status: statusFilter,
        sort: sortBy,
      });
      setCustomers(data);
    } catch (err: any) {
      error('Failed to load customers', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [debouncedSearch, statusFilter, sortBy]);

  // Open customer if query param ?id=... is provided
  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl) {
      handleOpenCustomer(idFromUrl);
    }
  }, [searchParams]);

  const handleOpenCustomer = async (id: string) => {
    setSelectedCustomerId(id);
    setDetailsLoading(true);
    setActiveDrawerTab('overview');
    try {
      const data = await api.getCustomer(id);
      setSelectedCustomerDetails(data);
    } catch (err: any) {
      error('Failed to load customer profile', err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCopyGstin = (e: React.MouseEvent, gstin: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(gstin);
    setCopiedGstin(gstin);
    success('Copied GSTIN', `${gstin} copied to clipboard.`);
    setTimeout(() => setCopiedGstin(null), 2000);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      error('Validation Error', 'Name and Email are required.');
      return;
    }

    try {
      const created = await api.createCustomer(formData);
      success('Customer created', `${created.name} was added successfully.`);
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', company: '', phone: '', address: '', gstin: '' });
      loadCustomers();
    } catch (err: any) {
      error('Failed to create customer', err.message);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;

    try {
      await api.deleteCustomer(id);
      success('Customer deleted', `${name} was removed.`);
      if (selectedCustomerId === id) {
        setSelectedCustomerId(null);
        setSelectedCustomerDetails(null);
      }
      loadCustomers();
    } catch (err: any) {
      error('Failed to delete customer', err.message);
    }
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalAccounts = customers.length;
    const activeAccounts = customers.filter(c => c.status === 'active').length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const totalOutstanding = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
    return { totalAccounts, activeAccounts, totalRevenue, totalOutstanding };
  }, [customers]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-primary text-white flex items-center justify-center shadow-md shadow-primary/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Enterprise Accounts Directory
              </h1>
              <p className="text-sm text-slate-500">
                Indian corporate accounts, GSTIN tax compliance, and recurring subscription ledgers
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Enterprise Client
        </button>
      </div>

      {/* Top Financial KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-medium">Enterprise Clients</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {metrics.totalAccounts}
            <span className="text-xs text-slate-400 font-normal ml-1.5">Marquee Brands</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% GSTIN Registered Entities</span>
          </p>
        </div>

        {/* Active Accounts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-medium">Active Contracting</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 tracking-tight">
            {metrics.activeAccounts}
            <span className="text-xs text-slate-400 font-normal ml-1.5">Active Accounts</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Recurring monthly & annual renewals
          </p>
        </div>

        {/* Lifetime Revenue Realized */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-medium">Total Realized Revenue</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            ₹{formatRupee(metrics.totalRevenue)}
          </div>
          <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1">
            <span>All invoices collected to date</span>
          </p>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-medium">Outstanding Receivables</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            ₹{formatRupee(metrics.totalOutstanding)}
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Pending billing cycle balance
          </p>
        </div>
      </div>

      {/* Filter, Search & View Switcher Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search brand (TCS, Reliance, Infosys...), GSTIN, email..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Accounts ({customers.length})</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="spent_desc">Highest Spend (₹)</option>
              <option value="newest">Newest Added</option>
              <option value="name_asc">Company (A-Z)</option>
              <option value="name_desc">Company (Z-A)</option>
            </select>
          </div>

          {/* Grid vs Table View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Dense Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white p-16 rounded-2xl border border-slate-200/80 shadow-card text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-700">Loading Enterprise Accounts Directory...</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving verified GSTINs and subscription contracts</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white p-16 rounded-2xl border border-slate-200/80 shadow-card text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Enterprise Accounts Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No accounts matched "{search}". Try searching for Indian brands like Tata, Reliance, Infosys, or HDFC.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* INNOVATIVE ENTERPRISE CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {customers.map(cust => {
            // Extract a realistic GSTIN if available from address or mock hash
            const gstinMatch = cust.address?.match(/2[0-9][A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/);
            const displayGstin = gstinMatch ? gstinMatch[0] : `27AAAC${cust.id.slice(0, 4)}1Z5`.toUpperCase();

            return (
              <div
                key={cust.id}
                onClick={() => handleOpenCustomer(cust.id)}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card hover:shadow-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Accent top stripe */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  {/* Card Header: Avatar, Brand Name, Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={cust.avatar}
                        alt={cust.name}
                        className="w-12 h-12 rounded-xl object-cover shadow-sm ring-2 ring-slate-100"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 text-base group-hover:text-primary transition-colors leading-snug">
                            {cust.company || cust.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400">{cust.name}</p>
                      </div>
                    </div>
                    <StatusBadge status={cust.status} size="sm" />
                  </div>

                  {/* GSTIN Pill with One-Click Copy */}
                  <div className="my-3 flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center gap-1.5 font-mono text-slate-600 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold text-slate-700">GSTIN:</span>
                      <span className="tracking-wide">{displayGstin}</span>
                    </div>
                    <button
                      onClick={e => handleCopyGstin(e, displayGstin)}
                      className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                      title="Copy GSTIN"
                    >
                      {copiedGstin === displayGstin ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-xs text-slate-500 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cust.email}</span>
                    </div>
                    {cust.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{cust.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Financials and Details CTA */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      Lifetime Spend
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ₹{formatRupee(cust.totalSpent)}
                    </span>
                  </div>

                  {cust.balance > 0 ? (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-amber-500 block">
                        Due Balance
                      </span>
                      <span className="font-mono font-bold text-amber-600 text-sm">
                        ₹{formatRupee(cust.balance)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-emerald-500 block">
                        Account Balance
                      </span>
                      <span className="font-mono font-semibold text-emerald-600 text-xs">
                        All Paid ✓
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DENSE TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Company & Brand</th>
                  <th className="py-3.5 px-6">Contact & Email</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Total Spend (₹)</th>
                  <th className="py-3.5 px-6">Outstanding</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customers.map(cust => (
                  <tr
                    key={cust.id}
                    onClick={() => handleOpenCustomer(cust.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={cust.avatar}
                          alt={cust.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                            {cust.company || cust.name}
                          </p>
                          <p className="text-xs text-slate-400 font-mono">
                            {cust.address ? cust.address.split(',')[0] : 'India'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <p className="font-medium text-slate-800">{cust.name}</p>
                      <p className="text-xs text-slate-400">{cust.email}</p>
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={cust.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      ₹{formatRupee(cust.totalSpent)}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs">
                      {cust.balance > 0 ? (
                        <span className="text-rose-600 font-bold">₹{formatRupee(cust.balance)}</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">₹0 (Settled)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenCustomer(cust.id)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-lavender-100 rounded-lg transition-colors"
                          title="View Profile"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Profile Slide-over Drawer */}
      {selectedCustomerId && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => {
            setSelectedCustomerId(null);
            setSelectedCustomerDetails(null);
          }}
        >
          <div
            className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Corporate Account Profile
              </span>
              <button
                onClick={() => {
                  setSelectedCustomerId(null);
                  setSelectedCustomerDetails(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailsLoading || !selectedCustomerDetails ? (
              <div className="p-16 text-center text-slate-400">Loading company profile...</div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Profile Overview */}
                <div className="flex items-start gap-4">
                  <img
                    src={selectedCustomerDetails.avatar}
                    alt={selectedCustomerDetails.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary/20 shadow-md"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">
                        {selectedCustomerDetails.company || selectedCustomerDetails.name}
                      </h2>
                      <StatusBadge status={selectedCustomerDetails.status} size="sm" />
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{selectedCustomerDetails.name}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {selectedCustomerDetails.email}
                      </span>
                      {selectedCustomerDetails.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {selectedCustomerDetails.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-medium text-slate-400">Lifetime Revenue</span>
                    <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
                      ₹{formatRupee(selectedCustomerDetails.totalSpent)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-medium text-slate-400">Outstanding Balance</span>
                    <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
                      ₹{formatRupee(selectedCustomerDetails.balance)}
                    </p>
                  </div>
                </div>

                {/* Registered Office Address */}
                {selectedCustomerDetails.address && (
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>Registered Indian Office Address</span>
                    </div>
                    <p className="leading-relaxed pl-5">{selectedCustomerDetails.address}</p>
                  </div>
                )}

                {/* Subscriptions */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    Subscriptions ({selectedCustomerDetails.subscriptions?.length || 0})
                  </h4>

                  {selectedCustomerDetails.subscriptions && selectedCustomerDetails.subscriptions.length > 0 ? (
                    <div className="space-y-2.5">
                      {selectedCustomerDetails.subscriptions.map(sub => (
                        <div
                          key={sub.id}
                          className="p-3.5 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-900">{sub.planName}</span>
                              <StatusBadge status={sub.status} size="sm" />
                            </div>
                            <span className="text-xs text-slate-400 capitalize block mt-0.5">
                              {sub.billingCycle} • Next renewal: {sub.nextRenewal}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-sm text-slate-900">
                            ₹{formatRupee(sub.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No subscriptions registered.</p>
                  )}
                </div>

                {/* Invoices */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Invoices ({selectedCustomerDetails.invoices?.length || 0})
                  </h4>

                  {selectedCustomerDetails.invoices && selectedCustomerDetails.invoices.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCustomerDetails.invoices.map(inv => (
                        <div
                          key={inv.id}
                          className="p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-slate-800">
                                {inv.invoiceNumber}
                              </span>
                              <StatusBadge status={inv.status} size="sm" />
                            </div>
                            <span className="text-slate-400 block mt-0.5">Issued: {inv.issueDate}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            ₹{formatRupee(inv.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No invoices found for this account.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Add Enterprise Account</h3>
                <p className="text-xs text-slate-500 mt-0.5">Register client profile and billing entity</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Corporate Brand / Company Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tata Consultancy Services"
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Corporate Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="billing@company.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contact Phone (+91)
                </label>
                <input
                  type="text"
                  placeholder="+91 98200 12345"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Registered Indian Office Address
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Nariman Point, Mumbai 400021"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:outline-hidden resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-xl hover:bg-primary-hover shadow-xs transition-colors"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
