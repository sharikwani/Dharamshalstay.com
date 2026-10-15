/**
 * data/monasteries.ts -- /monasteries-meditation and the homepage "day in the monasteries".
 *
 * Researched October 2026 against official sources first (dalailama.com, tibet.net, tushita.info, dhamma.org,
 * tibetanlibrary.org, tibetmuseum.org, norbulingka.org, tnp.org), then Lonely Planet / Incredible India.
 *
 * Content rules (keep these when editing):
 *   - Monasteries publish no prayer or debate timetable. Say "usually ... check locally", never a fixed time.
 *   - The Tibet Museum is at Gangchen Kyishong since Feb 2022, not in the temple complex.
 *   - Never promise an audience with His Holiness or the Karmapa (outside India since 2017).
 *   - No phone numbers; link the official site. Prices are "as of 2026".
 */

export interface Monastery {
  id: string;
  name: string;
  /** Other names people search for. */
  aka?: string;
  tradition: string;
  area: string;
  /** Destination page for "stay nearby". */
  stay: 'mcleod-ganj' | 'dharamshala' | 'dharamkot' | 'bhagsu';
  about: string;
  see: string[];
  /** Hours / fee / photography, already phrased with any "check locally". */
  visit: string;
  /** Map pin; omitted where only an approximate one exists (the map link then searches by name). */
  lat?: number;
  lng?: number;
  photo?: string;
  official?: string;
}

export const monasteries: Monastery[] = [
  {
    id: 'tsuglagkhang',
    name: 'Tsuglagkhang and Namgyal Monastery',
    aka: 'Dalai Lama Temple, Main Tibetan Temple',
    tradition: 'Tibetan Buddhist; Namgyal is the Dalai Lama\'s own monastery',
    area: 'McLeod Ganj, south end of Temple Road',
    stay: 'mcleod-ganj',
    about: 'The heart of Tibetan life in exile. The plain concrete buildings hide a working temple: the main hall (1969) holds the throne His Holiness teaches from, a large Buddha, Padmasambhava and Avalokiteshvara, and the courtyard fills with pilgrims, butter lamps and prayer wheels. Namgyal Monastery, the Dalai Lama\'s personal monastery, shares the complex; its monks lead the ceremonies here and debate in the courtyard.',
    see: ['The main temple hall and the Kalachakra Temple', 'Monks debating in the courtyard', 'Rows of prayer wheels and butter lamps', 'The kora path around the hill'],
    visit: 'Free. No official hours are published; it is usually open from early morning to early evening. No photos inside the Kalachakra Temple; courtyards are usually fine. The Dalai Lama\'s residence behind the guarded gate is not open to visitors.',
    lat: 32.2324, lng: 76.3244,
    photo: 'tsuglagkhang-courtyard',
    official: 'https://www.namgyalmonastery.org/',
  },
  {
    id: 'gyuto',
    name: 'Gyuto Tantric Monastery',
    aka: 'Gyuto Ramoche, Sidhbari',
    tradition: 'Gelug tantric college, founded in Tibet in the 15th century',
    area: 'Sidhbari, on the Dharamshala–Palampur road, about 6–8 km from Dharamshala',
    stay: 'dharamshala',
    about: 'One of the two great tantric colleges of the Gelug school, known around the world for its monks\' deep, multiphonic chanting. After stops in Dalhousie and Arunachal Pradesh in exile, it settled at Sidhbari, where His Holiness inaugurated the monastery in 1996. The big golden temple stands right against the Dhauladhar.',
    see: ['The main temple with the Dhauladhar behind it', 'Chanting, if your visit meets a prayer session'],
    visit: 'Free. No official hours; travel listings say roughly early morning to early evening. The 17th Karmapa lived here from 2000 but has been outside India since 2017, so the audiences in older guidebooks no longer happen.',
    lat: 32.1868, lng: 76.3684,
    photo: 'gyuto-monastery-dhauladhar',
  },
  {
    id: 'norbulingka',
    name: 'Norbulingka Institute',
    aka: 'Seat of Happiness temple (Deden Tsuglakhang)',
    tradition: 'Institute for Tibetan arts, with a Buddhist temple',
    area: 'Sidhpur, about 6 km southeast of Dharamshala',
    stay: 'dharamshala',
    about: 'Here Tibetan artists are trained and employed in statue-making, thangka painting, appliqué and woodcarving, and you can watch them at work while you walk through quiet water gardens. The Seat of Happiness temple holds a gilded Buddha about 4 m tall and more than a thousand small Buddha murals; the Losel Doll Museum shows Tibetan life in miniature.',
    see: ['Artists at work in the studios', 'The Seat of Happiness temple', 'Gardens, Losel Doll Museum, café and shop'],
    visit: 'Usually open daily, about 9am to 5–5:30pm; the doll museum until 6pm. Studios close on second Saturdays, Sundays and some holidays. There is an entry fee; check the amount at the gate. Photos are fine in the gardens, often not inside the temple.',
    lat: 32.1994, lng: 76.3599,
    photo: 'norbulingka-water-garden',
    official: 'https://norbulingka.org/',
  },
  {
    id: 'nechung',
    name: 'Nechung Monastery',
    aka: 'Nechung Drayangling, seat of the State Oracle',
    tradition: 'Seat of the Nechung Oracle, the State Oracle of Tibet',
    area: 'Gangchen Kyishong, next to the Library of Tibetan Works & Archives',
    stay: 'dharamshala',
    about: 'Home of the medium of Tibet\'s State Oracle, who is still consulted on important matters. The richly painted temple was finished in 1984 and consecrated by His Holiness in 1985. The Central Tibetan Administration holds summer and winter invocation ceremonies here; they are official ceremonies, not tourist events.',
    see: ['The painted temple hall, with drums and long horns', 'An easy pairing with the Tibet Museum and the Library next door'],
    visit: 'No official hours or fee are published; go in daytime and check locally.',
    lat: 32.226, lng: 76.3262,
    photo: 'nechung-temple',
  },
  {
    id: 'dolma-ling',
    name: 'Dolma Ling Nunnery',
    aka: 'Dolma Ling Nunnery and Institute',
    tradition: 'Non-sectarian; nuns from all Tibetan Buddhist traditions',
    area: 'Sidhpur, near Norbulingka',
    stay: 'dharamshala',
    about: 'One of the leading places where Tibetan nuns study the full philosophy course, with debate at its centre, toward the Geshema degree. His Holiness inaugurated it in 2005, and some 300 nuns live here.',
    see: ['A working nunnery and philosophy college'],
    visit: 'It closed to visitors in 2020 and we found no confirmed reopening policy. Contact the Tibetan Nuns Project before you go.',
    lat: 32.2004, lng: 76.362,
    photo: 'dolma-ling-dusk',
    official: 'https://tnp.org/nuns/dolmaling/',
  },
];

