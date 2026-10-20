'use client';
/**
 * The tambola anchor's voice on the host screen. Free and open source: Kokoro-82M (Apache 2.0).
 *
 * - Numbers and fixed lines are recorded ahead of time (scripts/tambola-voices.md) and served from
 *   /audio/tambola/<voice>/<key>.mp3, so they play instantly.
 * - The winner's name is the only live part: Kokoro runs in a background worker in the host's browser
 *   (model downloads once, about 90 MB) and names are made as players join, so they are usually ready
 *   before anyone wins. If a name is not ready in time, the device's voice says just the name.
 * - "This device's voice" reads everything with the browser's own voice (no downloads).
 */
import { ANCHOR_LINES, winnerSpeech, type Prize } from '@/lib/game/tambola';

export type AnchorVoice = { id: string; label: string; note: string };

/** Kokoro's best-rated English voices (all recorded in public/audio/tambola). */
export const ANCHOR_VOICES: AnchorVoice[] = [
  { id: 'af_heart', label: 'Heart', note: 'Warm, friendly woman (American)' },
  { id: 'am_michael', label: 'Michael', note: 'Confident man (American)' },
  { id: 'af_bella', label: 'Bella', note: 'Bright, lively woman (American)' },
  { id: 'bm_george', label: 'George', note: 'Classic announcer man (British)' },
  { id: 'bf_emma', label: 'Emma', note: 'Clear, polished woman (British)' },
  { id: 'am_fenrir', label: 'Fenrir', note: 'Big, energetic man (American)' },
];
export const DEVICE_VOICE = 'device';

const clipUrl = (voice: string, key: string) => `/audio/tambola/${voice}/${key}.mp3`;

/* ---------------------------------------------------------------- live names (Kokoro worker) */

const WORKER_SRC = `
let tts = null, loading = null;
const urgent = [], later = [];
let busy = false;
async function load() {
  if (!loading) loading = (async () => {
    const { KokoroTTS } = await import('https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm');
    tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'wasm' });
    postMessage({ type: 'ready' });
  })().catch((e) => { loading = null; postMessage({ type: 'failed', error: String(e && e.message || e) }); throw e; });
  return loading;
}
async function pump() {
  if (busy) return;
  busy = true;
  try {
    await load();
    while (urgent.length || later.length) {
      const job = urgent.shift() || later.shift();
      try { postMessage({ type: 'clip', id: job.id, blob: (await tts.generate(job.text, { voice: job.voice })).toBlob() }); }
      catch (e) { postMessage({ type: 'clip', id: job.id, error: String(e && e.message || e) }); }
    }
  } catch (e) {
    for (const job of urgent.splice(0).concat(later.splice(0))) postMessage({ type: 'clip', id: job.id, error: 'load failed' });
  } finally { busy = false; }
}
onmessage = (m) => {
  const d = m.data;
  if (d.type === 'gen') { (d.urgent ? urgent : later).push(d); pump(); }
  if (d.type === 'bump') { const i = later.findIndex((j) => j.id === d.id); if (i >= 0) urgent.push(later.splice(i, 1)[0]); }
};
`;

let worker: Worker | null = null;
let workerFailed = false;
let nextId = 1;
const waiting = new Map<number, { ok: (url: string) => void; no: (e: Error) => void }>();
const names = new Map<string, Promise<string>>();
const pendingIds = new Map<string, number>();

function getWorker(): Worker | null {
  if (worker || workerFailed) return worker;
  try {
    worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })), { type: 'module' });
    worker.onmessage = (m) => {
      const d = m.data;
      if (d.type === 'failed') { console.error('Anchor voice failed to load:', d.error); workerFailed = true; }
      if (d.type !== 'clip') return;
      const w = waiting.get(d.id);
      waiting.delete(d.id);
      if (w) { if (d.blob) w.ok(URL.createObjectURL(d.blob)); else w.no(new Error(d.error || 'no audio')); }
    };
  } catch (e) { console.error('Anchor worker failed:', e); workerFailed = true; worker = null; }
  return worker;
}

function nameClip(name: string, voice: string, urgent: boolean): Promise<string> {
  const key = voice + '|' + name;
  const have = names.get(key);
  if (have) { const pid = pendingIds.get(key); if (urgent && pid) worker?.postMessage({ type: 'bump', id: pid }); return have; }
  const w = getWorker();
  if (!w) return Promise.reject(new Error('no worker'));
  const id = nextId++;
  const p = new Promise<string>((ok, no) => { waiting.set(id, { ok, no }); });
  w.postMessage({ type: 'gen', id, text: name + ',', voice, urgent });
  pendingIds.set(key, id);
  p.then(() => pendingIds.delete(key), () => { pendingIds.delete(key); names.delete(key); });
  names.set(key, p);
  return p;
}

/** Make players' names ahead of time (called as they join), so a winner's name is ready instantly. */
export function warmNames(list: string[], voice: string) {
  if (voice === DEVICE_VOICE) return;
  list.forEach((n) => nameClip(n, voice, false).catch(() => null));
}

/* ---------------------------------------------------------------- playback */

function deviceVoice(): SpeechSynthesisVoice | null {
  const v = window.speechSynthesis?.getVoices() || [];
  return v.find((x) => /^en/i.test(x.lang) && /natural|google/i.test(x.name)) || v.find((x) => /^en-IN/i.test(x.lang)) || v.find((x) => /^en/i.test(x.lang)) || null;
}

function deviceSay(text: string): Promise<void> {
  return new Promise((done) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = deviceVoice();
      u.rate = 0.95;
      u.onend = () => done();
      u.onerror = () => done();
      window.speechSynthesis.speak(u);
      setTimeout(done, 8000);
    } catch { done(); }
  });
}

function playUrl(url: string): Promise<void> {
  return new Promise((done) => {
    const a = new Audio(url);
    a.onended = () => done();
    a.onerror = () => done();
    a.play().catch(() => done());
  });
}

/** One announcement at a time: a new one waits for the last to finish. */
let chain: Promise<void> = Promise.resolve();
const queue = (job: () => Promise<void>) => { chain = chain.then(job, job); return chain; };

/** Fetch the chosen voice's recorded lines into the browser cache. */
export function preloadVoice(voice: string) {
  if (voice === DEVICE_VOICE) return;
  Object.keys(ANCHOR_LINES).forEach((k) => fetch(clipUrl(voice, k)).catch(() => null));
}

/** Say a recorded line ("n22", "start", ...). */
export function anchorLine(key: string, voice: string) {
  return queue(() => (voice === DEVICE_VOICE ? deviceSay(ANCHOR_LINES[key]) : playUrl(clipUrl(voice, key))));
}

/** "We have a winner! Congratulations <name>, for Full House!" */
export function anchorWinner(name: string, prize: Prize, voice: string) {
  if (voice === DEVICE_VOICE) return queue(() => deviceSay(winnerSpeech(name, prize)));
  const live = nameClip(name, voice, true);
  live.catch(() => null);
  return queue(async () => {
    await playUrl(clipUrl(voice, 'winner'));
    const url = await Promise.race([live, new Promise<null>((r) => setTimeout(() => r(null), 2500))]).catch(() => null);
    if (url) await playUrl(url); else await deviceSay(name);
    await playUrl(clipUrl(voice, prize));
  });
}
