// Creates the trip_completed_rating WhatsApp template (Utility): after a completed taxi, trek or paragliding booking,
// tells the customer the trip is closed, thanks them and links to the private page to rate the partner who ran it
// (/rate/<token>, lib/partner-reviews.ts). Sent by whatsappPartnerThanks in lib/booking-whatsapp.ts.
// Usage: node scripts/create-trip-completed-template.mjs   (needs WHATSAPP_TOKEN and WHATSAPP_WABA_ID in .env.local)
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
  'Hi {{1}}, your booking {{2}} with Dharamshala Stay is now marked as completed.',
  '',
  'Trip: {{3}}',
  'Served by: {{4}}',
  '',
  'Thank you for booking with us. Please rate this trip out of 5 using the button below. Your rating is linked to this booking only.',
  '',
  'Reply here if anything about this trip was not right.',
].join('\n');

const components = [
  { type: 'BODY', text: body, example: { body_text: [['Isha', 'TXI-261107-AD456', 'Gaggal Airport to McLeod Ganj, 9 Nov 2026, Toyota Innova', 'Karan']] } },
  { type: 'FOOTER', text: 'Dharamshala Stay · booking update' },
  { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Rate this trip', url: 'https://www.dharamshalastay.com/rate/{{1}}', example: ['https://www.dharamshalastay.com/rate/b9e0f205fc534a2ca6e68de63288c8d0.PJS3QhQNUW2SyBQ761qivO'] }] },
];
const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'trip_completed_rating', category: 'UTILITY', language: 'en', components }),
});
const data = await res.json().catch(() => ({}));
if (res.ok) console.log(`trip_completed_rating: created, id ${data.id}, status ${data.status}, category ${data.category}`);
else { console.error('FAILED -', data?.error?.error_user_msg || data?.error?.message || `HTTP ${res.status}`); process.exit(1); }