/** Smaller or specialist places, listed without photos. */
export const moreMonasteries: Monastery[] = [
  {
    id: 'tibet-museum',
    name: 'Tibet Museum',
    tradition: 'Museum of the Central Tibetan Administration',
    area: 'Gangchen Kyishong (moved here from the temple complex in 2022)',
    stay: 'dharamshala',
    about: 'The modern story of Tibet and its people in exile, told by the Central Tibetan Administration, with documentary screenings.',
    see: [],
    visit: '9am–5pm, closed 1–2pm, on Saturdays and on holidays. Adults Rs 20, under-18s free (as of 2026).',
    lat: 32.2259, lng: 76.3254,
    official: 'https://tibetmuseum.org/',
  },
  {
    id: 'dip-tse-chok-ling',
    name: 'Dip Tse Chok Ling Monastery',
    aka: 'Tsechokling Gompa',
    tradition: 'Gelug',
    area: 'Below McLeod Ganj, down a long forest stairway',
    stay: 'mcleod-ganj',
    about: 'A quiet gompa in the forest, built in 1987 to replace its namesake near Lhasa. Its prayer hall holds a Buddha with an ornate jewelled crown, and its monks are known for ritual arts and chanting.',
    see: [],
    visit: 'Hours not published; daytime is safest. Expect a few hundred steps each way.',
    lat: 32.2376, lng: 76.322,
  },
  {
    id: 'kirti',
    name: 'Kirti Monastery',
    aka: 'Kirti Jepa Dratsang',
    tradition: 'Gelug, the exile branch of Kirti in Ngaba, eastern Tibet',
    area: 'McLeod Ganj, Clubhouse Road side',
    stay: 'mcleod-ganj',
    about: 'Set up in the 1990s for monks from Ngaba, with a strong record in monastic education and its own debate tradition.',
    see: [],
    visit: 'Hours not published; check locally.',
    lat: 32.2339, lng: 76.3256,
  },
  {
    id: 'gaden-choeling',
    name: 'Gaden Choeling Nunnery',
    tradition: 'Tibetan Buddhist nunnery',
    area: 'McLeod Ganj, about 10 minutes\' walk from the main temple',
    stay: 'mcleod-ganj',
    about: 'A hillside nunnery started by nuns who fled Tibet; about 160 nuns live here.',
    see: [],
    visit: 'Hours not published; be quiet and respectful, as this is the nuns\' home.',
  },
  {
    id: 'zilnon-kagyeling',
    name: 'Zilnon Kagyeling Nyingma Monastery',
    aka: 'Nyingmapa Gompa',
    tradition: 'Nyingma',
    area: 'Bhagsu Road, between McLeod Ganj and Bhagsu',
    stay: 'bhagsu',
    about: 'A small Nyingma monastery on the walk to Bhagsu, linked with the ritual master Ngagpa Yeshe Dorje Rinpoche, the "rainmaker".',
    see: [],
    visit: 'Hours not published; check locally.',
  },
];

