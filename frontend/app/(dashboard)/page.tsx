import { MeshPanel } from '@/components/MeshPanel';
import { RecentTransactions } from '@/components/RecentTransactions';
import { ServerKeyBanner } from '@/components/ServerKeyBanner';
import { StatCards } from '@/components/StatCards';

export default function OverviewPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Send money with zero connectivity — it hops phone to phone until one reaches a signal.
        </p>
      </header>

      <ServerKeyBanner />
      <StatCards />

      <div className="grid gap-6 lg:grid-cols-2">
        <MeshPanel />
        <RecentTransactions />
      </div>
    </div>
  );
}
