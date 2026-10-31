import React, { useState, useEffect } from 'react';
import { Package, Plus, Check, Edit2, Shield, Cpu, BarChart2, Layers } from 'lucide-react';
import { api } from '../api/client';
import { Product, Plan } from '../types';
import { useToast } from '../context/ToastContext';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Infrastructure',
    features: '',
  });

  const { success, error } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, plns] = await Promise.all([api.getProducts(), api.getPlans()]);
      setProducts(prods);
      setPlans(plns);
    } catch (err: any) {
      error('Failed to load products', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      const featArray = formData.features.split(',').map(s => s.trim()).filter(Boolean);
      await api.createProduct({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        features: featArray,
      });
      success('Product added', `${formData.name} is now available in catalog.`);
      setIsAddModalOpen(false);
      setFormData({ name: '', description: '', category: 'Infrastructure', features: '' });
      loadData();
    } catch (err: any) {
      error('Failed to create product', err.message);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1580px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Products Catalog</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise software offerings, modular add-ons, and capability tiers.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(prod => {
          const associatedPlans = plans.filter(p => p.productId === prod.id);
          const totalSubscribers = associatedPlans.reduce((acc, p) => acc + (p.activeSubscribers || 0), 0);

          return (
            <div
              key={prod.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 flex flex-col justify-between card-hover-lift"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-lavender-100 text-primary flex items-center justify-center font-bold">
                    <Package className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {prod.category}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{prod.name}</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {prod.description}
                </p>

                {/* Features list */}
                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Core Capabilities
                  </span>
                  {prod.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-slate-600">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Stats */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{associatedPlans.length} billing plans configured</span>
                <span className="font-semibold text-slate-900">{totalSubscribers} active clients</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-slate-900">Create New Product</h3>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Brightloop Observability"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Sales Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 49999"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 12000"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                >
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Analytics">Analytics</option>
                  <option value="Security">Security</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Add-On">Add-On</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary of product purpose and value proposition"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
                />
              </div>

              {/* Product Variants */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Product Variants (Brand / Add-On Tiers)</p>
                <p className="text-[11px] text-slate-400">Each variant adds a price premium on top of the base sales price.</p>
                {[
                  { label: 'Odoo Brand', addedPrice: 56000 },
                  { label: 'SAP Brand', addedPrice: 85000 },
                  { label: 'Salesforce Add-On', addedPrice: 120000 },
                ].map(v => (
                  <label key={v.label} className="flex items-center justify-between cursor-pointer group">
                    <span className="flex items-center gap-2 text-xs text-slate-700">
                      <input type="checkbox" className="w-4 h-4 rounded accent-primary" />
                      {v.label}
                    </span>
                    <span className="text-xs font-semibold text-primary font-mono">+₹{v.addedPrice.toLocaleString('en-IN')}</span>
                  </label>
                ))}
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Custom variant name"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                  <input
                    type="number"
                    placeholder="+₹"
                    className="w-24 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Features (comma separated)</label>
                <input
                  type="text"
                  value={formData.features}
                  onChange={e => setFormData({ ...formData, features: e.target.value })}
                  placeholder="e.g. 99.99% SLA, Custom Domain, Dedicated KMS"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary-hover shadow-sm"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
