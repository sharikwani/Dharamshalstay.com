// Creates the three WhatsApp message templates (v2 layout) in the Meta WhatsApp Business Account.
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

const FOOTER = 'Dharamshala Stay · dharamshalastay.com';

const templates = [
  {
    name: 'booking_new_partner_v2',
    body: [
      '*🆕 New booking request*',
      '',
      'You have a new booking from Dharamshala Stay. Please check the details below.',
      '',
      '📋 *Booking ID:* {{1}}',
      '🛎️ *Service:* {{2}}',
      '📅 *Date:* {{3}}',
      '🕘 *Time:* {{4}}',
      '👥 *Guests:* {{5}}',
      '',
      '👤 *Customer:* {{6}}',
      '📞 *Phone:* {{7}}',
      '',
      '💰 *Amount:* {{8}}',
      '💳 *Payment:* {{9}}',
      '',
      "Please tap *Accept* to confirm this booking, or *Can't do it* if you are not available.",
    ].join('\n'),
    example: ['DS-1042', 'Dharamshala → McLeod Ganj taxi', 'Sun, 12 Oct 2026', '9:00 AM', '3', 'Asha Sharma', '98160 00000', 'Rs.1,500', 'Customer pays you directly'],
    buttons: ['Accept', "Can't do it"],
  },
  {
    name: 'booking_cancelled_partner_v2',
    body: [
      '*❌ Booking cancelled*',
      '',
      'Please note that the booking below has been cancelled. You do not need to provide this service.',
      '',
      '📋 *Booking ID:* {{1}}',
      '🛎️ *Service:* {{2}}',
      '📅 *Date:* {{3}}',
      '🕘 *Time:* {{4}}',
      '📝 *Reason:* {{5}}',
      '',
      'If you have any questions, simply reply to this message and our team will help you.',
    ].join('\n'),
    example: ['DS-1042', 'Dharamshala → McLeod Ganj taxi', 'Sun, 12 Oct 2026', '9:00 AM', 'Guest changed their plans'],
  },
  {
    name: 'booking_confirmed_customer_v2',
    body: [
      '*✅ Your booking is confirmed*',
      '',
      'Thank you for booking with Dharamshala Stay. Here are your booking details.',
      '',
      '📋 *Booking ID:* {{1}}',
      '🛎️ *Service:* {{2}}',
      '📅 *Date:* {{3}}',
      '🕘 *Time:* {{4}}',
      '👥 *Guests:* {{5}}',
      '👤 *Your contact:* {{6}}',
      '',
      '💰 *Total amount:* {{7}}',
      '💳 *Payment:* {{8}}',
      '',
      'Need help or want to change something? Just reply to this message and our local team will help you.',
    ].join('\n'),
    example: ['DS-1042', 'Dharamshala → McLeod Ganj taxi', 'Sun, 12 Oct 2026', '9:00 AM', '3', 'Driver Ravi, 98160 00001', 'Rs.1,500', 'Pay the driver directly'],
  },
];

let failed = false;
for (const t of templates) {
  const components = [
    { type: 'BODY', text: t.body, example: { body_text: [t.example] } },
    { type: 'FOOTER', text: FOOTER },
  ];
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
