'use client';

import useSWR from 'swr';
import { fetcher, UserProfile } from '@/lib/api';
import { Panel } from './Panel';

export function MyAccountCard() {
  const { data } = useSWR<UserProfile>('/api/me', fetcher, { refreshInterval: 3000 });

  return (
    <Panel title="My Account">
      {!data && <p className="text-sm text-slate-500">Loading...</p>}
      {data && (
        <div className="space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Display Name</div>
            <div className="text-lg text-slate-100">{data.displayName}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Your VPA</div>
            <div className="font-mono text-slate-300">{data.vpa}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Username</div>
            <div className="text-slate-300">@{data.username}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Balance</div>
            <div className="text-2xl font-semibold text-mesh-accent">₹{Number(data.balance).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Member since</div>
            <div className="text-slate-400">{new Date(data.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      )}
    </Panel>
  );
}
