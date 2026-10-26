'use client';
/**
 * TV mode: a TV becomes the game's host screen, and the host's phone becomes its remote.
 *
 * Pairing (no typing on the TV): the TV opens /tv and shows a QR for /play/tv/<pairId>. The host scans it with the
 * phone that started the game; the phone sends the game code and host token to the TV over a Supabase Realtime
 * channel named after the pair id (random, shown only on the TV), and the TV takes over at /tv/<code>.
 * Chromecast: Chrome's Presentation API opens /tv/<code> on the Cast device and passes the same details over the
 * presentation connection, so nothing is typed or scanned at all.
 * Remote: the phone calls the game APIs itself; Tambola auto-calling runs on the TV, so the phone switches it on and
 * off with a control message on the 'gametv:<code>' channel, where the TV also says it is connected.
 */
import { supabase } from '@/lib/supabase';
import { store } from './useGame';

export const hostKey = (code: string) => 'tambola-host-' + code;
export const remoteKey = (code: string) => 'tv-remote-' + code;
const tvChannel = (code: string) => 'gametv:' + code;
const pairChannel = (id: string) => 'tvpair:' + id;

export type TvControl = { type: 'auto'; on: boolean };
export type TvLink = { code: string; hostToken: string };

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newPairId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
export const normPairId = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
export const showPairId = (id: string) => id.slice(0, 4) + '-' + id.slice(4);

/** Games this device started (it holds their host tokens), newest first by storage order. */
export function hostedGames(): TvLink[] {
  const out: TvLink[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (!k.startsWith('tambola-host-')) continue;
      const hostToken = store.get<string>(k);
      if (hostToken) out.push({ code: k.slice('tambola-host-'.length), hostToken });
    }
  } catch { /* storage blocked */ }
  return out.reverse();
}

/** TV side: wait for the host's phone to send the game. Calls onLink once per link and acknowledges it. */
export function listenForPhone(pairId: string, onLink: (l: TvLink) => void): () => void {
  const ch = supabase.channel(pairChannel(pairId), { config: { broadcast: { self: false } } });
  ch.on('broadcast', { event: 'link' }, ({ payload }) => {
    const l = payload as TvLink;
    if (!l?.code || !l?.hostToken) return;
    ch.send({ type: 'broadcast', event: 'linked', payload: { code: l.code } });
    onLink(l);
  }).subscribe();
  return () => { supabase.removeChannel(ch); };
}

/** Phone side: send the game to the TV showing this pair id. Resolves true once the TV confirms (10 s timeout). */
export function sendToTv(pairId: string, link: TvLink): Promise<boolean> {
  return new Promise((resolve) => {
    const ch = supabase.channel(pairChannel(pairId), { config: { broadcast: { self: false } } });
    let done = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      if (timer) clearInterval(timer);
      setTimeout(() => supabase.removeChannel(ch), 500);
      resolve(ok);
    };
    ch.on('broadcast', { event: 'linked' }, () => finish(true)).subscribe((status) => {
      if (status !== 'SUBSCRIBED' || timer) return;
      const send = () => ch.send({ type: 'broadcast', event: 'link', payload: link });
      send();
      timer = setInterval(send, 1500);
    });
    setTimeout(() => finish(false), 10_000);
  });
}

/** TV side: say "connected" every 10 s and apply the phone's control messages. */
export function tvSide(code: string, onControl: (c: TvControl) => void): () => void {
  const ch = supabase.channel(tvChannel(code), { config: { broadcast: { self: false } } });
  ch.on('broadcast', { event: 'control' }, ({ payload }) => onControl(payload as TvControl));
  let beat: ReturnType<typeof setInterval> | undefined;
  ch.subscribe((status) => {
    if (status !== 'SUBSCRIBED' || beat) return;
    const ping = () => ch.send({ type: 'broadcast', event: 'tv', payload: { at: Date.now() } });
    ping();
    beat = setInterval(ping, 10_000);
  });
  return () => { if (beat) clearInterval(beat); supabase.removeChannel(ch); };
}

/** Phone side: whether the TV has been heard from in the last 30 s, and a way to send it controls. */
export function remoteSide(code: string, onSeen: (at: number) => void) {
  const ch = supabase.channel(tvChannel(code), { config: { broadcast: { self: false } } });
  ch.on('broadcast', { event: 'tv' }, () => onSeen(Date.now())).subscribe();
  return {
    send: (c: TvControl) => ch.send({ type: 'broadcast', event: 'control', payload: c }),
    close: () => { supabase.removeChannel(ch); },
  };
}

/* ---------------------------------------------------------------- Chromecast (Presentation API) */

/** Chrome on a laptop (and some Android) can present a page on a Chromecast. Null when this browser cannot. */
export function castRequest(code: string): any | null {
  const P = typeof window !== 'undefined' ? (window as any).PresentationRequest : undefined;
  if (!P) return null;
  try { return new P([window.location.origin + '/tv/' + code + '?cast=1']); } catch { return null; }
}

/** Start casting and hand the TV page the host token over the presentation connection. */
export async function startCast(req: any, link: TvLink): Promise<void> {
  const conn = await req.start();
  const send = () => { try { conn.send(JSON.stringify(link)); } catch { /* not open yet */ } };
  if (conn.state === 'connected') send();
  conn.addEventListener('connect', send);
  conn.addEventListener('message', send); // the TV page asks again ("hello") once it has loaded
}

/** On the Chromecast: receive the host token from the casting device. */
export function listenForCaster(onLink: (l: TvLink) => void): boolean {
  const receiver = typeof navigator !== 'undefined' ? (navigator as any).presentation?.receiver : null;
  if (!receiver) return false;
  const add = (conn: any) => {
    conn.addEventListener('message', (e: MessageEvent) => {
      try { const l = JSON.parse(String(e.data)) as TvLink; if (l.code && l.hostToken) onLink(l); } catch { /* not ours */ }
    });
    try { conn.send('hello'); } catch { /* not open yet */ }
  };
  receiver.connectionList.then((list: any) => {
    list.connections.forEach(add);
    list.onconnectionavailable = (e: any) => add(e.connection);
  }).catch(() => {});
  return true;
}
