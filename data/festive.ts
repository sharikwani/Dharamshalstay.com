/**
 * Festive campaigns shown as a slim banner on the homepage and /hotels.
 * Each one shows only between `from` and `to` (inclusive, IST dates), so they switch on their own.
 * Messaging is "book early"; add a coupon here later if the owner wants one.
 */
export type FestiveCampaign = {
  id: string;
  from: string; // YYYY-MM-DD
  to: string;
  text: { en: string; hi: string };
  guide: { href: string; label: { en: string; hi: string } };
  whatsapp: { en: string; hi: string };
};

export const festiveCampaigns: FestiveCampaign[] = [
  {
    id: 'diwali-2026',
    from: '2026-10-16',
    to: '2026-11-10',
    text: {
      en: 'Diwali long weekend in the mountains: clear skies, crisp nights. Rooms and Volvo seats go fast, so book early.',
      hi: 'दिवाली का लंबा वीकेंड पहाड़ों में: साफ़ आसमान, ठंडी रातें। कमरे और वोल्वो सीटें जल्दी भरती हैं, पहले बुक करें।',
    },
    guide: { href: '/blog/diwali-in-dharamshala', label: { en: 'Plan a Diwali trip', hi: 'दिवाली ट्रिप प्लान करें' } },
    whatsapp: { en: 'Hi! I am planning a Diwali trip to Dharamshala. Please suggest stays for my dates.', hi: 'नमस्ते! मैं दिवाली पर धर्मशाला आने का सोच रहा हूँ। मेरी तारीखों के लिए स्टे बताइए।' },
  },
  {
    id: 'new-year-2027',
    from: '2026-11-11',
    to: '2027-01-02',
    text: {
      en: 'Christmas and New Year in McLeod Ganj: the busiest week of winter. Rooms with heaters fill first, so book by mid-November.',
      hi: 'मैक्लोडगंज में क्रिसमस और नया साल: सर्दियों का सबसे व्यस्त हफ़्ता। हीटर वाले कमरे सबसे पहले भरते हैं, नवंबर के मध्य तक बुक करें।',
    },
    guide: { href: '/blog/new-year-in-mcleod-ganj', label: { en: 'New Year guide', hi: 'नए साल की गाइड' } },
    whatsapp: { en: 'Hi! I want to book a stay in McLeod Ganj for Christmas / New Year. Please share options.', hi: 'नमस्ते! मुझे क्रिसमस / नए साल पर मैक्लोडगंज में स्टे चाहिए। विकल्प भेजिए।' },
  },
];

/** Today's date in India, YYYY-MM-DD. */
export const todayIST = (now = new Date()) => new Date(now.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

export function activeCampaign(date = todayIST()): FestiveCampaign | undefined {
  return festiveCampaigns.find((c) => c.from <= date && date <= c.to);
}
