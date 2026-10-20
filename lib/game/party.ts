/**
 * Party games beyond tambola: Party Quiz, Lucky Draw and Who's Most Likely To. Content and pure rules.
 */

import { PRIZES, type Prize } from './tambola';

export type GameType = 'tambola' | 'quiz' | 'lucky_draw' | 'most_likely';
export type WinPrize = Prize | 'quiz' | 'lucky_draw' | 'most_likely';

/** "Full House", "Party Quiz"... for screens and certificates. */
export function prizeLabel(prize: WinPrize): string {
  if (prize in PRIZES) return PRIZES[prize as Prize].label;
  return GAMES[prize as GameType]?.name || 'Party game';
}

export const GAMES: Record<GameType, { name: string; short: string; how: string; emoji: string }> = {
  tambola: { name: 'Tambola', short: 'Classic housie on everyone’s phone', how: 'Numbers are called on the TV, players mark their tickets. Early Five, First Line and Full House win.', emoji: '\u{1F3B1}' },
  quiz: { name: 'Party Quiz', short: 'KBC-style quiz with a live leaderboard', how: 'Questions appear on the TV, everyone answers on their phone against the clock. Fast right answers score more.', emoji: '\u{1F9E0}' },
  lucky_draw: { name: 'Lucky Draw', short: 'Spin through everyone’s photos to pick winners', how: 'Everyone joins with a photo. The host spins and the reel lands on up to 3 winners.', emoji: '\u{1F381}' },
  most_likely: { name: 'Who’s Most Likely To…', short: 'Funny votes about the guests', how: 'A funny question appears, everyone votes for a guest, and the TV reveals who got the most votes.', emoji: '\u{1F602}' },
};

export type QuizQuestion = { q: string; options: string[]; answer: number };
export type QuizPack = { id: string; name: string; questions: QuizQuestion[] };

export const QUIZ_SECONDS = 20;
/** Fast right answers score up to 1000, slow right answers at least 500. */
export function quizPoints(correct: boolean, ms: number, seconds = QUIZ_SECONDS): number {
  if (!correct) return 0;
  const t = Math.min(Math.max(ms, 0), seconds * 1000);
  return Math.round(1000 - (t / (seconds * 1000)) * 500);
}

