import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Mode = 'signin' | 'signup' | 'forgot';

const TITLES: Record<Mode, string> = {
  signin: 'Sign in to Brightloop',
  signup: 'Create your customer account',
  forgot: 'Reset your password',
};

const SUBMIT_LABELS: Record<Mode, string> = {
  signin: 'Sign in',
  signup: 'Create account',
  forgot: 'Email me a reset link',
};

// The seed logins from backend/README.md. Vite removes this from production builds.
const DEMO_LOGINS = import.meta.env.DEV
  ? [
      { label: 'Admin', email: 'admin@brightloop.test', password: 'Admin@12345!' },
      { label: 'Staff', email: 'staff1@brightloop.test', password: 'Staff@12345!' },
      { label: 'Customer', email: 'customer1@brightloop.test', password: 'Customer@12345!' },
    ]
  : [];

const inputClass =
  'w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-primary';

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const { login, signup } = useAuth();

  const switchMode = (next: Mode) => {
    setMode(next);
    setMessage('');
    setNotice('');
  };

  const attempt = async (action: () => Promise<void>) => {
    setMessage('');
    setNotice('');
    try {
      setSubmitting(true);
      await action();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attempt(async () => {
      if (mode === 'signup') {
        await signup(name, email, password);
      } else if (mode === 'forgot') {
        setNotice((await api.forgotPassword(email)).detail);
      } else {
        await login(email, password);
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans antialiased">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200/80 shadow-card p-8 space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/30">
            <span className="text-white font-bold text-base tracking-tight">B</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 leading-tight">Brightloop</h1>
            <p className="text-xs text-slate-500">{TITLES[mode]}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-slate-700 mb-1">
                Full name
              </label>
              <input
                id="name"
                required
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

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
              className={inputClass}
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-xs font-medium text-slate-700">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          {message && (
            <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200/60 rounded-xl px-3 py-2">
              {message}
            </p>
          )}
          {notice && (
            <p role="status" className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-xl px-3 py-2">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition-all disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? 'Please wait...' : SUBMIT_LABELS[mode]}
          </button>
        </form>

        <p className="text-xs text-slate-500 text-center">
          {mode === 'signin' ? (
            <>
              New customer?{' '}
              <button onClick={() => switchMode('signup')} className="font-semibold text-primary hover:underline">
                Create an account
              </button>
            </>
          ) : (
            <button onClick={() => switchMode('signin')} className="font-semibold text-primary hover:underline">
              Back to sign in
            </button>
          )}
        </p>

        {mode === 'signin' && DEMO_LOGINS.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] font-medium text-slate-400 mb-2">Demo logins (development only)</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_LOGINS.map(demo => (
                <button
                  key={demo.label}
                  type="button"
                  disabled={submitting}
                  onClick={() => attempt(() => login(demo.email, demo.password))}
                  className="px-2 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-700 hover:bg-lavender-100 hover:text-primary transition-colors disabled:opacity-50"
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
