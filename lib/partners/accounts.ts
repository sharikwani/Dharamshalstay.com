import { HttpError, serviceClient } from '@/lib/server-auth';
import { sendEmail } from '@/lib/email';
import { normalizeIndianPhone } from '@/lib/whatsapp';
import { PARTNER_COMMISSION } from './agreement';
import { ACTIVITY_PARTNER_TYPES, type ActivityPartnerType } from './types';

/**
 * Partner accounts the team creates (e.g. a taxi + trek + paragliding operator signed up over the phone), and the
 * "set your password" link. Nobody on our side ever sees or sets a partner's password: the partner chooses it
 * from a one-time link sent to their own email.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dharamshalastay.com';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** One-time link to choose a password: /partner/set-password?token_hash=...&type=recovery (no redirect allow-list needed). */
async function passwordLink(email: string): Promise<string> {
  const { data, error } = await serviceClient().auth.admin.generateLink({ type: 'recovery', email });
  const hash = (data as any)?.properties?.hashed_token;
  if (error || !hash) throw new HttpError(500, 'Could not make the password link. Please try again.');
  return `${SITE}/partner/set-password?token_hash=${encodeURIComponent(hash)}&type=recovery`;
}

export async function sendSetPasswordEmail(email: string, name: string, reason: 'new' | 'reset') {
  const link = await passwordLink(email);
  const intro = reason === 'new'
    ? `<p>Your Dharamshala Stay partner account is ready. Choose your password to log in, upload your documents and sign the partner agreement. Once we approve you, bookings start coming to you on WhatsApp and email.</p>`
    : `<p>We received a request to reset your Dharamshala Stay partner password. If it was not you, ignore this email: your password stays the same.</p>`;
  await sendEmail({
    to: email,
    subject: reason === 'new' ? 'Your Dharamshala Stay partner account: set your password' : 'Reset your Dharamshala Stay partner password',
    html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2 style="color:#1e3a5f">${reason === 'new' ? 'Welcome to Dharamshala Stay' : 'Reset your password'}</h2>
<p>Hi ${esc(name || 'there')},</p>${intro}
<p><a href="${link}" style="display:inline-block;background:#ea580c;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Choose my password</a></p>
<p style="color:#64748b;font-size:13px">The link works once and expires in about an hour. If it has expired, use "Forgot password?" on ${SITE}/partner/login.</p>
<p style="color:#94a3b8;font-size:12px;margin-top:24px">Dharamshala Stay</p></div>`,
  });
}

export type NewPartner = { email: string; full_name: string; phone: string; business_name?: string; services: ActivityPartnerType[] };

/** Create a partner account offering one or more services, then email them the set-password link. */
export async function createPartnerAccount(input: NewPartner): Promise<{ id: string }> {
  const email = input.email.trim().toLowerCase();
  const services = ACTIVITY_PARTNER_TYPES.filter((t) => input.services.includes(t));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new HttpError(400, 'Enter a valid email.');
  if (!services.length) throw new HttpError(400, 'Choose at least one service.');
  const phone = normalizeIndianPhone(input.phone) || input.phone.replace(/[^\d+]/g, '');
  const sb = serviceClient();
  const { data: existing } = await sb.from('profiles').select('id').eq('email', email).maybeSingle();
  if (existing) throw new HttpError(409, 'An account with this email already exists.');
  const primary = services[0];
  const { data, error } = await sb.auth.admin.createUser({
    email, email_confirm: true,
    user_metadata: { role: 'partner', partner_type: primary, full_name: input.full_name.trim(), phone, business_name: input.business_name?.trim() || '' },
  });
  if (error || !data.user) throw new HttpError(500, 'Could not create the account: ' + (error?.message || 'unknown error'));
  // The sign-up trigger made the profile (partner_type, onboarding status, rate). Add every service; services with
  // different rates (taxi 20%, trek and paragliding 25%) leave no single rate, so each booking uses its own.
  const rates = new Set(services.map((t) => PARTNER_COMMISSION[t]));
  const { error: upErr } = await sb.from('profiles').update({
    partner_services: services, commission_pct: rates.size === 1 ? Array.from(rates)[0] : null,
  }).eq('id', data.user.id);
  if (upErr) throw new HttpError(500, 'Account made, but the services could not be saved: ' + upErr.message);
  await sendSetPasswordEmail(email, input.full_name, 'new');
  return { id: data.user.id };
}