/** A day from dawn to night, used on the page; the homepage uses four of these. */
export interface DayMoment { id: string; time: string; title: string; desc: string; photo: string; alt: string }
export const monasteryDay: DayMoment[] = [
  { id: 'dawn', time: 'Around sunrise', title: 'Walk the kora', photo: 'kora-prayer-wheels',
    desc: 'Join Tibetans on the forest path around the temple hill, clockwise, turning prayer wheels past mani stones and prayer flags. Allow 30–40 minutes.',
    alt: 'Pilgrims walking the Lingkhor kora path past prayer wheels and a golden shrine in McLeod Ganj' },
  { id: 'morning', time: 'Early morning', title: 'Prayers in the temple', photo: 'namgyal-buddha-statue',
    desc: 'Step into the main temple while monks chant and butter lamps burn. Walk the complex clockwise, and keep quiet.',
    alt: 'Gilded statue of Shakyamuni Buddha in the main temple of Namgyal Monastery, McLeod Ganj' },
  { id: 'midday', time: 'Mid-morning', title: 'Meditate or study', photo: 'tushita-meditation-centre',
    desc: 'Walk up to Tushita for its drop-in guided meditation (Mon–Sat, 9–10am, by donation), or down to the Library of Tibetan Works & Archives for a philosophy class.',
    alt: 'Main gompa of Tushita Meditation Centre in Dharamkot, a red Tibetan-style hall among cedar trees' },
  { id: 'afternoon', time: 'Usually early afternoon', title: 'Watch the monks debate', photo: 'tsuglagkhang-courtyard',
    desc: 'In the Namgyal courtyard, standing monks clap and stamp to press each point of philosophy. Days and times vary with holidays and exams, so ask at the temple the day before.',
    alt: 'Canopied courtyard of the Tsuglagkhang temple complex in McLeod Ganj, with an endless-knot banner' },
  { id: 'evening', time: 'Dusk', title: 'Butter lamps and evening prayers', photo: 'butter-lamps',
    desc: 'Come back as the courtyard empties and the lamps glow, or take a last turn of the prayer wheels on the kora at sunset.',
    alt: 'Rows of lit butter lamps in the Butter Lamp House of the Dalai Lama Temple, McLeod Ganj' },
];

