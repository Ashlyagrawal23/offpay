'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { clearToken, fetcher, UserProfile } from '@/lib/api';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/send', label: 'Send Money' },
  { href: '/account', label: 'My Account' },
  { href: '/transactions', label: 'My Transactions' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useSWR<UserProfile>('/api/me', fetcher);

  function logout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <header className="border-b border-mesh-border bg-mesh-panel/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="text-base font-bold text-slate-100">OffPay</span>
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    active
                      ? 'rounded-md bg-mesh-accent/15 px-3 py-1.5 text-sm font-medium text-mesh-accent'
                      : 'rounded-md px-3 py-1.5 text-sm text-slate-400 transition hover:bg-black/20 hover:text-slate-200'
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {me && <span className="hidden text-sm text-slate-400 sm:inline">Hi, {me.displayName.split(' ')[0]}</span>}
          <button onClick={logout} className="text-sm text-slate-400 hover:text-slate-200">
            Sign out
          </button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-mesh-border/60 px-4 py-2 sm:hidden">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? 'whitespace-nowrap rounded-md bg-mesh-accent/15 px-3 py-1 text-xs font-medium text-mesh-accent'
                  : 'whitespace-nowrap rounded-md px-3 py-1 text-xs text-slate-400 hover:bg-black/20 hover:text-slate-200'
              }
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
