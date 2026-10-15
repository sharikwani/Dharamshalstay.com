// Creates the listing_claim_invite WhatsApp template (owner outreach, lib/listings/outreach.ts) in the
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

const template = {
  name: 'listing_claim_invite',
  // Inviting a business to claim a free listing is promotional, so Meta treats it as marketing.
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
    { type: 'FOOTER', text: 'Dharamshala Stay · dharamshalastay.com' },
    {
      type: 'BUTTONS',
      buttons: [
        { type: 'URL', text: 'Claim listing', url: SITE + '/claim/{{1}}', example: [SITE + '/claim/' + exampleSuffix] },
        { type: 'URL', text: 'Remove listing', url: SITE + '/remove-listing/{{1}}', example: [SITE + '/remove-listing/' + exampleSuffix] },
      ],
    },
  ],
};

const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(template),
});
const data = await res.json().catch(() => ({}));
if (res.ok) {
  console.log(`${template.name}: created, id ${data.id}, status ${data.status}, category ${data.category || template.category}`);
} else {
  console.error(`${template.name}: FAILED - ${data?.error?.error_user_msg || data?.error?.message || `HTTP ${res.status}`}`);
  process.exit(1);
}
