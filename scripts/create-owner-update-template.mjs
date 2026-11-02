// Creates the owner_update WhatsApp template (Utility): a plain account notification to the site owner about a
// booking, enquiry or other activity. Replaces owner_alert, which Meta moved to Marketing (27 Oct 2026).
// Usage: node scripts/create-owner-update-template.mjs   (needs WHATSAPP_TOKEN and WHATSAPP_WABA_ID in .env.local)
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
  'Account activity on Dharamshala Stay: {{1}}',
  '',
  'Details: {{2}}',
  '',
  'View the record in your admin panel: {{3}}',
  '',
  'Reply here if anything needs changing.',
].join('\n');

const components = [
  { type: 'BODY', text: body, example: { body_text: [['New booking HTL-261024-AB12', 'Panchvati Cottages, Super Deluxe, 1 to 3 Dec 2026, 4 guests, Rs 5,000, pay at hotel', 'https://www.dharamshalastay.com/admin/bookings']] } },
  { type: 'FOOTER', text: 'Service notice for the account manager' },
];
const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'owner_update', category: 'UTILITY', language: 'en', components }),
});
const data = await res.json().catch(() => ({}));
if (res.ok) console.log(`owner_update: created, id ${data.id}, status ${data.status}, category ${data.category}`);
else { console.error('FAILED -', data?.error?.error_user_msg || data?.error?.message || `HTTP ${res.status}`); process.exit(1); }
