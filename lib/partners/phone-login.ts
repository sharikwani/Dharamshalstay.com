/**
 * Partner accounts the team makes for people who log in with their mobile number instead of an email
 * (e.g. a hotel owner set up over WhatsApp). Supabase logs in by email, so such an account gets a stand-in
 * address made from the number: 919711900435@phone.dharamshalastay.com. Nothing is ever emailed to it.
 */
export const PHONE_LOGIN_DOMAIN = 'phone.dharamshalastay.com';

/** "+91 97119 00435", "09711900435" or "9711900435" -> "919711900435@phone.dharamshalastay.com"; null if not a mobile number. */
export function phoneLoginEmail(input: string): string | null {
  let d = String(input || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = '91' + d;
  if (!/^\d{11,15}$/.test(d)) return null;
  return `${d}@${PHONE_LOGIN_DOMAIN}`;
}

/** True for the stand-in addresses above (they have no mailbox, so emails to them are skipped). */
export function isPhoneLoginEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith('@' + PHONE_LOGIN_DOMAIN);
}

/** What the login form sends to Supabase: an email as typed, or the stand-in address for a mobile number. */
export function loginEmailFor(input: string): string {
  const v = String(input || '').trim();
  if (v.includes('@')) return v;
  return phoneLoginEmail(v) || v;
}