export interface Practice { id: string; name: string; where: string; what: string; how: string; cost: string; rules?: string[]; official: string }
export const meditation: Practice[] = [
  {
    id: 'tushita-intro', name: 'Tushita: 10-day Introduction to Buddhism', where: 'Tushita Meditation Centre, Dharamkot',
    what: 'A residential course of teachings, guided meditation and discussion groups for complete beginners, with intensive meditation days near the end. Days run from a 6am wake-up to evening meditation.',
    how: 'Register on Tushita\'s website as soon as your dates are certain; a place is confirmed only by a non-refundable 2,000 INR deposit. Courses fill quickly, with waiting lists from one to six weeks before. Courses run from about late February to November; Tushita is closed in December and January.',
    cost: 'By donation, with a guideline minimum of 8,600 INR for 10 days in a dormitory (as of 2026). Rupees only.',
    rules: ['Silence from the first evening to the end', 'Phones handed in; no leaving the grounds', 'No intoxicants; celibacy', 'Clothes covering shoulders to below the knees'],
    official: 'https://tushita.info/',
  },
  {
    id: 'tushita-dropin', name: 'Tushita: drop-in meditation and weekend courses', where: 'Tushita, Dharamkot',
    what: 'A one-hour guided meditation Monday to Saturday, 9–10am, with no registration (it is cancelled during short courses). Non-residential 2–3 day courses such as "How to Meditate" run about 9am–5pm.',
    how: 'Just turn up for the drop-in. Weekend courses are booked in person at Tushita\'s office (Mon–Sat, mornings and afternoons), not by email.',
    cost: 'Drop-in by donation. Short courses from 1,500 INR (2 days) or 2,000 INR (3 days), cash, including lunch (as of 2026).',
    official: 'https://tushita.info/program/short-courses/',
  },
  {
    id: 'dhamma-sikhara', name: 'Dhamma Sikhara: 10-day Vipassana', where: 'Forest near Dharamkot, about 1.5 km above McLeod Ganj square',
    what: 'A silent 10-day Vipassana course in the S.N. Goenka tradition. The wake-up bell rings at 4am; lights out at 9:30pm.',
    how: 'Apply online through dhamma.org when applications open for your course; replies can take up to two weeks, and you must then confirm. Autumn courses fill early. No courses run in January and February.',
    cost: 'Free, including food and lodging. Courses run only on donations from past students; you may give at the end.',
    rules: ['Noble silence until the last full day', 'Men and women kept separate', 'Phones deposited; no outside contact'],
    official: 'https://sikhara.dhamma.org/',
  },
  {
    id: 'ltwa', name: 'Library of Tibetan Works & Archives: philosophy classes', where: 'Gangchen Kyishong, next to Nechung',
    what: 'Classes on Buddhist texts taught by geshes in Tibetan with English translation, plus logic and debate on Wednesdays and Tibetan language courses. The library\'s museum holds statues, thangkas and mandalas.',
    how: 'Register at the library office before your first class. The year runs from about March to December, with no classes at weekends or on holidays; check the current timetable at the office.',
    cost: 'Registration Rs 100, then Rs 400 a month per philosophy class (as of 2026).',
    official: 'https://tibetanlibrary.org/buddhist-philosophy-courses/',
  },
  {
    id: 'lha', name: 'Lha: conversation with monks and Tibetans', where: 'Ahimsa House, McLeod Ganj',
    what: 'An hour of informal English conversation with Tibetan refugees, often monks, on any topic. It is the easiest respectful way to meet the community.',
    how: 'Monday to Friday, 4–5pm. Ask Lha whether they want a longer commitment from volunteers at the time you go.',
    cost: 'Free; you volunteer your time.',
    official: 'https://lhasocialwork.org/',
  },
];

export const etiquette: { title: string; desc: string }[] = [
  { title: 'Walk clockwise', desc: 'Around temples, stupas and the kora, and turn prayer wheels clockwise too.' },
  { title: 'Cover shoulders and knees', desc: 'Modest clothes for every monastery, and shoes you can slip off.' },
  { title: 'Shoes off in prayer halls', desc: 'Leave them where others have left theirs.' },
  { title: 'Ask before photos', desc: 'Never photograph a monk or nun without asking, never use flash during prayers, and no photos in the Kalachakra Temple.' },
  { title: 'Mind your feet', desc: 'When you sit, don\'t point your feet at the altar, statues or a teacher.' },
  { title: 'Keep quiet', desc: 'Phone on silent, voice low, and don\'t walk between monks and the altar during prayers.' },
  { title: 'With monks and nuns', desc: 'Greet them respectfully. Don\'t touch their heads or hug them, especially across genders.' },
  { title: 'Flags and mani stones', desc: 'Don\'t step on, sit on or take prayer flags or carved mani stones.' },
  { title: 'Offerings', desc: 'A white khata scarf is a sign of respect; small cash offerings go in the donation boxes.' },
  { title: 'Private areas', desc: 'The Dalai Lama\'s residence and monks\' quarters are off limits.' },
];

export const festivals: { name: string; when: string; desc: string }[] = [
  { name: 'Losar, Tibetan New Year', when: 'Usually February or early March',
    desc: 'The date follows the Tibetan lunar calendar set by the astrologers of Men-Tsee-Khang in Dharamshala, so it moves every year. Expect temple visits, offerings and prayers; some institutions and the Tibet Museum close. Confirm the date nearer the time.' },
  { name: 'Saga Dawa', when: 'The fourth Tibetan month, usually May or June',
    desc: 'The month of the Buddha\'s birth, enlightenment and passing. Many Tibetans walk the kora, make offerings and join mani recitation sessions at the main temple.' },
  { name: 'His Holiness\'s birthday', when: '6 July',
    desc: 'Marked every year, often with long-life prayers at the main temple. Details are announced close to the day.' },
  { name: 'Teachings and long-life prayers', when: 'Check dalailama.com/schedule',
    desc: 'Public events are free. For a teaching, register a few days before in the main temple courtyard (9am–1pm or 2–5pm) with copies of your passport, Indian visa and C-form (Aadhaar for India residents); the fee is Rs 10. In 2026 the events here have been long-life prayer ceremonies rather than full teachings, and private audiences are now rare because of his age. Events are also streamed live.' },
];

