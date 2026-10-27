/**
 * Emails to local guides: "we have your profile" on sign-up, and "your profile is live" on approval.
 * Sent through deliver() (logged, suppression-aware). Never throws.
 */
import { deliver } from '@/lib/email/send';
import type { EmailDoc } from '@/lib/email/layout';
import { siteConfig } from '@/lib/config';
import { GUIDE_COMMISSION_PCT } from './options';

const first = (name: string) => String(name || '').trim().split(/\s+/)[0] || 'there';
const SITE_URL = () => siteConfig.url.replace(/\/$/, '');

export function guideReceivedDoc(name: string): EmailDoc {
  return {
    preheader: 'We will call you on WhatsApp to check your details.',
    kicker: 'Local guides', heading: 'We have your guide profile',
    blocks: [
      { type: 'p', text: `Hi ${first(name)}, thank you for registering as a local guide on Dharamshala Stay.` },
      { type: 'list', ordered: true, items: [
        'Our team will call or WhatsApp you to check your ID, and your HP Tourism registration certificate if you have one.',
        'Once approved, your profile with your photo goes live on our Local guides page.',
        `Travellers book you through Dharamshala Stay. We send you each booking on WhatsApp, and keep a ${GUIDE_COMMISSION_PCT}% commission.`,
      ] },
      { type: 'small', text: 'Questions? Reply to this email or message us on WhatsApp.' },
    ],
    footer: { kind: 'transactional' },
  };
}

export function guideLiveDoc(name: string, slug: string): EmailDoc {
  const url = `${SITE_URL()}/local-guides/${slug}`;
  return {
    preheader: 'Travellers can now find and book you on Dharamshala Stay.',
    kicker: 'Local guides', heading: 'Your guide profile is live',
    blocks: [
      { type: 'p', text: `Hi ${first(name)}, good news: your profile is approved and live on Dharamshala Stay.` },
      { type: 'button', label: 'See your profile', href: url },
      { type: 'list', items: [
        'Share your profile link with travellers you meet; bookings made through it count for you.',
        'When someone books, we send you the booking on WhatsApp. Tap Accept to confirm.',
        'To change your day rate, photo, languages or areas, message us on WhatsApp.',
        `We keep a ${GUIDE_COMMISSION_PCT}% commission on each guide booking.`,
      ] },
      { type: 'small', text: url },
    ],
    footer: { kind: 'transactional' },
  };
}

export async function emailGuideReceived(g: { id?: string; name: string; email?: string | null }) {
  if (!g.email) return;
  try { await deliver({ to: g.email, subject: 'We have your local guide profile', doc: guideReceivedDoc(g.name), kind: 'transactional', template: 'guide_signup_received' }); }
  catch (e) { console.error('Guide sign-up email failed:', e); }
}

export async function emailGuideLive(g: { name: string; email?: string | null; slug?: string | null }) {
  if (!g.email || !g.slug) return;
  try { await deliver({ to: g.email, subject: 'Your guide profile is live on Dharamshala Stay', doc: guideLiveDoc(g.name, g.slug), kind: 'transactional', template: 'guide_profile_live' }); }
  catch (e) { console.error('Guide live email failed:', e); }
}
