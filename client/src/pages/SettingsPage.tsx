import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Building, DollarSign, Clock, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { SystemSettings } from '../types';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .catch(err => error('Failed to load settings', err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      success('Settings Updated', 'Platform business configurations saved successfully.');
    } catch (err: any) {
      error('Failed to save settings', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset all demo data back to pristine initial state? All your manual changes will be refreshed.')) return;

    try {
      await api.resetDemoData();
      success('Database Reset', 'Default dataset restored.');
      setTimeout(() => window.location.reload(), 600);
    } catch (err: any) {
      error('Reset failed', err.message);
    }
  };

  if (loading || !settings) {
    return <div className="p-8 text-center text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1580px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Business &amp; Billing Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global entity details, invoicing rules, currency schemas, and payment policies.
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Reset Demo Dataset
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Business Identity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-primary" />
            Company Identity &amp; Legal Entity
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Display Company Name
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={e => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Legal Entity Name
              </label>
              <input
                type="text"
                value={settings.legalName}
                onChange={e => setSettings({ ...settings, legalName: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Billing Support Email
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={e => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tax Identification Number (EIN / VAT)
              </label>
              <input
                type="text"
                value={settings.taxId}
                onChange={e => setSettings({ ...settings, taxId: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Registered Physical Address
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={e => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Invoicing & Policy */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Billing Engine Configuration &amp; Payment Terms
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Currency
              </label>
              <select
                value={settings.currency}
                onChange={e => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              >
                <option value="INR">INR (₹ - Indian Rupee)</option>
                <option value="USD">USD ($ - United States Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="GBP">GBP (£ - British Pound)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Operational Timezone
              </label>
              <input
                type="text"
                value={settings.timezone}
                onChange={e => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={e => setSettings({ ...settings, invoicePrefix: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Payment Terms (Net Days)
              </label>
              <input
                type="number"
                min={0}
                value={settings.paymentTermsDays}
                onChange={e => setSettings({ ...settings, paymentTermsDays: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dunning Grace Period (Days)
              </label>
              <input
                type="number"
                min={0}
                value={settings.gracePeriodDays}
                onChange={e => setSettings({ ...settings, gracePeriodDays: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoRenewDefault}
                  onChange={e => setSettings({ ...settings, autoRenewDefault: e.target.checked })}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Enable Auto-Renew by Default
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
