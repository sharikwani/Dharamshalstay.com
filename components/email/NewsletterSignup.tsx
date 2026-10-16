'use client';
import { useState, type FormEvent } from 'react';
import { Mail, Check } from 'lucide-react';
import type { Lang } from '@/lib/i18n/core';

const TXT = {
  en: { title: 'Travel ideas from the mountains', sub: 'Festival weekends, snow alerts, seasonal guides and member-only offers. At most once a week.', ph: 'Your email', btn: 'Subscribe', done: 'Almost there! Check your inbox and click the link to confirm.', err: 'Please enter a valid email and try again.' },
  hi: { title: 'पहाड़ों से यात्रा सुझाव', sub: 'त्योहार वीकेंड, बर्फ़बारी अलर्ट, मौसम गाइड और खास ऑफ़र। हफ़्ते में अधिकतम एक ईमेल।', ph: 'आपका ईमेल', btn: 'सब्सक्राइब करें', done: 'बस एक कदम! अपना इनबॉक्स देखें और लिंक पर क्लिक करके पुष्टि करें।', err: 'कृपया सही ईमेल डालें और दोबारा कोशिश करें।' },
};

/** Footer newsletter sign-up. Double opt-in: nobody is subscribed until they click the email link. */
export default function NewsletterSignup({ lang = 'en' }: { lang?: Lang }) {
  const t = TXT[lang] || TXT.en;
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState('busy');
    try {
      const r = await fetch('/api/email/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fd.get('email'), website: fd.get('website') || undefined, lang }) });
      setState(r.ok ? 'done' : 'error');
    } catch { setState('error'); }
  };
  return (
    <div className="rounded-2xl bg-gradient-to-r from-brand-800 to-slate-800 border border-white/10 p-6 sm:p-8 mb-12 flex flex-col lg:flex-row lg:items-center gap-5">
      <div className="flex-1">
        <h2 className="text-white font-heading font-bold text-xl flex items-center gap-2"><Mail className="h-5 w-5 text-orange-400" /> {t.title}</h2>
        <p className="text-sm text-slate-300 mt-1">{t.sub}</p>
      </div>
      {state === 'done' ? (
        <p className="flex items-center gap-2 text-green-300 text-sm font-medium lg:max-w-md"><Check className="h-5 w-5 shrink-0" /> {t.done}</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 lg:w-[460px]">
          <label className="sr-only" htmlFor="nl-email">{t.ph}</label>
          <input id="nl-email" name="email" type="email" required placeholder={t.ph} autoComplete="email" className="flex-1 px-4 py-2.5 rounded-lg bg-white text-slate-900 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <button disabled={state === 'busy'} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-60">{state === 'busy' ? '…' : t.btn}</button>
          {state === 'error' && <p className="text-red-300 text-xs sm:basis-full">{t.err}</p>}
        </form>
      )}
    </div>
  );
}
