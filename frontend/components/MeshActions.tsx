'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';
import { Panel } from './Panel';

export function MeshActions({ onLog }: { onLog: (line: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function run(label: string, path: string) {
    setBusy(label);
    try {
      const result = await apiPost(path);
      onLog(`${label}: ${JSON.stringify(result)}`);
    } catch (err) {
      onLog(`❌ ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  const buttons: Array<{ label: string; icon: string; path: string }> = [
    { label: 'Nearby Phones Relay It', icon: '🔄', path: '/api/mesh/gossip' },
    { label: 'A Phone Reaches Signal', icon: '📡', path: '/api/mesh/flush' },
    { label: 'Start Over', icon: '♻️', path: '/api/mesh/reset' },
  ];

  return (
    <Panel title="Steps 2–4 — Watch It Reach the Network">
      <div className="flex flex-col gap-2">
        {buttons.map((b) => (
          <button
            key={b.path}
            onClick={() => run(b.label, b.path)}
            disabled={busy !== null}
            className="rounded-md border border-mesh-border bg-black/20 px-4 py-2 text-left text-sm text-slate-200 transition hover:border-mesh-accent disabled:opacity-50"
          >
            {b.icon} {busy === b.label ? 'Working...' : b.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}
