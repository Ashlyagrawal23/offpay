'use client';

import useSWR from 'swr';
import { fetcher, MeshState } from '@/lib/api';
import { Panel } from './Panel';

export function MeshPanel() {
  const { data } = useSWR<MeshState>('/api/mesh/state', fetcher, { refreshInterval: 2000 });

  return (
    <Panel title="Mesh State">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data?.devices.map((d) => (
          <div key={d.deviceId} className="rounded-lg border border-mesh-border bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">{d.deviceId}</span>
              <span className={d.hasInternet ? 'text-xs text-mesh-accent' : 'text-xs text-slate-600'}>
                {d.hasInternet ? '📡 4G' : '📴 offline'}
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-100">{d.packetCount}</div>
            <div className="text-xs text-slate-500">packet{d.packetCount === 1 ? '' : 's'} held</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">Idempotency cache size: {data?.idempotencyCacheSize ?? '—'}</p>
    </Panel>
  );
}
