import type { Metadata } from 'next';
import Link from 'next/link';
import HostSetup from '@/components/game/HostSetup';

export const metadata: Metadata = { title: { absolute: 'Host a tambola game | Dharamshala Stay' }, robots: { index: false, follow: true } };

export default function HostSetupPage() {
  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-brand-50 to-orange-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-heading font-bold text-slate-900 text-center">Host a tambola game</h1>
        <p className="text-slate-600 text-center mt-2 mb-6">Free. Guests join on their phones with a 6-digit code. Top 3 winners get a certificate and a Dharamshala Stay discount code.</p>
        <HostSetup />
        <p className="text-center text-sm text-slate-500 mt-6"><Link href="/play" className="underline">How it works</Link></p>
      </div>
    </div>
  );
}
