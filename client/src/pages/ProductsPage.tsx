import React, { useState, useEffect } from 'react';
import { Package, Plus, Check } from 'lucide-react';
import { api } from '../api/client';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const EMPTY_FORM = { name: '', productType: 'service', salesPrice: 0, costPrice: 0, notes: '' };

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      setProducts(await api.getProducts());
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

    try {
      await api.createProduct(formData);
      success('Product added', `${formData.name} is now available in the catalog.`);
      setIsAddModalOpen(false);
      setFormData(EMPTY_FORM);
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
            Services, goods, and add-ons, with their variants and taxes.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!loading && products.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-slate-400">No products found.</p>
        )}
        {products.map(prod => (
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
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{prod.description}</p>

              {prod.features.length > 0 && (
                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Variants &amp; Taxes
                  </span>
                  {prod.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-slate-600">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Sales price</span>
              <span className="font-mono font-semibold text-slate-900">${prod.salesPrice.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-modal border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Create New Product</h3>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={formData.productType}
                  onChange={e => setFormData({ ...formData, productType: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                >
                  <option value="service">Service</option>
                  <option value="goods">Goods</option>
                  <option value="addon">Add-on</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Sales Price *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={formData.salesPrice}
                    onChange={e => setFormData({ ...formData, salesPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cost Price</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formData.costPrice}
                    onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
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
