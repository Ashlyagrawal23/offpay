'use client';

import useSWR from 'swr';
import { fetcher, Transaction, UserProfile } from '@/lib/api';

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-mesh-border bg-mesh-panel p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}

export function StatCards() {
  const { data: me } = useSWR<UserProfile>('/api/me', fetcher, { refreshInterval: 3000 });
  const { data: transactions } = useSWR<Transaction[]>('/api/transactions', fetcher, { refreshInterval: 3000 });

  const sent = transactions?.filter((t) => t.senderVpa === me?.vpa && t.status === 'SETTLED') ?? [];
  const received = transactions?.filter((t) => t.receiverVpa === me?.vpa && t.status === 'SETTLED') ?? [];
  const totalSent = sent.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalReceived = received.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card label="My Balance" value={me ? `₹${Number(me.balance).toFixed(2)}` : '—'} />
      <Card label="Sent" value={transactions ? `₹${totalSent.toFixed(2)}` : '—'} />
      <Card label="Received" value={transactions ? `₹${totalReceived.toFixed(2)}` : '—'} />
      <Card label="Payments Settled" value={transactions ? String(sent.length + received.length) : '—'} />
    </div>
  );
}