export const QUIZ_PACKS: QuizPack[] = [
  {
    id: 'bollywood', name: 'Bollywood emoji movies', questions: [
      { q: '\u{1F393}\u{1F393}\u{1F393}\u{1F92A}', options: ['3 Idiots', 'Munna Bhai MBBS', 'Chhichhore', 'Student of the Year'], answer: 0 },
      { q: '\u{1F93C}‍♀️\u{1F468}‍\u{1F467}‍\u{1F467}\u{1F947}', options: ['Sultan', 'Dangal', 'Mary Kom', 'Chak De! India'], answer: 1 },
      { q: '\u{1F3D1}\u{1F469}\u{1F1EE}\u{1F1F3}', options: ['Lagaan', 'Gold', 'Chak De! India', 'Soorma'], answer: 2 },
      { q: '\u{1F3CF}☀️\u{1F4B0}\u{1F451}', options: ['Lagaan', '83', 'Iqbal', 'MS Dhoni'], answer: 0 },
      { q: '\u{1F682}\u{1F334}\u{1F46B}', options: ['Dil Se', 'Chennai Express', 'Jab We Met', 'Rail Gaadi'], answer: 1 },
      { q: '\u{1F3C3}‍♂️\u{1F1EE}\u{1F1F3}\u{1F947}', options: ['Paan Singh Tomar', 'Bhaag Milkha Bhaag', 'Sultan', 'Gold'], answer: 1 },
      { q: '\u{1F47B}\u{1F3DA}️\u{1F602}', options: ['Stree', 'Bhool Bhulaiyaa', 'Golmaal Again', 'Housefull'], answer: 1 },
      { q: '\u{1F42F}\u{1F52B}❤️', options: ['Ek Tha Tiger', 'War', 'Pathaan', 'Bang Bang'], answer: 0 },
      { q: '\u{1F5E1}️\u{1F3F0}\u{1F451}\u{1F418}', options: ['Padmaavat', 'Baahubali', 'Bajirao Mastani', 'RRR'], answer: 1 },
      { q: '✈️\u{1F1EE}\u{1F1F3}\u{1F3DC}️', options: ['Airlift', 'Neerja', 'Baby', 'Raazi'], answer: 0 },
      { q: '\u{1F40E}\u{1F52B}\u{1F525}\u{1F46C}', options: ['Deewar', 'Sholay', 'Karan Arjun', 'Don'], answer: 1 },
      { q: '\u{1F478}✈️\u{1F1EB}\u{1F1F7}', options: ['English Vinglish', 'Queen', 'Piku', 'Dear Zindagi'], answer: 1 },
      { q: '\u{1F468}‍\u{1F469}‍\u{1F466}‍\u{1F466}\u{1F60A}\u{1F622}', options: ['Hum Saath Saath Hain', 'Kabhi Khushi Kabhie Gham', 'Baghban', 'Dil Dhadakne Do'], answer: 1 },
      { q: '\u{1F377}\u{1F494}\u{1FA94}', options: ['Devdas', 'Rockstar', 'Kabir Singh', 'Aashiqui 2'], answer: 0 },
    ],
  },
  {
    id: 'india', name: 'India general knowledge', questions: [
      { q: 'What is India’s national animal?', options: ['Lion', 'Elephant', 'Bengal tiger', 'Peacock'], answer: 2 },
      { q: 'Which city is the Taj Mahal in?', options: ['Delhi', 'Agra', 'Jaipur', 'Lucknow'], answer: 1 },
      { q: 'What is the capital of Rajasthan?', options: ['Udaipur', 'Jodhpur', 'Jaipur', 'Ajmer'], answer: 2 },
      { q: 'India’s Republic Day is on…', options: ['15 August', '26 January', '2 October', '14 November'], answer: 1 },
      { q: 'What is the smallest state of India by area?', options: ['Sikkim', 'Tripura', 'Goa', 'Manipur'], answer: 2 },
      { q: 'Who was the first Indian in space?', options: ['Kalpana Chawla', 'Rakesh Sharma', 'Sunita Williams', 'Vikram Sarabhai'], answer: 1 },
      { q: 'What is the highest mountain in India?', options: ['Nanda Devi', 'Kangchenjunga', 'K2', 'Kamet'], answer: 1 },
      { q: 'India’s national flower is the…', options: ['Rose', 'Lotus', 'Marigold', 'Jasmine'], answer: 1 },
      { q: 'In which year did Chandrayaan-3 land on the Moon?', options: ['2019', '2021', '2023', '2024'], answer: 2 },
      { q: 'How many states does India have?', options: ['26', '28', '29', '30'], answer: 1 },
      { q: 'Which river is the longest in India?', options: ['Yamuna', 'Godavari', 'Ganga', 'Narmada'], answer: 2 },
      { q: 'Who is called the Father of the Nation?', options: ['Jawaharlal Nehru', 'Mahatma Gandhi', 'B. R. Ambedkar', 'Sardar Patel'], answer: 1 },
    ],
  },
  {
    id: 'himachal', name: 'Himachal and Dharamshala', questions: [
      { q: 'Which mountain range rises right above Dharamshala?', options: ['Pir Panjal', 'Dhauladhar', 'Zanskar', 'Shivalik'], answer: 1 },
      { q: 'McLeod Ganj is often called…', options: ['Little Tibet', 'Little Lhasa', 'Mini Switzerland', 'Queen of Hills'], answer: 1 },
      { q: 'What is the main Tibetan temple in McLeod Ganj called?', options: ['Tsuglagkhang', 'Hemis', 'Rumtek', 'Tabo'], answer: 0 },
      { q: 'Which is the most popular day trek from McLeod Ganj?', options: ['Hampta Pass', 'Triund', 'Kheerganga', 'Chandrashila'], answer: 1 },
      { q: 'Which place near Dharamshala is famous for paragliding?', options: ['Solang', 'Bir Billing', 'Kufri', 'Auli'], answer: 1 },
      { q: 'Which airport is closest to Dharamshala?', options: ['Kullu (Bhuntar)', 'Shimla (Jubbarhatti)', 'Kangra (Gaggal)', 'Pathankot'], answer: 2 },
      { q: 'Which town is Himachal Pradesh’s capital?', options: ['Dharamshala', 'Manali', 'Shimla', 'Mandi'], answer: 2 },
      { q: 'Dharamshala is Himachal’s…', options: ['Second (winter) capital', 'Largest city', 'Oldest town', 'Only airport city'], answer: 0 },
      { q: 'Which waterfall is a short walk from McLeod Ganj?', options: ['Jogini', 'Bhagsu', 'Rahala', 'Chadwick'], answer: 1 },
      { q: 'The cricket stadium in Dharamshala belongs to the…', options: ['BCCI', 'HPCA', 'IPL', 'DDCA'], answer: 1 },
      { q: 'Which valley does the Kangra toy train run through?', options: ['Kullu Valley', 'Kangra Valley', 'Spiti Valley', 'Chamba Valley'], answer: 1 },
      { q: 'Kangra is famous for which painting style?', options: ['Madhubani', 'Miniature paintings', 'Warli', 'Tanjore'], answer: 1 },
      { q: 'St. John in the Wilderness near McLeod Ganj is a…', options: ['Fort', 'Church', 'Monastery', 'Waterfall'], answer: 1 },
      { q: 'The Masroor temples near Kangra are…', options: ['Rock-cut', 'Made of wood', 'Underwater', 'Made of marble'], answer: 0 },
    ],
  },
];

