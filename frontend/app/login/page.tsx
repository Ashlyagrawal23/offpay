'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { login, signup } from '@/lib/api';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await signup(username, displayName, password, pin);
      }
      router.push('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-mesh-border bg-mesh-panel p-8 shadow-xl"
      >
        <div className="mb-6 flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <h1 className="text-xl font-semibold text-slate-100">OffPay</h1>
        </div>

        <div className="mb-6 flex rounded-md border border-mesh-border bg-black/20 p-1 text-sm">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={
              mode === 'login'
                ? 'flex-1 rounded bg-mesh-accent py-1.5 font-medium text-black'
                : 'flex-1 py-1.5 text-slate-400'
            }
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={
              mode === 'signup'
                ? 'flex-1 rounded bg-mesh-accent py-1.5 font-medium text-black'
                : 'flex-1 py-1.5 text-slate-400'
            }
          >
            Sign up
          </button>
        </div>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Username</label>
        <input
          className="mb-4 w-full rounded-md border border-mesh-border bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-mesh-accent"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="e.g. priya"
          autoComplete="username"
        />

        {mode === 'signup' && (
          <>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Display name</label>
            <input
              className="mb-4 w-full rounded-md border border-mesh-border bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-mesh-accent"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Priya Shah"
            />
          </>
        )}

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Password</label>
        <input
          type="password"
          className="mb-4 w-full rounded-md border border-mesh-border bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-mesh-accent"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {mode === 'signup' && (
          <>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
              Payment PIN (4-6 digits)
            </label>
            <input
              type="password"
              inputMode="numeric"
              className="mb-4 w-full rounded-md border border-mesh-border bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-mesh-accent"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="1234"
            />
            <p className="mb-4 -mt-2 text-xs text-slate-500">
              Separate from your password — you&apos;ll enter this every time you send money, just like a real UPI PIN.
            </p>
          </>
        )}

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-mesh-accent px-4 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>

        {mode === 'signup' && (
          <p className="mt-4 text-xs text-slate-500">You&apos;ll start with a ₹1000 welcome balance to try sending money.</p>
        )}
      </form>
    </div>
  );
}
