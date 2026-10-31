import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ProfileUpdate } from '../types';
import { Card, Message, PageHeader, portalInputClass, usePortalData } from './shared';

const FIELDS: Array<{ key: Exclude<keyof ProfileUpdate, 'billing_address'>; label: string; required?: boolean }> = [
  { key: 'name', label: 'Full name', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
];

export const PortalProfile: React.FC = () => {
  const { data: me, loading } = usePortalData(api.getMe, 'Failed to load your profile');
  const { setUser } = useAuth();
  const { success, error } = useToast();
  const [form, setForm] = useState<ProfileUpdate>({ name: '', phone: '', company: '', billing_address: '' });
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (!me) return;
    setForm({
      name: me.name,
      phone: me.phone ?? '',
      company: me.company ?? '',
      billing_address: me.billing_address ?? '',
    });
  }, [me]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setUser(await api.updateProfile(form));
      success('Profile saved', 'Your details are up to date.');
    } catch (err: any) {
      error('Failed to save profile', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!me) return;
    try {
      setSendingReset(true);
      await api.forgotPassword(me.email);
      success('Check your email', `A reset link is on its way to ${me.email}.`);
    } catch (err: any) {
      error('Failed to send reset link', err.message);
    } finally {
      setSendingReset(false);
    }
  };

  if (loading) return <Message>Loading...</Message>;
  if (!me) return <Message>Your profile could not be loaded.</Message>;

  return (
    <>
      <PageHeader title="Profile" subtitle={me.email} />

      <Card className="p-5 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {FIELDS.map(field => (
            <div key={field.key}>
              <label htmlFor={field.key} className="block text-xs font-medium text-slate-700 mb-1">
                {field.label}
              </label>
              <input
                id={field.key}
                required={field.required}
                value={form[field.key]}
                onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                className={portalInputClass}
              />
            </div>
          ))}
          <div>
            <label htmlFor="billing_address" className="block text-xs font-medium text-slate-700 mb-1">
              Billing address
            </label>
            <textarea
              id="billing_address"
              rows={3}
              value={form.billing_address}
              onChange={e => setForm({ ...form, billing_address: e.target.value })}
              className={portalInputClass}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </Card>

      <Card className="p-5 max-w-xl">
        <h2 className="text-sm font-semibold text-slate-900">Password</h2>
        <p className="text-xs text-slate-500 mt-1">We'll email you a link to set a new password.</p>
        <button
          onClick={handleReset}
          disabled={sendingReset}
          className="mt-3 px-3 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          {sendingReset ? 'Sending...' : 'Email me a reset link'}
        </button>
      </Card>
    </>
  );
};
