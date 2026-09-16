import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OffPay — Mesh Dashboard',
  description: 'Offline UPI payments routed through a Bluetooth-style mesh network.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
