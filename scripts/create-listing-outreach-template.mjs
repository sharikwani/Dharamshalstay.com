// Creates the listing WhatsApp templates (owner outreach and hotel enquiry alerts) in the
// Meta WhatsApp Business Account. Meta reviews it before it can be sent (usually minutes to a day).
// Usage: npm run whatsapp:outreach-template   (needs WHATSAPP_TOKEN and WHATSAPP_WABA_ID in the environment or .env.local)
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
if (!token || !wabaId) {
  console.error('Set WHATSAPP_TOKEN and WHATSAPP_WABA_ID (in the environment or .env.local) first.');
  process.exit(1);
}

const SITE = 'https://www.dharamshalastay.com';
const exampleSuffix = 'hotel-tibet-mcleod-ganj?t=Xy12AbCdEfGh34IjKlMn';

const buttons = {
  type: 'BUTTONS',
  buttons: [
    { type: 'URL', text: 'Claim listing', url: SITE + '/claim/{{1}}', example: [SITE + '/claim/' + exampleSuffix] },
    { type: 'URL', text: 'Remove listing', url: SITE + '/remove-listing/{{1}}', example: [SITE + '/remove-listing/' + exampleSuffix] },
  ],
};
const footer = { type: 'FOOTER', text: 'Dharamshala Stay · dharamshalastay.com' };

// Both invite the hotel to claim a free listing, which Meta treats as marketing.
const templates = [
  {
    // lib/listings/outreach.ts: once per hotel, from the admin Owner outreach page.
    name: 'listing_claim_invite',
    category: 'MARKETING',
    language: 'en',
    components: [
      {
        type: 'BODY',
        text: [
          'Hello from Dharamshala Stay 🙏',
          '',
          '*{{1}}* is listed in our free guide to places to stay in Dharamshala and McLeod Ganj: {{2}}',
          '',
          'Is everything correct? Claim your listing for free to update your photos, rooms and contact details, and get direct bookings with no listing fee.',
          '',
          'If you would rather not be listed, tap *Remove listing* and it will be taken down straight away.',
        ].join('\n'),
        example: { body_text: [['Hotel Tibet', SITE + '/hotels/hotel-tibet-mcleod-ganj']] },
      },
      footer,
      buttons,
    ],
  },
  {
    // lib/listings/enquiry-alert.ts: a traveller enquired about a hotel that hasn't joined yet. No guest contact details.
    name: 'listing_enquiry_alert',
    category: 'MARKETING',
    language: 'en',
    components: [
      {
        type: 'BODY',
        text: [
          '🛎️ *New booking enquiry for {{1}}*',
          '',
          'A traveller has asked about staying at your property through Dharamshala Stay.',
          '',
          '📅 *Dates:* {{2}}',
          '👥 *Guests:* {{3}}',
          '📝 *Request:* {{4}}',
          '',
          'Our team is looking after this guest for now. Claim your free listing to get enquiries and bookings like this straight to you, with no listing fee.',
        ].join('\n'),
        example: { body_text: [['Hotel Tibet', '10 Dec 2026 to 13 Dec 2026', '4', '2 rooms with a balcony, best available rate']] },
      },
      footer,
      buttons,
    ],
  },
];

// npm run whatsapp:outreach-template [name ...]   (no names = all; an existing template is skipped)
const only = process.argv.slice(2);
let failed = false;
for (const t of templates.filter((x) => !only.length || only.includes(x.name))) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(t),
  });
  const data = await res.json().catch(() => ({}));
  const msg = data?.error?.error_user_msg || data?.error?.message || `HTTP ${res.status}`;
  if (res.ok) console.log(`${t.name}: created, id ${data.id}, status ${data.status}, category ${data.category || t.category}`);
  else if (/already exists/i.test(msg)) console.log(`${t.name}: already exists, skipped`);
  else { failed = true; console.error(`${t.name}: FAILED - ${msg}`); }
}
process.exit(failed ? 1 : 0);
