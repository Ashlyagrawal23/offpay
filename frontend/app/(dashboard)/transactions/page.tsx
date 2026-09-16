import { TransactionsTable } from '@/components/TransactionsTable';

export default function TransactionsPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">My Transactions</h1>
        <p className="text-sm text-slate-500">Payments you&apos;ve sent or received — last 20.</p>
      </header>

      <TransactionsTable />
    </div>
  );
}
