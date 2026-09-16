'use client';

import { useState } from 'react';
import { ActionLog } from '@/components/ActionLog';
import { MeshActions } from '@/components/MeshActions';
import { MeshPanel } from '@/components/MeshPanel';
import { SendMoneyForm } from '@/components/SendMoneyForm';

export default function SendPage() {
  const [log, setLog] = useState<string[]>([]);

  function appendLog(line: string) {
    setLog((prev) => [line, ...prev].slice(0, 50));
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Send Money</h1>
        <p className="text-sm text-slate-500">
          You&apos;re offline. Send a payment, watch it hop across nearby phones, then reach the network.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <SendMoneyForm onLog={appendLog} />
        <MeshActions onLog={appendLog} />
        <MeshPanel />
        <ActionLog lines={log} onClear={() => setLog([])} />
      </div>
    </div>
  );
}
