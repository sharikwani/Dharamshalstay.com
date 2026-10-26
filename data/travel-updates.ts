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
  { id: 'kangra-toy-train-2026-10', date: '2026-10-11', checked: '2026-10-20', status: 'open',
    title: 'Kangra toy train running again, partly: 4 of 7 train pairs restored',
    body: 'After a monsoon suspension from 11 August 2026, the Jammu railway division restored four train pairs on the Pathankot to Joginder Nagar narrow-gauge line on 11 October 2026: two Pathankot to Baijnath Paprola (05:00 and 07:00 from Pathankot), one Baijnath Paprola to Jawalamukhi Road and one Baijnath Paprola to Joginder Nagar. The other three pre-2022 pairs have no restart date. Tickets are unreserved, at the counter. Check NTES or call 139 on the day.',
    sources: [{ label: 'The Tribune, 12 Oct 2026', url: 'https://www.tribuneindia.com/news/himachal/connectivity-to-get-a-boost-as-four-pairs-of-trains-restored-on-pathankot-jogindernagar-route' }, { label: 'Amar Ujala, 12 Oct 2026 (Hindi)', url: 'https://www.amarujala.com/himachal-pradesh/kangra/rail-services-restored-in-kangra-valley-trains-packed-on-the-very-first-day-kangra-news-c-95-1-kng1037-260833-2026-10-11' }],
    page: '/blog/kangra-toy-train-guide' },
  { id: 'skyway-2026-10', date: '2026-10-25', checked: '2026-10-25', status: 'closed',
    title: 'Dharamshala Skyway ropeway closed for maintenance until 30 October; due to resume 31 October',
    body: 'The official website says the Skyway is closed for scheduled maintenance from 21 to 30 October 2026 and will resume on 31 October 2026, subject to completion of maintenance (listed hours 9:30 am to 6 pm). Online booking has shown no bookable tickets and standard fares are not published, so expect to buy at the counter. Reopening on 31 October is not yet confirmed: call the helpline, +91-1892 223302 (10 am to 6 pm), before you go. The ropeway was suspended after a landslide in August 2025.',
    sources: [{ label: 'Dharamshala Skyway on Instagram', url: 'https://www.instagram.com/dharamshala_skyway/' }, { label: 'Dharamshala Skyway (official site)', url: 'https://www.dharamshalaskyway.in/' }],
    page: '/blog/dharamshala-skyway-ropeway-guide' },
  { id: 'diwali-2026', date: '2026-10-16', checked: '2026-10-16', status: 'seasonal',
    title: 'Diwali 2026 is on Sunday 8 November: plan a long weekend',
    body: 'Diwali (Lakshmi Puja) falls on Sunday 8 November 2026, the central government holiday. Dhanteras is Friday 6 November and Govardhan Puja Monday 9 November, so Saturday 7 to Monday 9 makes a natural long weekend. Early November brings clear skies and cold nights in McLeod Ganj; book stays and Volvo seats early.',
    sources: [{ label: 'Central government holidays 2026 (gconnect)', url: 'https://www.gconnect.in/news/holidays-to-be-observed-in-central-government-offices-during-the-year-2026.html' }, { label: 'Diwali 2026 dates (Goodreturns, citing Drik Panchang)', url: 'https://www.goodreturns.in/news/when-is-diwali-in-2026-check-diwali-dhanteras-govardhan-pooja-bhai-dooj-date-other-info-1479316.html' }],
    page: '/blog/diwali-in-dharamshala' },
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
    title: 'Triund: refundable ₹500 waste deposit reported, not confirmed',
    body: 'A refundable ₹500 waste deposit for Triund was reported in August 2026 but we could not find an official notice. Carry ₹500 extra in cash in case it is collected, and bring your waste back down either way. The confirmed fee is ₹100 per person for a hike.',
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
