'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Cast, Loader2, Pause, Play, SkipForward, Square, Tv, Users } from 'lucide-react';
import { post } from './useGame';
import { castRequest, remoteSide, startCast, type TvControl } from './tv';
import { GAMES } from '@/lib/game/party';
import { callText } from '@/lib/game/tambola';
import type { PublicState } from '@/lib/game/store';
import type { RoundView } from '@/lib/game/party-store';

const btn = 'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-lg font-semibold disabled:opacity-50';

/** The host's phone while a TV runs the game: the main buttons for each game, and whether the TV is connected. */
export function TvRemote({ code, state, hostToken, setState, onLeave }: {
  code: string; state: PublicState; hostToken: string; setState: (s: PublicState) => void; onLeave: () => void;
}) {
  const [seen, setSeen] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [auto, setAuto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const link = useRef<{ send: (c: TvControl) => void; close: () => void } | null>(null);

  useEffect(() => {
    link.current = remoteSide(code, setSeen);
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => { clearInterval(t); link.current?.close(); };
  }, [code]);
  const connected = now - seen < 30_000;

  const act = useCallback(async (path: 'call' | 'next' | 'spin' | 'end') => {
    if (busy) return;
    if (path === 'end' && !window.confirm('End the game for everyone?')) return;
    setBusy(true); setErr('');
    try { setState(await post<PublicState>(`/api/game/${code}/${path}`, { hostToken })); }
    catch (x: any) { setErr(x.message); }
    finally { setBusy(false); }
  }, [busy, code, hostToken, setState]);

  const setTvAuto = (on: boolean) => { setAuto(on); link.current?.send({ type: 'auto', on }); };
  const ended = state.status === 'ended';
  const r = state.round as RoundView | undefined;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="rounded-2xl bg-brand-950 p-5 text-white">
        <p className="text-xs uppercase tracking-wide text-orange-300">{GAMES[state.game].emoji} {GAMES[state.game].name} · remote</p>
        <h1 className="font-heading text-2xl font-bold">{state.party_name}</h1>
        <p className="mt-2 flex items-center gap-2 text-sm"><Tv className="h-4 w-4" />{connected ? <span className="text-green-300">TV connected</span> : <span className="text-amber-300">Waiting for the TV… (keep /tv/{code} open on it)</span>}</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-brand-200"><Users className="h-4 w-4" />{state.players} players · game code <strong className="tracking-widest text-white">{code}</strong></p>
      </div>

      {state.game === 'tambola' && (
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="flex items-center gap-4">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-500 text-4xl font-bold text-white">{state.called[state.called.length - 1] ?? '–'}</span>
            <p className="text-slate-700">{ended ? 'Game over' : state.called.length ? callText(state.called[state.called.length - 1]) : 'Ready to start'}<br /><span className="text-sm text-slate-500">{state.called.length} of 90 called</span></p>
          </div>
          {!ended && (
            <div className="mt-4 flex gap-2">
              <button onClick={() => act('call')} disabled={busy || auto} className={btn + ' bg-orange-600 text-white'}><SkipForward className="h-5 w-5" />{state.called.length ? 'Next' : 'Start'}</button>
              <button onClick={() => setTvAuto(!auto)} className={btn + ' border-2 border-brand-700 text-brand-800'}>{auto ? <><Pause className="h-5 w-5" />Pause</> : <><Play className="h-5 w-5" />Auto</>}</button>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">Auto calls a number every few seconds on the TV, with the voice. Change speed and voice on the TV.</p>
        </div>
      )}

      {(state.game === 'quiz' || state.game === 'most_likely') && r && (r.kind === 'quiz' || r.kind === 'most_likely') && (
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-slate-700">{r.phase === 'lobby' ? `${r.total} questions ready` : r.phase === 'ended' ? 'Finished' : `Question ${r.index + 1} of ${r.total}`}{r.phase === 'question' ? ` · ${r.answered} of ${state.players} answered` : ''}</p>
          {!ended && r.phase !== 'ended' && (
            <button onClick={() => act('next')} disabled={busy} className={btn + ' mt-4 w-full bg-orange-600 text-white'}>
              {r.phase === 'lobby' ? 'Start' : r.phase === 'question' ? (state.game === 'quiz' ? 'Reveal answer' : 'Show the votes') : r.index + 1 >= r.total ? 'Finish and show winners' : 'Next question'}
            </button>
          )}
        </div>
      )}

      {state.game === 'lucky_draw' && r && r.kind === 'lucky_draw' && (
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-slate-700">{state.winners.length} of {r.prizes} prize{r.prizes > 1 ? 's' : ''} drawn</p>
          {!ended && state.winners.length < r.prizes && <button onClick={() => act('spin')} disabled={busy || state.players < 1} className={btn + ' mt-4 w-full bg-orange-600 text-white'}>{state.winners.length ? 'Spin for the next prize' : 'Spin!'}</button>}
        </div>
      )}

      {busy && <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />}
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        {!ended && <button onClick={() => act('end')} className="inline-flex items-center gap-1 font-semibold text-red-600"><Square className="h-4 w-4" />End game</button>}
        <button onClick={onLeave} className="font-medium text-slate-600 underline">Show the full host screen on this phone</button>
        <Link href="/play/tv" className="font-medium text-slate-600 underline">Connect another TV</Link>
      </div>
    </div>
  );
}

/** On the normal host screen: put the game on a TV (scan the TV's QR) or cast it to a Chromecast. */
export function TvBar({ code, hostToken, onRemote }: { code: string; hostToken: string; onRemote: () => void }) {
  const req = useRef<any>(null);
  const [canCast, setCanCast] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    req.current = castRequest(code);
    if (!req.current?.getAvailability) return;
    req.current.getAvailability().then((a: any) => { setCanCast(!!a.value); a.onchange = () => setCanCast(!!a.value); }).catch(() => setCanCast(false));
  }, [code]);
  async function cast() {
    setErr('');
    try { await startCast(req.current, { code, hostToken }); onRemote(); }
    catch (x: any) { if (x?.name !== 'NotAllowedError' && x?.name !== 'AbortError') setErr('Could not start casting. Use Chrome’s menu (⋮) → Cast instead.'); }
  }
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow">
      <Tv className="h-5 w-5 shrink-0 text-brand-700" />
      <span className="flex-1 min-w-[220px]"><strong>Play on the TV:</strong> open <strong>dharamshalastay.com/tv</strong> on the TV and scan its QR with this device. The TV hosts, this device becomes the remote.</span>
      {canCast && <button onClick={cast} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2 font-semibold text-white"><Cast className="h-4 w-4" />Cast to TV</button>}
      {err && <span className="w-full text-red-600">{err}</span>}
    </div>
  );
}
