import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

/** The page the password reset email links to. */
export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      setSubmitting(true);
      setDone((await api.resetPassword(token, password)).detail);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans antialiased">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200/80 shadow-card p-8 space-y-5">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Set a new password</h1>

        {done ? (
          <p role="status" className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-xl px-3 py-2">
            {done}
          </p>
        ) : !token ? (
          <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200/60 rounded-xl px-3 py-2">
            This reset link is incomplete. Request a new one from the sign in page.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-xs font-medium text-slate-700 mb-1">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
              />
            </div>
            {message && (
              <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200/60 rounded-xl px-3 py-2">
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save new password'}
            </button>
          </form>
        )}

        <Link to="/" className="block text-center text-xs font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
};
