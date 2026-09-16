'use client';

import useSWR from 'swr';
import { fetcher, Transaction, UserProfile } from '@/lib/api';
import { Panel } from './Panel';

export function TransactionsTable() {
  const { data: me } = useSWR<UserProfile>('/api/me', fetcher);
  const { data } = useSWR<Transaction[]>('/api/transactions', fetcher, { refreshInterval: 3000 });

  return (
    <Panel title="My Transactions">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-slate-500">
            <th className="pb-2">#</th>
            <th className="pb-2">Direction</th>
            <th className="pb-2 text-right">Amount</th>
            <th className="pb-2">Via</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((t) => {
            const outgoing = t.senderVpa === me?.vpa;
            return (
              <tr key={t.id} className="border-t border-mesh-border/60">
                <td className="py-2 text-slate-500">{t.id}</td>
                <td className="py-2 font-mono text-slate-300">
                  {outgoing ? `Sent to ${t.receiverVpa}` : `Received from ${t.senderVpa}`}
                </td>
                <td className={`py-2 text-right font-medium ${outgoing ? 'text-red-400' : 'text-mesh-accent'}`}>
                  {outgoing ? '−' : '+'}₹{Number(t.amount).toFixed(2)}
                </td>
                <td className="py-2 text-slate-400">{t.bridgeNodeId}</td>
                <td className="py-2">
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
              <td colSpan={5} className="py-4 text-center text-slate-500">
                No transactions yet — head to Send Money to try one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Panel>
  );
}
