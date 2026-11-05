'use client';
import { useRef, useState, type FormEvent } from 'react';
import { Check, MessageCircle, Send } from 'lucide-react';
import { getMinDate } from '@/lib/date-helpers';
import { newClientId } from '@/lib/client-id';
import { getWhatsAppLink } from '@/lib/utils';
import { track } from '@/lib/track';
import type { LeadTopic } from '@/lib/leads/topics';
import type { Lang } from '@/lib/i18n/core';

const HI = {
  title: 'स्थानीय टीम से मुफ़्त ट्रिप प्लान पाएं', sub: 'अपनी तारीख और लोगों की संख्या बताएं। हमारी टीम WhatsApp पर दिन-ब-दिन प्लान और होटल-टैक्सी के मौजूदा दाम भेजेगी।',
  name: 'आपका नाम', phone: 'WhatsApp नंबर', date: 'यात्रा की तारीख (वैकल्पिक)', people: 'लोग', send: 'मुफ़्त प्लान पाएं', sending: 'भेज रहे हैं…',
  done: 'धन्यवाद! हमारी टीम जल्द ही WhatsApp पर संपर्क करेगी।', err: 'कुछ गलत हो गया। कृपया दोबारा कोशिश करें या WhatsApp करें।', or: 'या सीधे WhatsApp करें', note: 'हम आपका नंबर सिर्फ़ इस यात्रा के लिए इस्तेमाल करते हैं।',
};
const EN = {
  name: 'Your name', phone: 'WhatsApp number', date: 'Travel date (optional)', people: 'People', send: 'Send me the plan', sending: 'Sending…',
  done: 'Thank you! A local from our team will message you on WhatsApp shortly.', err: 'Something went wrong. Please try again or message us on WhatsApp.', or: 'or message us on WhatsApp', note: 'Free, no obligation. We use your number only for this trip.',
};

/** Marks that this visitor has already sent us their details, so the trip plan offer stays away. */
export const LEAD_SENT_KEY = 'ds-lead-sent';

/**
 * "Ask a local" box: name, WhatsApp number, date and group size. Saves an ordinary enquiry (admin panel,
 * owner alert, follow-up), noting the page and topic. `compact` is the version that sits inside a guide.
 */
export default function LeadBox({ topic, lang = 'en', source, compact = false, place, id, className = '' }: {
  topic: LeadTopic; lang?: Lang;
  /** Where the lead came from, e.g. "Guide: /blog/triund-trek-complete-guide". */
  source: string;
  compact?: boolean;
  /** Analytics name of the spot, e.g. trip_plan; defaults to guide_inline / guide_end. */
  place?: string;
  id?: string; className?: string;
}) {
  const hi = lang === 'hi';
  const t = hi ? HI : EN;
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [date, setDate] = useState('');
  const leadId = useRef('');
  const where = place || (compact ? 'guide_inline' : 'guide_end');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === 'busy') return;
    const fd = new FormData(e.currentTarget);
    if (fd.get('website')) return; // bots fill the hidden field
    setState('busy');
    if (!leadId.current) leadId.current = newClientId();
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leadId.current, type: topic.form, name: fd.get('name'), phone: fd.get('phone'),
          message: `[${source} · ${topic.key} · ${where}] ${topic.title}`,
          check_in: date || undefined, guests: Number(fd.get('guests')) || undefined, lang,
        }),
      });
      if (!res.ok) throw new Error();
      setState('done');
      track('generate_lead', { form: where, topic: topic.key });
      try { localStorage.setItem(LEAD_SENT_KEY, String(Date.now())); } catch {}
    } catch {
      leadId.current = '';
      setState('error');
    }
  }

  const box = 'not-prose rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white ' + (compact ? 'p-5 my-8' : 'p-6 sm:p-8 my-10');
  if (state === 'done') {
    return (
      <aside id={id} className={box + ' ' + className} aria-live="polite">
        <p className="flex items-center gap-2 font-semibold text-emerald-800"><Check className="h-5 w-5 shrink-0" />{t.done}</p>
      </aside>
    );
  }
  const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500';
  return (
    <aside id={id} className={box + ' scroll-mt-24 ' + className} aria-label={hi ? HI.title : topic.title}>
      <p className={'font-heading font-bold text-slate-900 ' + (compact ? 'text-lg' : 'text-xl')}>{hi ? HI.title : topic.title}</p>
      <p className="mt-1 text-sm text-slate-600">{hi ? HI.sub : topic.sub}</p>
      <form onSubmit={submit} className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <label className="sr-only" htmlFor={(id || where) + '-name'}>{t.name}</label>
        <input id={(id || where) + '-name'} name="name" required minLength={2} autoComplete="name" placeholder={t.name} className={field} />
        <label className="sr-only" htmlFor={(id || where) + '-phone'}>{t.phone}</label>
        <input id={(id || where) + '-phone'} name="phone" type="tel" required inputMode="tel" autoComplete="tel" pattern="[+0-9 ()-]{10,}" title="10-digit mobile number" placeholder={t.phone} className={field} />
        <label className="sr-only" htmlFor={(id || where) + '-date'}>{t.date}</label>
        <input id={(id || where) + '-date'} type="date" value={date} min={getMinDate()} onChange={(e) => setDate(e.target.value)} aria-label={t.date} title={t.date} className={field + ' text-slate-600'} />
        <label className="sr-only" htmlFor={(id || where) + '-guests'}>{t.people}</label>
        <select id={(id || where) + '-guests'} name="guests" defaultValue="2" className={field}>
          {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n === 10 ? '10+' : n} {t.people.toLowerCase()}</option>)}
        </select>
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <button type="submit" disabled={state === 'busy'} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60 sm:col-span-2">
          {state === 'busy' ? t.sending : <><Send className="h-4 w-4" />{t.send}</>}
        </button>
      </form>
      {state === 'error' && <p className="mt-2 text-sm text-red-600">{t.err}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>{t.note}</span>
        <a href={getWhatsAppLink(topic.wa)} target="_blank" rel="noopener noreferrer" data-lead={topic.key} className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline">
          <MessageCircle className="h-3.5 w-3.5" />{t.or}
        </a>
      </div>
    </aside>
  );
}
