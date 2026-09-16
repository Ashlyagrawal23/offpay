'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';

interface ServerKeyInfo {
  publicKey: string;
  algorithm: string;
  hybridScheme: string;
}

export function ServerKeyBanner() {
  const { data } = useSWR<ServerKeyInfo>('/api/server-key', fetcher);
  if (!data) return null;

  return (
    <p className="mb-6 truncate rounded-md border border-mesh-border bg-black/20 px-3 py-2 font-mono text-xs text-slate-500">
      Server public key ({data.algorithm}): {data.publicKey.slice(0, 48)}...
    </p>
  );
}
