'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BedDouble, Car, Sparkles, X } from 'lucide-react';
import { TRIP_PLAN_PAGES, topicForPath } from '@/lib/leads/topics';
import { track } from '@/lib/track';
import LeadBox, { LEAD_SENT_KEY } from './LeadBox';
import './leads.css';

const SEEN_KEY = 'ds-plan-offer';          // sessionStorage: shown this visit
const CLOSED_KEY = 'ds-plan-offer-closed'; // localStorage: closed, rest for 7 days
const WEEK = 7 * 864e5;

function store(kind: 'local' | 'session', key: string, value?: string): string | null {
  try {
    const s = kind === 'local' ? localStorage : sessionStorage;
    if (value === undefined) return s.getItem(key);
    s.setItem(key, value);
  } catch { /* private mode: just show less */ }
  return null;
}

/**
 * Site-wide lead tools, one small client component in the layout:
 * - counts every WhatsApp and phone tap in GA (one listener, no change to each link);
 * - on guide pages on phones, a slim bar with Hotels, Taxi and "Free plan";
 * - the free trip plan offer, at most once a visit, only on reading pages, only after real reading:
 *   desktop when the pointer leaves for the tab bar, phones after scrolling most of a page.
 *   Never on arrival, and it does not cover the page on phones (a small bottom sheet).
 */
export default function LeadLayer() {
  const path = usePathname() || '/';
  const hindi = /^\/hi(\/|$)/.test(path);
  const isGuide = /^\/(hi\/)?blog\/[^/]+$/.test(path);
  const [offer, setOffer] = useState(false);
  const [bar, setBar] = useState(false);
  const shownAt = useRef(0);
  const dialog = useRef<HTMLDivElement>(null);

  // WhatsApp and phone taps anywhere on the site.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a');
      const href = a?.getAttribute('href') || '';
      if (/wa\.me|api\.whatsapp\.com/.test(href)) track('whatsapp_click', { topic: a?.getAttribute('data-lead') || topicForPath(location.pathname).key });
      else if (href.startsWith('tel:')) track('phone_click', { topic: topicForPath(location.pathname).key });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Guide bar on phones: appears once the reader is past the first screen.
  useEffect(() => {
    if (!isGuide) { setBar(false); return; }
    const onScroll = () => setBar(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isGuide, path]);
  useEffect(() => {
    document.body.classList.toggle('has-guide-bar', bar);
    return () => document.body.classList.remove('has-guide-bar');
  }, [bar]);

  // The free trip plan offer.
  useEffect(() => {
    setOffer(false);
    if (!TRIP_PLAN_PAGES.test(path)) return;
    if (store('session', SEEN_KEY) || store('local', LEAD_SENT_KEY)) return;
    const closed = Number(store('local', CLOSED_KEY) || 0);
    if (closed && Date.now() - closed < WEEK) return;
    const start = Date.now();
    const engaged = () => Date.now() - start > 15000;
    const show = () => {
      if (store('session', SEEN_KEY)) return;
      store('session', SEEN_KEY, '1');
      shownAt.current = Date.now();
      setOffer(true);
      track('trip_plan_shown', { topic: topicForPath(path).key });
    };
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const onLeave = (e: MouseEvent) => { if (!e.relatedTarget && e.clientY <= 0 && engaged()) show(); };
    const onScroll = () => {
      const doc = document.documentElement;
      const read = (window.scrollY + window.innerHeight) / doc.scrollHeight;
      if (read > 0.6 && Date.now() - start > 25000) show();
    };
    if (fine) document.addEventListener('mouseout', onLeave);
    else window.addEventListener('scroll', onScroll, { passive: true });
    return () => { document.removeEventListener('mouseout', onLeave); window.removeEventListener('scroll', onScroll); };
  }, [path]);

  const close = () => {
    setOffer(false);
    store('local', CLOSED_KEY, String(Date.now()));
    track('trip_plan_closed', { seconds: Math.round((Date.now() - shownAt.current) / 1000) });
  };
  useEffect(() => {
    if (!offer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    dialog.current?.querySelector<HTMLElement>('input')?.focus({ preventScroll: true });
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer]);

  const topic = topicForPath(path);
  return (
    <>
      {isGuide && (
        <nav className={'lead-bar' + (bar ? ' on' : '')} aria-label={hindi ? 'यात्रा बुक करें' : 'Plan your trip'} aria-hidden={!bar}>
          <Link href={hindi ? '/hi/hotels' : '/hotels'} tabIndex={bar ? 0 : -1} onClick={() => track('guide_bar_click', { cta: 'hotels' })}><BedDouble className="h-4 w-4" aria-hidden="true" />{hindi ? 'होटल' : 'Hotels'}</Link>
          <Link href={hindi ? '/hi/taxi' : '/taxi'} tabIndex={bar ? 0 : -1} onClick={() => track('guide_bar_click', { cta: 'taxi' })}><Car className="h-4 w-4" aria-hidden="true" />{hindi ? 'टैक्सी' : 'Taxi'}</Link>
          <a href="#plan" tabIndex={bar ? 0 : -1} className="lead-bar-main" onClick={() => track('guide_bar_click', { cta: 'plan' })}><Sparkles className="h-4 w-4" aria-hidden="true" />{hindi ? 'मुफ़्त प्लान' : 'Free trip plan'}</a>
        </nav>
      )}
      {offer && (
        <div className="lead-offer" role="dialog" aria-modal="false" aria-label={hindi ? 'मुफ़्त ट्रिप प्लान' : 'Free trip plan'} ref={dialog}>
          <button type="button" className="lead-offer-x" onClick={close} aria-label={hindi ? 'बंद करें' : 'Close'}><X className="h-5 w-5" /></button>
          <LeadBox
            topic={{ ...topic, key: 'trip-plan-' + topic.key, title: hindi ? topic.title : 'Before you go: a free trip plan from a local', sub: 'Tell us your date and group size. We send a day-by-day plan with current hotel and taxi prices on WhatsApp. Free, no obligation.' }}
            lang={hindi ? 'hi' : 'en'} source={'Trip plan offer: ' + path} compact place="trip_plan" className="!my-0 !border-0 !bg-none !p-0"
          />
        </div>
      )}
    </>
  );
}
