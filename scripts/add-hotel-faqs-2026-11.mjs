// Adds search-matched FAQs to 6 hotel listings (properties.faqs), from the 2 Nov 2026 GSC research. Dry run by default; --apply writes.
// Run from the repo root. Facts: official hotel pages checked 2 Nov 2026, or our own listing address.
import { readFileSync } from 'node:fs';
for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.*)\s*$/);
  if (m && !l.trim().startsWith('#')) process.env[m[1]] ??= m[2].replace(/^(['"])(.*)\1$/, '$2');
}
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const apply = process.argv.includes('--apply');

const ADD = {
  'chonor-house-temple-road-mcleod-ganj': [
    { question: 'Who runs Chonor House in McLeod Ganj?', answer: 'Chonor House is a branch of the Norbulingka Institute of Tibetan Culture, which works to preserve Tibetan arts. It stands among tall cedars just off Temple Road, quiet but within walking distance of the Dalai Lama Temple and the town (Norbulingka Institute website, checked 2 November 2026).' },
  ],
  'welcomheritage-natraj-mcleod-ganj': [
    { question: 'Does WelcomHeritage Natraj have a swimming pool?', answer: 'Yes. WelcomHeritage lists a swimming pool among the hotel’s amenities (official WelcomHeritage page, checked 2 November 2026).' },
    { question: 'How far is WelcomHeritage Natraj from the Dalai Lama Temple?', answer: 'About 0.6 km, according to the hotel. It also gives the Tibetan Institute of Performing Arts as about 0.7 km, Tushita Meditation Centre about 1 km and Bhagsunag waterfall about 2.6 km away (official WelcomHeritage page, checked 2 November 2026).' },
  ],
  'zostel-mcleodganj-jogiwara-road': [
    { question: 'Is Zostel McLeodganj the same as Zostel Dharamkot?', answer: 'No. Zostel McLeodganj is on Jogiwara Road in McLeod Ganj, opposite Yongling School. Zostel Dharamkot is a separate hostel higher up, in Upper Dharamkot towards Upper Bhagsu, with its own listing on our site.' },
  ],
  'treebo-ortus-residency-sheela-chowk-dharamshala': [
    { question: 'Is Treebo Ortus Residency in McLeod Ganj?', answer: 'No. It is in lower Dharamshala, on Dharamshala Road near Hotel Club Mahindra in the Dari area. McLeod Ganj, with the Dalai Lama Temple and the Tibetan cafes, is a separate drive up the hill, so this hotel suits people who want to be near the lower town and the main road.' },
  ],
  'treebo-roshan-house-valley-view-naddi': [
    { question: 'Is Treebo Roshan House in McLeod Ganj?', answer: 'No, it is in Naddi, above McLeod Ganj, on Dal Lake Road between St John in the Wilderness church and the Naddi viewpoint. It is quieter than McLeod Ganj and better for valley views, but you will need a short taxi ride or an uphill walk to reach the market.' },
  ],
  'serkong-house-nowrojee-road-mcleod-ganj': [
    { question: 'Is Serkong House the same as New Serkong House?', answer: 'No. Booking sites list Serkong House and New Serkong House as separate properties. Serkong House is at 285 Nowrojee Road, McLeod Ganj, so check the exact name and address before you book.' },
  ],
};

const slugs = Object.keys(ADD);
const r = await fetch(`${U}/rest/v1/properties?slug=in.(${slugs.join(',')})&select=id,slug,faqs`, { headers: H });
const rows = await r.json();
for (const p of rows) {
  const have = new Set((p.faqs || []).map((f) => f.question.toLowerCase()));
  const add = ADD[p.slug].filter((f) => !have.has(f.question.toLowerCase()));
  console.log(p.slug, 'has', (p.faqs || []).length, 'adding', add.length);
  if (!apply || !add.length) continue;
  const res = await fetch(`${U}/rest/v1/properties?id=eq.${p.id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ faqs: [...(p.faqs || []), ...add] }) });
  console.log('  ', res.status);
}
console.log(apply ? 'applied' : 'dry run (pass --apply)');
