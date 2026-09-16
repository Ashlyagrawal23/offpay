import { MyAccountCard } from '@/components/MyAccountCard';

export default function AccountPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">My Account</h1>
        <p className="text-sm text-slate-500">Your OffPay profile and balance.</p>
      </header>

      <div className="max-w-md">
        <MyAccountCard />
      </div>
    </div>
  );
}
