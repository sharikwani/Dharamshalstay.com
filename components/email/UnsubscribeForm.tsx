'use client';
import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

export default function UnsubscribeForm({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'out' | 'in' | 'error'>('idle');
  const call = async (resubscribe: boolean) => {
    setState('busy');
    try {
      const r = await fetch('/api/email/unsubscribe?t=' + encodeURIComponent(token) + (resubscribe ? '&resubscribe=1' : ''), { method: 'POST' });
      setState(r.ok ? (resubscribe ? 'in' : 'out') : 'error');
    } catch { setState('error'); }
  };

  if (state === 'out') return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-green-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3"><CheckCircle className="h-5 w-5" /> You have been unsubscribed from travel ideas and offers.</p>
      <p className="text-slate-600">Changed your mind? <button onClick={() => call(true)} className="underline text-brand-700">Keep me subscribed</button></p>
    </div>
  );
  if (state === 'in') return <p className="flex items-center gap-2 text-green-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3"><CheckCircle className="h-5 w-5" /> You are subscribed again. Thank you!</p>;

  return (
    <div className="space-y-4">
      <p className="text-slate-600">Stop receiving travel ideas, festival plans and offers from Dharamshala Stay?</p>
      <button onClick={() => call(false)} disabled={state === 'busy'} className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-700 disabled:opacity-60">
        {state === 'busy' ? 'Please wait…' : 'Unsubscribe me'}
      </button>
      {state === 'error' && <p className="text-red-700 text-sm">Something went wrong. Please try again, or reply to our email with &quot;unsubscribe&quot;.</p>}
    </div>
  );
}
