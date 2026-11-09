import { BedDouble, Flame, Soup, CalendarCheck } from 'lucide-react';

/** Treks that stop overnight on the Triund ridge and can offer a room there instead of a tent. */
export const TRIUND_ROOM_TREKS = new Set(['triund-trek']);

export const TRIUND_STAY = {
  en: {
    title: 'Stay the night on Triund in a room, not a tent',
    body: 'Nights on the Triund ridge (about 2,850 m) drop close to freezing from late October, and a tent and sleeping bag are not always enough. On our overnight Triund trek you can ask for a room on Triund top instead of a tent: a proper bed, warm blankets, hot dinner and breakfast, and four walls between you and the wind.',
    points: ['A real bed and warm blankets', 'Hot dinner and breakfast', 'Shelter from the cold and wind', 'Few rooms: subject to availability'],
    price: 'The room is not included in the trek price. Choose "Room on Triund top" when you book; we check availability for your date and confirm the room price before you pay for it. If no room is free, you camp in a tent as usual.',
    selectLabel: 'Night on Triund',
    options: ['Tent (included in the trek price)', 'Room on Triund top (subject to availability, price confirmed separately)', 'Day hike, no night on top'],
  },
  hi: {
    title: 'त्रियुंड पर रात टेंट में नहीं, कमरे में बिताएँ',
    body: 'त्रियुंड रिज (लगभग 2,850 मीटर) पर अक्टूबर के अंत से रातें लगभग जमा देने वाली होती हैं, और टेंट व स्लीपिंग बैग हमेशा काफ़ी नहीं होते। हमारे ओवरनाइट त्रियुंड ट्रेक पर आप टेंट की जगह त्रियुंड टॉप पर कमरा माँग सकते हैं: असली बिस्तर, गर्म कंबल, गरम डिनर और नाश्ता, और ठंडी हवा से बचाव।',
    points: ['असली बिस्तर और गर्म कंबल', 'गरम डिनर और नाश्ता', 'ठंड और हवा से बचाव', 'कमरे कम हैं: उपलब्धता के अनुसार'],
    price: 'कमरा ट्रेक की कीमत में शामिल नहीं है। बुकिंग करते समय "त्रियुंड टॉप पर कमरा" चुनें; हम आपकी तारीख़ के लिए उपलब्धता देखकर कमरे की कीमत पहले बताएँगे। कमरा खाली न हो तो आप हमेशा की तरह टेंट में रुकेंगे।',
    selectLabel: 'त्रियुंड पर रात',
    options: ['टेंट (ट्रेक की कीमत में शामिल)', 'त्रियुंड टॉप पर कमरा (उपलब्धता के अनुसार, कीमत अलग से)', 'सिर्फ़ डे हाइक, ऊपर रात नहीं'],
  },
};

export default function TriundRoomStay({ lang }: { lang: 'en' | 'hi' }) {
  const s = TRIUND_STAY[lang];
  const icons = [BedDouble, Flame, Soup, CalendarCheck];
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="text-xl font-heading font-semibold mb-2 text-slate-900">{s.title}</h2>
      <p className="text-slate-700 leading-relaxed">{s.body}</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
        {s.points.map((p, i) => {
          const Icon = icons[i];
          return <li key={p} className="flex items-center gap-2 text-sm text-slate-800"><Icon className="h-4 w-4 text-amber-700 shrink-0" />{p}</li>;
        })}
      </ul>
      <p className="mt-4 text-sm text-slate-700 bg-white/70 rounded-lg p-3"><strong>{lang === 'hi' ? 'कीमत:' : 'Price:'}</strong> {s.price}</p>
      <a href="#book" className="inline-block mt-3 text-sm font-semibold text-brand-700 underline">{lang === 'hi' ? 'कमरे के लिए बुक करें' : 'Ask for a room when you book'} &rarr;</a>
    </div>
  );
}
