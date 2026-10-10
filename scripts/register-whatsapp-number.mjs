// Registers the WhatsApp phone number (WHATSAPP_PHONE_NUMBER_ID) with the Cloud API.
// Needs WHATSAPP_TOKEN and WHATSAPP_PIN (a 6-digit two-step verification PIN you choose)
// in the environment or .env.local. Never prints the token or PIN.
import { readFileSync, existsSync } from 'node:fs';

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const { WHATSAPP_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: phoneId, WHATSAPP_PIN: pin } = process.env;
if (!token || !phoneId) { console.error('Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID'); process.exit(1); }
if (!/^\d{6}$/.test(pin || '')) { console.error('Add WHATSAPP_PIN=<6 digits> to .env.local first'); process.exit(1); }

const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/register`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
});
const data = await res.json().catch(() => ({}));
console.log(res.ok && data.success ? 'Registered: the number can now send messages.' : `Failed: ${data?.error?.message || res.status}`);
