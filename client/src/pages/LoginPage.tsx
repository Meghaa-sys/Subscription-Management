import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      setSubmitting(true);
      await login(email, password);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans antialiased">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200/80 shadow-card p-8 space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/30">
            <span className="text-white font-bold text-base tracking-tight">S</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 leading-tight">SubscriptIQ</h1>
            <p className="text-xs text-slate-500">Sign in to Brightloop</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
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
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition-all disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};
