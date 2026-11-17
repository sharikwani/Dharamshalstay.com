// Submits spare WhatsApp templates to Meta for approval (17 Nov 2026), so they are ready when needed.
// Skips any name+language that already exists. Usage: node scripts/create-whatsapp-templates-extra.mjs
// 17 Nov result: 9 PENDING; event_entry_details (UTILITY) and event_entry_pass (MARKETING) both REJECTED as INCORRECT_CATEGORY.
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

const FOOTER = 'Dharamshala Stay · dharamshalastay.com';

const templates = [
  {
    name: 'stay_checkin_details', category: 'UTILITY',
    body: 'Hello {{1}}, here are the check-in details for your booking {{2}}.\n\nProperty: {{3}}\nCheck-in: {{4}}\nAddress: {{5}}\nHost contact: {{6}}\n\nReply to this message if you need directions or will arrive late.',
    example: ['Asha', 'DS-1042', 'Pine View Homestay, Dharamkot', 'Wed, 10 Dec 2026 from 12:00 PM', 'Near Dharamkot bus stop, 3 km from McLeod Ganj', '98160 00000'],
  },
  {
    name: 'booking_not_available', category: 'UTILITY',
    body: 'Hello {{1}}, we are sorry, {{2}} is not available for your booking request {{3}} on {{4}}.\n\nAvailable options: {{5}}\n\nReply with the option you prefer and we will confirm it for you.',
    example: ['Asha', 'Pine View Homestay', 'DS-1042', '10 Dec 2026', 'Cedar Cottage, Dharamkot (Rs 2,200 a night) or Hotel Bhagsu View (Rs 2,800 a night)'],
  },
  {
    name: 'travel_advisory_booking', category: 'UTILITY',
    body: 'Hello {{1}}, an important update for your booking {{2}} on {{3}}.\n\n{{4}}\n\nReply to this message if you want to change the date or need help with your plans.',
    example: ['Asha', 'DS-1042', '12 Dec 2026', 'Fresh snow is expected above Triund. The trek is going ahead, but please carry warm layers and waterproof shoes.'],
  },
  {
    name: 'missed_call_followup', category: 'UTILITY',
    body: 'Hello {{1}}, we tried to call you about your enquiry for {{2}} but could not reach you.\n\nReply to this message with a convenient time to call, or send your questions here.',
    example: ['Asha', 'a taxi from Gaggal Airport to McLeod Ganj'],
  },
  {
    name: 'booking_details_needed', category: 'UTILITY',
    body: 'Hello {{1}}, to complete your booking {{2}} we need the following details: {{3}}\n\nPlease reply to this message with these details so we can finish your booking.',
    example: ['Asha', 'DS-1042', 'the names and ages of all trekkers and a photo ID for the lead guest'],
  },
  {
    name: 'partner_payout_sent', category: 'UTILITY',
    body: 'Hello {{1}}, your payout of {{2}} for booking {{3}} has been sent.\n\nPayment reference: {{4}}\n\nReply to this message if you do not receive it within 2 working days.',
    example: ['Karan', 'Rs 2,400', 'DS-1042', 'UPI 431298765432'],
  },
  {
    name: 'event_entry_pass', category: 'MARKETING',
    body: 'Hello {{1}}, your booking {{2}} for {{3}} is confirmed.\n\nDate and time: {{4}}\nNumber of people: {{5}}\nEntry code: {{6}}\n\nPlease show this code at the entry. Reply to this message if you have any questions.',
    example: ['Asha', 'DS-1042', 'New Year Eve dinner at Panchvati', '31 Dec 2026, 8:00 PM', '2', 'NYE-4821'],
  },
  {
    name: 'seasonal_trip_update', category: 'MARKETING',
    body: 'Hello {{1}}, {{2}} is coming up in Dharamshala and McLeod Ganj.\n\n{{3}}\n\nReply to this message to plan your trip or book a stay, taxi or trek with us. Reply STOP to stop these updates.',
    example: ['Asha', 'Losar, the Tibetan New Year', 'Monasteries hold prayers and masked dances, and stays near the temple fill up early. We can hold a room for you now.'],
  },
  {
    name: 'returning_guest_offer', category: 'MARKETING',
    body: 'Hello {{1}}, thank you for travelling with Dharamshala Stay before. As a returning guest, here is an offer for your next trip:\n\n{{2}}\n\nValid until {{3}}. Reply to this message to book. Reply STOP to stop these updates.',
    example: ['Asha', '10% off any stay of 2 nights or more, and a free airport pickup', '31 Jan 2027'],
  },
  {
    name: 'enquiry_reply', category: 'UTILITY', language: 'hi',
    body: 'नमस्ते {{1}}, Dharamshala Stay पर {{2}} के बारे में आपकी पूछताछ के लिए धन्यवाद।\n\n{{3}}\n\nबुकिंग के लिए बस इस संदेश का जवाब दें, हमारी टीम आपकी मदद करेगी।',
    example: ['आशा', 'मैक्लोडगंज में होटल', 'आपकी तारीखों के लिए हमारे पास 3 अच्छे विकल्प हैं। क्या आप कमरे की फोटो और कीमत देखना चाहेंगे?'],
  },
];

const existing = new Set();
let url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates?fields=name,language&limit=100`;
while (url) {
  const j = await (await fetch(url, { headers: { Authorization: `Bearer ${token}` } })).json();
  for (const t of j.data || []) existing.add(`${t.name}:${t.language}`);
  url = j.paging?.next || null;
}

for (const t of templates) {
  const language = t.language || 'en';
  if (existing.has(`${t.name}:${language}`)) { console.log(`skip ${t.name} (${language}): already exists`); continue; }
  const components = [
    { type: 'BODY', text: t.body, example: { body_text: [t.example] } },
    { type: 'FOOTER', text: FOOTER },
  ];
  const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: t.name, category: t.category, language, components }),
  });
  const j = await res.json();
  console.log(res.ok ? `sent ${t.name} (${language}, ${t.category}): ${j.status} id ${j.id}${j.category && j.category !== t.category ? ' -> recategorised ' + j.category : ''}` : `FAILED ${t.name} (${language}): ${j.error?.error_user_msg || j.error?.message}`);
}
