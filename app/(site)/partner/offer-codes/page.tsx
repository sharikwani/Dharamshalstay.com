'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CodeResult, { type CodeCheck } from '@/components/offers/CodeResult';
import { cn } from '@/lib/utils';

export default function PartnerOfferCodesPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<CodeCheck | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/partner/login');
      else setToken(session.access_token);
    });
  }, [router]);

  async function send(action: 'check' | 'redeem') {
    if (!code.trim() || !token) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/partner/offer-codes', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, code }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.result) setResult(d.result);
      if (!res.ok) setMsg({ ok: false, text: d.error || 'Something went wrong' });
      else if (action === 'redeem') setMsg({ ok: true, text: 'Marked as used. This code cannot be used again.' });
    } catch { setMsg({ ok: false, text: 'Could not reach the server. Please check your connection.' }); }
    setBusy(false);
  }

  if (!token) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/partner/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900">Check an offer code</h1>
      <p className="text-slate-600 text-sm mb-6">Guests who chat with Dharamshala Stay on WhatsApp can get a discount code for your hotel. Check it here before you give the discount, then mark it as used.</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input value={code} onChange={(e) => { setCode(e.target.value); setResult(null); setMsg(null); }} placeholder="e.g. PNV-7K3Q9" aria-label="Offer code"
          className="px-3 py-2 border border-slate-300 rounded-lg uppercase w-48" />
        <button onClick={() => send('check')} disabled={busy || !code.trim()} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">Check</button>
        <button onClick={() => send('redeem')} disabled={busy || !result?.valid} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50">Mark as used</button>
        {busy && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
      </div>
      {msg && <p className={cn('text-sm mb-3', msg.ok ? 'text-green-700' : 'text-red-600')}>{msg.text}</p>}
      {result && <CodeResult r={result} />}

      <ul className="mt-6 text-sm text-slate-600 list-disc pl-5 space-y-1">
        <li><b>Walk-in coupon:</b> valid only until the time shown. Give the discount at the desk, then mark it as used.</li>
        <li><b>Paid online booking:</b> the guest already paid the discounted price. Give no further discount; mark it as used at check-in.</li>
      </ul>
    </div>
  );
}
