import { waitUntil } from '@vercel/functions';

/**
 * Run notices (emails, WhatsApp alerts) after the response is sent, so a slow provider can never time out
 * a request whose booking is already saved. On Vercel the function stays alive until `work` settles;
 * elsewhere it simply runs on. Failures are only logged.
 */
export function inBackground(label: string, work: () => Promise<unknown>): void {
  let started: Promise<unknown>;
  try { started = Promise.resolve(work()); } catch (e) { started = Promise.reject(e); }
  const p = started.catch((e) => console.error(`${label} failed:`, e));
  try { waitUntil(p); } catch (e) { console.error('waitUntil unavailable:', e); }
}