export const monasteryFaqs: { question: string; answer: string }[] = [
  { question: 'Can I meet the Dalai Lama?', answer: 'Probably not in person. His office says private audiences have been greatly reduced because of his age. The realistic chance is a public event at the main temple, such as a long-life prayer or a teaching, when he is in Dharamshala. Check dalailama.com/schedule before you plan around it.' },
  { question: 'How do I register for a teaching by His Holiness?', answer: 'Registration opens a few days before and closes the day before a teaching. Go to the main temple courtyard (9am–1pm or 2–5pm) with copies of your passport, Indian visa and C-form, or Aadhaar if you live in India, and pay Rs 10.' },
  { question: 'Do I need to book Tushita?', answer: 'For the 10-day Introduction to Buddhism, yes: register online and pay the 2,000 INR deposit to confirm, as courses fill quickly. Weekend courses are booked in person at the office. The Monday to Saturday 9am drop-in meditation needs no booking. Tushita is closed in December and January.' },
  { question: 'How much do Tushita and Vipassana cost?', answer: 'Tushita runs on donation, with a guideline minimum of 8,600 INR for the 10-day course in a dormitory (as of 2026); drop-ins are by donation. Vipassana courses at Dhamma Sikhara are free, including food and lodging, and you may donate at the end.' },
  { question: 'When can I see the monks debate?', answer: 'Usually in the early afternoon in the Namgyal courtyard at the main temple, though reports of the exact time differ and debates pause for holidays, exams and big events. Ask at the temple the day before.' },
  { question: 'Is photography allowed in the Dalai Lama Temple?', answer: 'Not inside the Kalachakra Temple, and it is often restricted in other shrine rooms. It is generally fine in the courtyards. Follow the signs, ask before photographing monks, and never use flash during prayers.' },
  { question: 'What should I wear to the monasteries?', answer: 'Modest clothes that cover your shoulders and knees, and shoes you can slip off easily before entering prayer halls.' },
  { question: 'Is there an entry fee?', answer: 'The main temple complex is free. The Tibet Museum, now at Gangchen Kyishong rather than in the temple complex, charges Rs 20 for adults and nothing for under-18s. Norbulingka charges an entry fee; check the amount at the gate.' },
  { question: 'Can I talk with monks?', answer: 'Yes. Lha Charitable Trust\'s English conversation class in McLeod Ganj (Monday to Friday, 4–5pm) welcomes travellers as conversation partners, and monks often attend. Be respectful: no hugging, and ask before photos.' },
  { question: 'Can I see the Karmapa at Gyuto Monastery?', answer: 'No. You can visit Gyuto at Sidhbari, known for its chanting, but the 17th Karmapa, who lived there from 2000, has been outside India since 2017, so the audiences described in older guidebooks do not happen.' },
];

/** Shown at the foot of the page: where the facts were checked. */
export const monasterySources: { name: string; url: string }[] = [
  { name: 'Office of His Holiness the Dalai Lama: schedule and registration', url: 'https://www.dalailama.com/schedule' },
  { name: 'Namgyal Monastery', url: 'https://www.namgyalmonastery.org/' },
  { name: 'Central Tibetan Administration', url: 'https://tibet.net/' },
  { name: 'Tibet Museum: visiting', url: 'https://tibetmuseum.org/your-visit/' },
  { name: 'Tushita Meditation Centre', url: 'https://tushita.info/' },
  { name: 'Dhamma Sikhara Vipassana Centre', url: 'https://sikhara.dhamma.org/' },
  { name: 'Library of Tibetan Works & Archives', url: 'https://tibetanlibrary.org/' },
  { name: 'Norbulingka Institute', url: 'https://norbulingka.org/' },
  { name: 'Tibetan Nuns Project: Dolma Ling', url: 'https://tnp.org/nuns/dolmaling/' },
  { name: 'Lha Charitable Trust', url: 'https://lhasocialwork.org/' },
];
