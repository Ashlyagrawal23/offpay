'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { fetcher, Transaction, UserProfile } from '@/lib/api';
import { Panel } from './Panel';

export function RecentTransactions({ limit = 5 }: { limit?: number }) {
  const { data: me } = useSWR<UserProfile>('/api/me', fetcher);
  const { data } = useSWR<Transaction[]>('/api/transactions', fetcher, { refreshInterval: 3000 });
  const rows = data?.slice(0, limit) ?? [];

  return (
    <Panel
      title="Recent Activity"
      action={
        <Link href="/transactions" className="text-xs text-mesh-accent hover:underline">
          View all →
        </Link>
      }
    >
      <table className="w-full text-left text-sm">
        <tbody>
          {rows.map((t) => {
            const outgoing = t.senderVpa === me?.vpa;
            return (
              <tr key={t.id} className="border-t border-mesh-border/60">
                <td className="py-2 font-mono text-slate-300">
                  {outgoing ? `Sent to ${t.receiverVpa}` : `Received from ${t.senderVpa}`}
                </td>
                <td className={`py-2 text-right font-medium ${outgoing ? 'text-red-400' : 'text-mesh-accent'}`}>
                  {outgoing ? '−' : '+'}₹{Number(t.amount).toFixed(2)}
                </td>
                <td className="py-2 text-right">
                  <span
                    className={
                      t.status === 'SETTLED'
                        ? 'rounded bg-mesh-accent/20 px-2 py-0.5 text-xs font-medium text-mesh-accent'
                        : 'rounded bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400'
                    }
                  >
                    {t.status}
                  </span>
                </td>
              </tr>
            );
          })}
          {data?.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-slate-500">
                No transactions yet — head to Send Money to try one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Panel>
  );
}
