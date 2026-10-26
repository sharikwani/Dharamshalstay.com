'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Tv } from 'lucide-react';
import { useGame, store } from './useGame';
import HostConsole from './HostConsole';
import { Avatar, DrawHost, LikelyHost, QuizHost, useRoster } from './PartyGames';
import { hostKey, listenForCaster, tvSide, type TvControl } from './tv';
import { prizeLabel } from '@/lib/game/party';
import { placeLabel } from '@/lib/game/tambola';
import type { PublicState, PublicWinner } from '@/lib/game/store';

/**
 * /tv/<code>: the TV is the host screen. Everything is scaled for viewing across a room (the root font size grows with
 * the screen, and every size on the site is in rem), the screen is kept awake, winners get a full-screen moment, and
 * the host's phone works as the remote (tv.ts).
 */
export default function TvHost({ code, cast }: { code: string; cast: boolean }) {
  const [hostToken, setHostToken] = useState<string | null | undefined>(undefined);
  const [started, setStarted] = useState(cast); // a Chromecast has no remote: sound may play without a click
  const [autoCommand, setAutoCommand] = useState<{ on: boolean; n: number } | undefined>();

  useEffect(() => {
    const t = store.get<string>(hostKey(code));
    if (t) { setHostToken(t); return; }
    const waiting = cast && listenForCaster((l) => { if (l.code === code) { store.set(hostKey(code), l.hostToken); setHostToken(l.hostToken); } });
    if (!waiting) setHostToken(null);
  }, [code, cast]);

  // Big text from across the room: every size is in rem, so the root font size scales the whole screen.
  useEffect(() => {
    const el = document.documentElement;
    const before = el.style.fontSize;
    el.style.fontSize = 'clamp(16px, 1.3vw, 32px)';
    return () => { el.style.fontSize = before; };
  }, []);

  // Keep the TV from dimming or sleeping during the game.
  useEffect(() => {
    let lock: any = null;
    const take = async () => { try { lock = await (navigator as any).wakeLock?.request('screen'); } catch { /* not supported */ } };
    take();
    const again = () => { if (document.visibilityState === 'visible') take(); };
    document.addEventListener('visibilitychange', again);
    return () => { document.removeEventListener('visibilitychange', again); try { lock?.release(); } catch { /* gone */ } };
  }, []);

  useEffect(() => {
    if (!hostToken) return;
    return tvSide(code, (c: TvControl) => { if (c.type === 'auto') setAutoCommand({ on: c.on, n: Date.now() }); });
  }, [code, hostToken]);

  if (hostToken === undefined) return <Center><Loader2 className="h-12 w-12 animate-spin" /><p className="mt-4 text-xl">{cast ? 'Waiting for your phone or laptop…' : 'Loading…'}</p></Center>;
  if (!hostToken) return (
    <Center>
      <Tv className="h-14 w-14 text-orange-300" />
      <p className="mt-4 max-w-xl text-center text-2xl">This TV is not connected to game {code} yet.</p>
      <Link href="/tv" className="mt-6 rounded-2xl bg-orange-500 px-8 py-4 text-xl font-semibold focus:outline-none focus-visible:ring-4 focus-visible:ring-white">Connect this TV</Link>
    </Center>
  );
  if (!started) return (
    <Center>
      <p className="text-3xl font-heading font-bold">Ready to host game {code}</p>
      <p className="mt-2 text-xl text-brand-200">Press OK on your remote to turn on the sound and open the game.</p>
      <button autoFocus onClick={() => { setStarted(true); document.documentElement.requestFullscreen?.().catch(() => {}); }}
        className="mt-8 rounded-2xl bg-orange-500 px-10 py-5 text-2xl font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-white">Start on TV</button>
    </Center>
  );
  return <TvGame code={code} hostToken={hostToken} autoCommand={autoCommand} />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center bg-brand-950 px-6 text-white">{children}</div>;
}

function TvGame({ code, hostToken, autoCommand }: { code: string; hostToken: string; autoCommand?: { on: boolean; n: number } }) {
  const { state, error, setState } = useGame(code);
  if (error && !state) return <Center><p className="text-2xl">{error}</p><Link href="/tv" className="mt-6 underline">Connect another game</Link></Center>;
  if (!state) return <Center><Loader2 className="h-12 w-12 animate-spin" /></Center>;
  const props = { code, state, hostToken, setState, tv: true };
  return (
    <div className="tv-mode min-h-screen bg-slate-100 px-4 py-4">
      <div className="mx-auto max-w-[110rem]">
        {state.game === 'quiz' ? <QuizHost {...props} />
          : state.game === 'most_likely' ? <LikelyHost {...props} />
            : state.game === 'lucky_draw' ? <DrawHost {...props} />
              : <HostConsole {...props} autoCommand={autoCommand} />}
      </div>
      <WinnerSplash state={state} code={code} />
    </div>
  );
}

/** A full-screen moment for each new winner: photo, name and prize, then back to the game. */
function WinnerSplash({ state, code }: { state: PublicState; code: string }) {
  const roster = useRoster(code, state.players);
  const celebrated = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<PublicWinner[]>([]);
  const [shown, setShown] = useState<PublicWinner | null>(null);

  useEffect(() => {
    // Winners already there when the TV opened are not celebrated again.
    if (!celebrated.current) { celebrated.current = new Set(state.winners.map((w) => w.id)); return; }
    const done = celebrated.current;
    const fresh = [...state.winners].sort((a, b) => b.place - a.place).filter((w) => !done.has(w.id));
    if (!fresh.length) return;
    fresh.forEach((w) => done.add(w.id));
    // The Lucky Draw reel spins for about 4 seconds first: do not spoil it.
    setTimeout(() => setQueue((q) => [...q, ...fresh]), state.game === 'lucky_draw' ? 4500 : 600);
  }, [state.winners, state.game]);

  useEffect(() => {
    if (shown || !queue.length) return;
    setShown(queue[0]);
    setQueue((q) => q.slice(1));
  }, [queue, shown]);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), 7000);
    return () => clearTimeout(t);
  }, [shown]);

  if (!shown) return null;
  const p = roster.find((x) => x.id === shown.player_id) || { name: shown.name, photo: null };
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 via-fuchsia-600 to-brand-900 text-white" role="status" aria-live="assertive">
      <p className="text-4xl">🎉🏆🎉</p>
      <p className="mt-4 text-2xl font-semibold uppercase tracking-[0.3em] text-white/80">{placeLabel(shown.place)} prize</p>
      <div className="mt-6 rounded-full bg-white/90 p-2 shadow-2xl"><Avatar p={p} size={260} /></div>
      <p className="mt-6 font-heading text-6xl font-bold">{shown.name}</p>
      <p className="mt-3 text-3xl">{shown.detail || prizeLabel(shown.prize)}</p>
    </div>
  );
}
