'use client';

import { FormEvent, useState } from 'react';
import useSWR from 'swr';
import { apiPost, Contact, fetcher, UserProfile } from '@/lib/api';
import { Panel } from './Panel';

export function SendMoneyForm({ onLog }: { onLog: (line: string) => void }) {
  const { data: me } = useSWR<UserProfile>('/api/me', fetcher);
  const { data: contacts } = useSWR<Contact[]>('/api/users', fetcher, { refreshInterval: 5000 });

  const [receiverVpa, setReceiverVpa] = useState('');
  const [amount, setAmount] = useState('100');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedReceiver = receiverVpa || contacts?.[0]?.vpa || '';

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!selectedReceiver) return;
    setBusy(true);
    try {
      const result = await apiPost('/api/payments/send', {
        receiverVpa: selectedReceiver,
        amount,
        pin,
        ttl: 5,
      });
      onLog(`📤 Sent — injected into the mesh: ${JSON.stringify(result)}`);
      setPin('');
    } catch (err) {
      onLog(`❌ ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Step 1 — Send Money">
      {me && (
        <p className="mb-4 text-xs text-slate-500">
          From <span className="font-mono text-slate-300">{me.vpa}</span> — balance ₹{Number(me.balance).toFixed(2)}
        </p>
      )}

      {contacts?.length === 0 ? (
        <p className="rounded-md border border-mesh-border bg-black/20 p-3 text-sm text-slate-400">
          No other OffPay users yet. Sign up a second account (in another browser or incognito window) so you have
          someone to pay.
        </p>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase text-slate-500">Pay to</label>
            <select
              className="w-full rounded-md border border-mesh-border bg-black/30 px-2 py-1.5 text-sm"
              value={selectedReceiver}
              onChange={(e) => setReceiverVpa(e.target.value)}
            >
              {contacts?.map((c) => (
                <option key={c.vpa} value={c.vpa}>
                  {c.displayName} ({c.vpa})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs uppercase text-slate-500">Amount (₹)</label>
              <input
                className="w-full rounded-md border border-mesh-border bg-black/30 px-2 py-1.5 text-sm"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-slate-500">Your PIN</label>
              <input
                type="password"
                inputMode="numeric"
                className="w-full rounded-md border border-mesh-border bg-black/30 px-2 py-1.5 text-sm"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-mesh-accent px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
          >
            📤 Send into the Mesh
          </button>
        </form>
      )}
    </Panel>
  );
}
