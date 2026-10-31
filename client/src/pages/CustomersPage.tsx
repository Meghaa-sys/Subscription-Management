import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { api } from '../api/client';
import { Customer } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('spent_desc');

  // Modals & Drawers
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<Customer | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Customer Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    address: '',
  });

  const [searchParams] = useSearchParams();
  const { success, error } = useToast();

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers({
        search,
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
  }, [search, statusFilter, sortBy]);

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
    try {
      const data = await api.getCustomer(id);
      setSelectedCustomerDetails(data);
    } catch (err: any) {
      error('Failed to load customer profile', err.message);
    } finally {
      setDetailsLoading(false);
    }
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
      setFormData({ name: '', email: '', company: '', phone: '', address: '' });
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

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1580px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage client directory, billing accounts, and subscription histories.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, company, email..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
            >
              <option value="spent_desc">Highest Spend</option>
              <option value="newest">Newest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Company</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Total Spent</th>
                <th className="py-3.5 px-6">Joined Date</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                customers.map(cust => (
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
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-primary transition-colors">
                            {cust.name}
                          </p>
                          <p className="text-xs text-slate-400">{cust.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-medium text-slate-800">{cust.company}</td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={cust.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-6 font-mono font-semibold text-slate-900">
                      ${cust.totalSpent.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-500">
                      {new Date(cust.createdAt).toLocaleDateString()}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Profile Slide-over Drawer */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Customer Profile
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
              <div className="p-12 text-center text-slate-400">Loading details...</div>
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
                        {selectedCustomerDetails.name}
                      </h2>
                      <StatusBadge status={selectedCustomerDetails.status} size="sm" />
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{selectedCustomerDetails.company}</p>
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

                {/* Lifetime Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-medium text-slate-400">Lifetime Revenue</span>
                    <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
                      ${selectedCustomerDetails.totalSpent.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-medium text-slate-400">Outstanding Balance</span>
                    <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
                      ${selectedCustomerDetails.balance.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Subscriptions */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    Subscriptions ({selectedCustomerDetails.subscriptions?.length || 0})
                  </h4>
                  {selectedCustomerDetails.subscriptions?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 bg-slate-50 rounded-xl text-center">
                      No subscriptions attached.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedCustomerDetails.subscriptions?.map(sub => (
                        <div
                          key={sub.id}
                          className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900 font-mono">
                              #{sub.id}
                            </p>
                            <p className="text-xs text-slate-400">
                              ${sub.amount}/{sub.billingCycle} • Renews {sub.nextRenewal}
                            </p>
                          </div>
                          <StatusBadge status={sub.status} size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invoices */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Billing Statements ({selectedCustomerDetails.invoices?.length || 0})
                  </h4>
                  {selectedCustomerDetails.invoices?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 bg-slate-50 rounded-xl text-center">
                      No invoices recorded.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedCustomerDetails.invoices?.map(inv => (
                        <div
                          key={inv.id}
                          className="p-3 rounded-xl border border-slate-100 bg-white flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900 font-mono">
                              {inv.invoiceNumber}
                            </p>
                            <p className="text-xs text-slate-400">
                              Issued {inv.issueDate} • Due {inv.dueDate}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold font-mono text-slate-900">
                              ${inv.total.toFixed(2)}
                            </p>
                            <StatusBadge status={inv.status} size="sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Add New Customer</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Acme Corporation"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="billing@acme.corp"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Company / Org
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Acme Global Inc."
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Billing Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="100 Innovation Way, Austin, TX"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary-hover shadow-sm transition-colors"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