export const MOST_LIKELY_PROMPTS = [
  'be late to their own wedding', 'become famous on Instagram', 'forget a friend’s birthday', 'eat the last samosa without asking',
  'cry during a movie', 'sleep through an alarm', 'win a dance-off', 'talk their way out of a traffic challan',
  'become a millionaire', 'get lost with Google Maps on', 'start dancing first at a wedding', 'reply to messages three days late',
  'take 100 selfies on a trip', 'become a Bollywood star', 'adopt five dogs', 'plan the whole trip and still be late',
  'order food when there is food at home', 'bargain the hardest at a market', 'climb a mountain for the view', 'fall asleep at a party',
  'sing in the shower the loudest', 'win the lottery and lose the ticket', 'be the best host', 'laugh at their own jokes',
  'binge a whole series in one night', 'know all the gossip first', 'move to the mountains', 'get a tattoo on a holiday',
];

/** Random order, deterministic per call when `rand` is given. */
export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Host's own questions: 2-4 options, a marked answer, sensible lengths. Bad ones are dropped. */
export function cleanQuestions(input: unknown): QuizQuestion[] {
  if (!Array.isArray(input)) return [];
  const t = (v: unknown, n: number) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
  return input.slice(0, 20).map((x: any) => {
    const options = (Array.isArray(x?.options) ? x.options : []).map((o: unknown) => t(o, 60)).filter(Boolean).slice(0, 4);
    const answer = Number(x?.answer);
    return { q: t(x?.q, 140), options, answer };
  }).filter((x) => x.q.length >= 3 && x.options.length >= 2 && Number.isInteger(x.answer) && x.answer >= 0 && x.answer < x.options.length);
}

export function cleanPrompts(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((p) => String(p ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/^who('?s| is)? most likely to\s*/i, '').replace(/\?+$/, '').trim().slice(0, 100)).filter((p) => p.length >= 3).slice(0, 20);
}
