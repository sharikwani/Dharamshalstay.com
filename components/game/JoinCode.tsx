'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

/** "Enter the 6-digit code" box. A QR scan arrives as /play?code=123456 and goes straight in. */
export default function JoinCode() {
  const router = useRouter();
  const [code, setCode] = useState('');
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('code');
    if (c && /^\d{6}$/.test(c)) router.replace('/play/' + c);
  }, [router]);
  const ok = /^\d{6}$/.test(code);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ok) router.push('/play/' + code); }} className="flex flex-col gap-3">
      <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="off" placeholder="6-digit game code" aria-label="Game code"
        className="flex-1 rounded-xl border-2 border-white/30 bg-white px-4 py-4 text-center text-2xl font-bold tracking-[0.3em] text-slate-900 outline-none focus:border-orange-400" />
      <button disabled={!ok} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-orange-600 px-6 py-4 text-lg font-semibold text-white hover:bg-orange-700 disabled:opacity-50">Join game <ArrowRight className="h-5 w-5" /></button>
    </form>
  );
}
