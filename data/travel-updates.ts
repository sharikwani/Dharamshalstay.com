/**
 * Travel updates: dated notes on what has changed around Dharamshala (closures, rules, seasons).
 * Newest first. Each entry says when we checked and links the source and our fuller page.
 * Remove or mark entries "resolved" rather than silently editing them, so the history stays honest.
 */
import type { FactSource } from './facts';

export type UpdateStatus = 'changed' | 'open' | 'restricted' | 'closed' | 'seasonal';
export type TravelUpdate = {
  id: string;
  date: string; // date of the change or of our latest check, YYYY-MM-DD
  checked: string; // when we last confirmed it
  title: string;
  status: UpdateStatus;
  body: string;
  sources: FactSource[];
  page?: string;
};

export const travelUpdates: TravelUpdate[] = [
  { id: 'skyway-2026-10', date: '2026-10-16', checked: '2026-10-16', status: 'open',
    title: 'Dharamshala Skyway ropeway appears to be running; online booking is down',
    body: 'The operator has been promoting rides on its official Instagram through October 2026 (listed hours 9:30 am to 6 pm), but its website shows a maintenance notice and online booking offers no tickets. Buy at the counter and call the helpline, +91-1892 223302 (10 am to 6 pm), before you go. The ropeway was suspended after a landslide in August 2025.',
    sources: [{ label: 'Dharamshala Skyway on Instagram', url: 'https://www.instagram.com/dharamshala_skyway/' }, { label: 'Dharamshala Skyway (official site)', url: 'https://www.dharamshalaskyway.in/' }],
    page: '/blog/dharamshala-skyway-ropeway-guide' },
  { id: 'meditation-season-2026', date: '2026-10-16', checked: '2026-10-16', status: 'seasonal',
    title: 'Meditation courses: last 2026 sessions, winter closures',
    body: 'Tushita\'s last 10-day Introduction to Buddhism of 2026 runs 17-26 November, and the centre is closed in December and January. At Dhamma Sikhara the November 2026 Vipassana courses were already full; the first 2027 course for new students is 15-26 March.',
    sources: [{ label: 'Tushita: Introduction to Buddhism', url: 'https://tushita.info/program/introduction-to-buddhism/' }, { label: 'Dhamma Sikhara course schedule', url: 'https://www.dhamma.org/en/schedules/schsikhara' }],
    page: '/monasteries-meditation' },
  { id: 'christmas-2026', date: '2026-10-16', checked: '2026-10-16', status: 'seasonal',
    title: 'Christmas and New Year 2026: book stays early',
    body: 'The week from about 23 December to 2 January is the busiest of the winter, and room rates are often 1.5 to 2.5 times normal. Book by mid-November for the best choice, and ask whether rooms have heaters and hot water.',
    sources: [{ label: 'Dharamshala Stay: McLeod Ganj in December', url: 'https://www.dharamshalastay.com/blog/mcleod-ganj-in-december' }],
    page: '/blog/mcleod-ganj-in-december' },
  { id: 'triund-waste-deposit', date: '2026-08-11', checked: '2026-10-16', status: 'changed',
    title: 'Triund: refundable ₹500 waste deposit at the forest checkpost',
    body: 'Since 11 August 2026 every trekker pays a refundable ₹500 deposit at the checkpost and gets a garbage bag; bring your non-biodegradable waste back down to get it returned. This is on top of the ₹100 entry fee.',
    sources: [{ label: 'Dharamshala Stay: Triund trek guide', url: 'https://www.dharamshalastay.com/blog/triund-trek-complete-guide' }],
    page: '/blog/triund-trek-complete-guide' },
  { id: 'kangra-trekking-order', date: '2026-01-06', checked: '2026-10-16', status: 'restricted',
    title: 'Kangra district: trekking above 3,000 m restricted; permission needed for Triund',
    body: 'A district order of 6 January 2026 restricted trekking above 3,000 m and made SP Kangra permission mandatory for Triund, Kareri and Adi Himani Chamunda, with permissions cancelled automatically on weather alerts. We have not seen it withdrawn; similar orders have been issued in past winters, so ask us before booking a high trek.',
    sources: [{ label: 'The Tribune', url: 'https://www.tribuneindia.com/news/himachal/trekking-beyond-3-000-m-banned-in-kangra-district-466046' }, { label: 'The Week (PTI)', url: 'https://www.theweek.in/wire-updates/national/2026/01/06/himachal-kangra-administration-bans-trekking-above-3-000-metres.amp.html' }],
    page: '/blog/triund-trek-complete-guide' },
  { id: 'tibet-museum-location', date: '2022-02-09', checked: '2026-10-16', status: 'changed',
    title: 'Tibet Museum is at Gangchen Kyishong, not in the temple complex',
    body: 'The museum moved in February 2022 from McLeod Ganj to the Central Tibetan Administration campus at Gangchen Kyishong, a 10-15 minute taxi ride below McLeod Ganj. Many maps and older guides still show the old location. It is closed on Saturdays; entry is Rs 20 for adults.',
    sources: [{ label: 'Tibet Museum: your visit', url: 'https://tibetmuseum.org/your-visit/' }],
    page: '/blog/tibet-museum-dharamshala-guide' },
];

export const updatesChecked = travelUpdates.reduce((max, u) => (u.checked > max ? u.checked : max), '2026-01-01');
