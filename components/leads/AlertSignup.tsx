'use client';
import { useState, type FormEvent } from 'react';
import { BellRing, Check } from 'lucide-react';
import { track } from '@/lib/track';
import type { LeadAlert } from '@/lib/leads/topics';
import type { Lang } from '@/lib/i18n/core';

/**
 * "Tell me when..." email alert. Uses the newsletter sign-up (double opt-in: nothing is sent until they
 * click the confirmation link) and tags the contact with the alert's interest, so a mailing can go to
 * exactly the people who asked for it.
 */
export default function AlertSignup({ alert, lang = 'en', dark = false, className = '' }: { alert: LeadAlert; lang?: Lang; dark?: boolean; className?: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const hi = lang === 'hi';

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === 'busy') return;
    const fd = new FormData(e.currentTarget);
    setState('busy');
    try {
      const r = await fetch('/api/email/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fd.get('email'), website: fd.get('website') || undefined, lang, interests: [alert.interest] }),
      });
      if (!r.ok) throw new Error();
      setState('done');
      track('alert_signup', { topic: alert.interest });
    } catch { setState('error'); }
  }

  const tone = dark
    ? 'border-[#f2c46d]/40 bg-white/5 text-white'
    : 'border-amber-200 bg-amber-50 text-slate-900';
  return (
    <aside className={'not-prose my-8 rounded-2xl border p-5 ' + tone + ' ' + className} aria-label={alert.title}>
      <p className="flex items-center gap-2 font-heading text-lg font-bold"><BellRing className={'h-5 w-5 shrink-0 ' + (dark ? 'text-[#f2c46d]' : 'text-amber-600')} aria-hidden="true" />{alert.title}</p>
      <p className={'mt-1 text-sm ' + (dark ? 'text-white/75' : 'text-slate-600')}>{alert.sub}</p>
      {state === 'done' ? (
        <p className={'mt-3 flex items-center gap-2 text-sm font-medium ' + (dark ? 'text-emerald-300' : 'text-emerald-700')} aria-live="polite">
          <Check className="h-4 w-4 shrink-0" />{hi ? 'बस एक कदम! अपना इनबॉक्स देखें और लिंक पर क्लिक करके पुष्टि करें।' : 'Almost there! Check your inbox and click the link to confirm.'}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor={'alert-' + alert.interest}>{hi ? 'आपका ईमेल' : 'Your email'}</label>
          <input id={'alert-' + alert.interest} name="email" type="email" required autoComplete="email" placeholder={hi ? 'आपका ईमेल' : 'Your email'}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500" />
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <button disabled={state === 'busy'} className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
            {state === 'busy' ? '…' : hi ? 'अलर्ट चालू करें' : 'Alert me'}
          </button>
        </form>
      )}
      {state === 'error' && <p className="mt-2 text-xs text-red-500">{hi ? 'कृपया सही ईमेल डालें और दोबारा कोशिश करें।' : 'Please enter a valid email and try again.'}</p>}
      <p className={'mt-2 text-xs ' + (dark ? 'text-white/50' : 'text-slate-500')}>{hi ? 'कभी भी अनसब्सक्राइब करें।' : 'Only this alert and our occasional travel email. Unsubscribe any time.'}</p>
    </aside>
  );
}
