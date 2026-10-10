// Creates the three WhatsApp message templates in the Meta WhatsApp Business Account.
// Usage: npm run whatsapp:templates   (needs WHATSAPP_TOKEN and WHATSAPP_WABA_ID in the environment or .env.local)
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

const templates = [
  {
    name: 'booking_new_partner',
    body: 'New booking {{1}} from Dharamshala Stay. Service: {{2}}. Date: {{3}}. Guests: {{4}}. Customer name: {{5}}. Customer phone: {{6}}. Price: {{7}}. Payment: {{8}}. Please tap a button below to confirm.',
    example: ['DS-1042', 'Dharamshala to McLeodganj taxi', '12 Oct 2026, 9:00 AM', '3', 'Asha Sharma', '9816000000', 'Rs.1,500', 'Customer pays the partner directly'],
    buttons: ['Accept', "Can't do it"],
  },
  {
    name: 'booking_cancelled_partner',
    body: 'Hello from Dharamshala Stay. Please note that booking {{1}} for {{2}} scheduled on {{3}} has now been cancelled and you do not need to provide this service. Reason for the cancellation: {{4}}. If you have any questions about this change, please reply to this message or call our team. Thank you.',
    example: ['DS-1042', 'Dharamshala to McLeodganj taxi', '12 Oct 2026, 9:00 AM', 'Guest changed plans'],
  },
  {
    name: 'booking_confirmed_customer',
    body: 'Thank you for booking with Dharamshala Stay. Your booking {{1}} is now confirmed. Service booked: {{2}}. Date and time: {{3}}. Number of guests: {{4}}. Your contact for this booking: {{5}}. Total price: {{6}}. Payment details: {{7}}. If you need to change anything or have a question, simply reply to this message and our local team will help you.',
    example: ['DS-1042', 'Dharamshala to McLeodganj taxi', '12 Oct 2026, 9:00 AM', '3', 'Driver Ravi, 9816000001', 'Rs.1,500', 'Customer pays the partner directly'],
  },
];

let failed = false;
for (const t of templates) {
  const components = [{ type: 'BODY', text: t.body, example: { body_text: [t.example] } }];
  if (t.buttons) components.push({ type: 'BUTTONS', buttons: t.buttons.map((text) => ({ type: 'QUICK_REPLY', text })) });
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: t.name, category: 'UTILITY', language: 'en', components }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) console.log(`${t.name}: created, id ${data.id}, status ${data.status}`);
    else { failed = true; console.error(`${t.name}: FAILED - ${data?.error?.error_user_msg || data?.error?.message || `HTTP ${res.status}`}`); }
  } catch (e) {
    failed = true;
    console.error(`${t.name}: FAILED - ${e?.message || e}`);
  }
}
process.exit(failed ? 1 : 0);
