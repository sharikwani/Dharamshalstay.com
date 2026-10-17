// Creates the partner_onboarding_reminder WhatsApp template (Utility): reminds a partner what is left in onboarding.
// Usage: node scripts/create-partner-reminder-template.mjs   (needs WHATSAPP_TOKEN and WHATSAPP_WABA_ID in .env.local)
import { existsSync, readFileSync } from 'node:fs';

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#') || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const token = process.env.WHATSAPP_TOKEN;
const wabaId = process.env.WHATSAPP_WABA_ID;
if (!token || !wabaId) { console.error('Set WHATSAPP_TOKEN and WHATSAPP_WABA_ID first.'); process.exit(1); }

const body = [
  'Hello {{1}} 🙏',
  '',
  'Thank you for signing up *{{2}}* as a partner on Dharamshala Stay. Your partner account is not complete yet.',
  '',
  '📝 *Still missing:* {{3}}',
  '',
  'Log in with the button below to finish these steps. If you need any help, just reply to this message and our team will get it all sorted in no time.',
].join('\n');

const components = [
  { type: 'BODY', text: body, example: { body_text: [['Ankit', 'Inderunaag adventure', 'Confirm your email, Your full legal name, PAN number, Sign the partner agreement']] } },
  { type: 'FOOTER', text: 'Dharamshala Stay · dharamshalastay.com' },
  { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Open partner account', url: 'https://www.dharamshalastay.com/partner/login' }] },
];
const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'partner_onboarding_reminder', category: 'UTILITY', language: 'en', components }),
});
const data = await res.json().catch(() => ({}));
if (res.ok) console.log(`partner_onboarding_reminder: created, id ${data.id}, status ${data.status}, category ${data.category}`);
else { console.error('FAILED -', data?.error?.error_user_msg || data?.error?.message || `HTTP ${res.status}`); process.exit(1); }
