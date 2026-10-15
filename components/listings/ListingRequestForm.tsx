'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Check, AlertCircle, Loader2 } from 'lucide-react';

type Props = { slug: string; hotelName: string; kind: 'claim' | 'removal'; token?: string };
type Done = { removed: boolean; verified: boolean };

const input = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export default function ListingRequestForm({ slug, hotelName, kind, token }: Props) {
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const [email, setEmail] = useState('');
  const claim = kind === 'claim';

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!claim && !fd.get('confirm')) { setError('Please tick the box to confirm.'); setState('error'); return; }
    setState('sending'); setError('');
    try {
      const res = await fetch('/api/listing-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, kind, token: token || null,
          name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email') || '',
          role: fd.get('role') || '', message: fd.get('message') || '', website: fd.get('website') || '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Something went wrong. Please try again.'); setState('error'); return; }
      setDone({ removed: !!data.removed, verified: !!data.verified });
    } catch {
      setError('Could not send. Check your connection and try again.'); setState('error');
    }
  }

  if (done) return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-6 sm:p-8 text-center">
      <Check className="h-10 w-10 text-green-600 mx-auto mb-3" />
      {claim ? (
        <>
          <h2 className="text-xl font-heading font-bold text-slate-900 mb-2">Request received</h2>
          <p className="text-slate-600 mb-5">We'll check that you manage {hotelName} and reply on WhatsApp, usually within a day. To save time, create your free partner login now with <strong>{email}</strong>: we'll link the listing to it once we've verified you.</p>
          <Link href="/partner/register" className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-brand-700">Create partner login</Link>
        </>
      ) : done.removed ? (
        <>
          <h2 className="text-xl font-heading font-bold text-slate-900 mb-2">Listing removed</h2>
          <p className="text-slate-600">{hotelName} is no longer shown on Dharamshala Stay. Search engines may take a few days to drop the old page. Changed your mind? Just reply to our WhatsApp message.</p>
        </>
      ) : (
        <>
          <h2 className="text-xl font-heading font-bold text-slate-900 mb-2">Request received</h2>
          <p className="text-slate-600">We'll confirm you're from {hotelName} (usually by a quick call or WhatsApp to the hotel's number) and take the listing down, normally within 48 hours.</p>
        </>
      )}
    </div>
  );

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm"><span className="font-medium text-slate-700">Your name *</span>
          <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={input + ' mt-1'} /></label>
        <label className="block text-sm"><span className="font-medium text-slate-700">Phone / WhatsApp *</span>
          <input name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98160 00000" className={input + ' mt-1'} /></label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm"><span className="font-medium text-slate-700">Email{claim ? ' *' : ''}</span>
          <input name="email" type="email" required={claim} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input + ' mt-1'} /></label>
        <label className="block text-sm"><span className="font-medium text-slate-700">Your role</span>
          <select name="role" className={input + ' mt-1 bg-white'} defaultValue="Owner">
            <option>Owner</option><option>Manager</option><option>Family member of owner</option><option>Staff</option><option>Other</option>
          </select></label>
      </div>
      <label className="block text-sm"><span className="font-medium text-slate-700">{claim ? 'Anything we should know? (optional)' : 'Reason (optional)'}</span>
        <textarea name="message" rows={3} maxLength={1500} className={input + ' mt-1'}
          placeholder={claim ? 'e.g. correct phone number, rooms, best time to call' : 'e.g. we have closed, or we prefer not to be listed'} /></label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {!claim && (
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="confirm" className="mt-1" />
          <span>I own or manage {hotelName} and want its listing removed from Dharamshala Stay.</span>
        </label>
      )}
      {state === 'error' && (
        <p role="alert" className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>
      )}
      <button type="submit" disabled={state === 'sending'}
        className={(claim ? 'bg-brand-600 hover:bg-brand-700' : 'bg-slate-800 hover:bg-slate-900') + ' w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-60'}>
        {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
        {claim ? 'Claim this listing' : 'Remove this listing'}
      </button>
    </form>
  );
}
