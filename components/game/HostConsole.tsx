'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Play, Pause, SkipForward, Users, Trophy, Volume2, VolumeX, Maximize, Square, Award } from 'lucide-react';
import { post, store } from './useGame';
import { PRIZES, PRIZE_ORDER, PARTY_TYPES, callText, placeLabel, type Prize } from '@/lib/game/tambola';
import { prizeLabel } from '@/lib/game/party';
import { ANCHOR_VOICES, DEVICE_VOICE, anchorLine, anchorWinner, preloadVoice, warmNames } from './anchor';
import type { PublicState } from '@/lib/game/store';

type Player = { id: string; name: string; photo: string | null };
const SPEEDS = [5, 8, 12, 20];

/** Tambola host screen (HostRoom loads the room and checks this device is the host). */
export default function HostConsole({ code, state, hostToken, setState }: { code: string; state: PublicState; hostToken: string; setState: (s: PublicState) => void }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [auto, setAuto] = useState(false);
  const [speed, setSpeed] = useState(8);
  const [voice, setVoice] = useState(true);
  const [anchor, setAnchor] = useState<string>(ANCHOR_VOICES[0].id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const spoken = useRef(0);
  const announced = useRef(0);

  useEffect(() => { const a = store.get<string>('tambola-anchor'); if (a) setAnchor(a); }, []);
  useEffect(() => { if (voice) preloadVoice(anchor); }, [anchor, voice]);
  // Make each player's name in the anchor's voice as they join, ready for when they win.
  useEffect(() => { if (voice) warmNames(players.map((p) => p.name), anchor); }, [players, anchor, voice]);

  const loadPlayers = useCallback(async () => {
    if (!hostToken) return;
    try { setPlayers((await post<{ players: Player[] }>(`/api/game/${code}/players`, { hostToken })).players); } catch { /* next time */ }
  }, [code, hostToken]);
  // Many phones join at once: reload the list at most every few seconds.
  useEffect(() => { const t = setTimeout(loadPlayers, 2500); return () => clearTimeout(t); }, [loadPlayers, state?.players]);

  const call = useCallback(async () => {
    if (!hostToken || busy) return;
    setBusy(true); setErr(null);
    try { setState(await post<PublicState>(`/api/game/${code}/call`, { hostToken })); } catch (x: any) { setErr(x.message); setAuto(false); } finally { setBusy(false); }
  }, [code, hostToken, busy, setState]);

  // Auto-call: one number every few seconds until paused or the game ends.
  useEffect(() => {
    if (!auto || state?.status === 'ended') return;
    const t = setTimeout(call, speed * 1000);
    return () => clearTimeout(t);
  }, [auto, speed, call, state?.called.length, state?.status]);

  const last = state?.called[state.called.length - 1];
  useEffect(() => {
    if (!state || !last || state.called.length === spoken.current) return;
    spoken.current = state.called.length;
    if (voice) { if (state.called.length === 1) anchorLine('start', anchor); anchorLine('n' + last, anchor); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last, state?.called.length]);
  useEffect(() => {
    if (!state || state.winners.length <= announced.current) return;
    const fresh = state.winners.slice(announced.current);
    announced.current = state.winners.length;
    if (spoken.current && voice) fresh.forEach((w) => anchorWinner(w.name, w.prize as Prize, anchor));
    if (state.winners.some((w) => w.prize === 'full_house')) setAuto(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.winners.length]);

  async function end() {
    if (!hostToken || !window.confirm('End the game for everyone?')) return;
    try { setState(await post<PublicState>(`/api/game/${code}/end`, { hostToken })); setAuto(false); } catch (x: any) { setErr(x.message); }
  }


  const called = new Set(state.called);
  const ended = state.status === 'ended';
  const joinUrl = 'dharamshalastay.com/play';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-brand-950 p-5 text-white">
        <div>
          <p className="text-xs uppercase tracking-wide text-orange-300">{PARTY_TYPES[state.party_type]} · hosted by {state.host_name}</p>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold">{state.party_name}</h1>
          <p className="mt-3 text-brand-200">Join on your phone: <strong className="text-white">{joinUrl}</strong></p>
          <p className="text-5xl sm:text-6xl font-bold tracking-[0.2em] text-orange-400 mt-1">{code}</p>
          <p className="mt-2 flex items-center gap-2 text-brand-200"><Users className="h-4 w-4" />{state.players} players joined</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={'/api/game/qr?code=' + code} alt={'QR code to join game ' + code} className="h-40 w-40 rounded-xl bg-white p-2" />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-white p-5 shadow">
            <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full bg-orange-500 text-7xl font-bold text-white shadow-inner">{last ?? '–'}</div>
            <div className="flex-1 min-w-[200px] space-y-3">
              <p className="text-xl font-semibold text-slate-800">{ended ? 'Game over' : last ? callText(last) : state.players ? 'Ready when you are' : 'Waiting for players to join…'}</p>
              <p className="text-sm text-slate-500">{state.called.length} of 90 called</p>
              {!ended && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={call} disabled={busy || auto} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SkipForward className="h-4 w-4" />}{state.called.length ? 'Next number' : 'Start game'}</button>
                  <button onClick={() => setAuto(!auto)} className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-4 py-3 font-semibold text-brand-800 hover:bg-brand-50">{auto ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Auto</>}</button>
                  <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2 text-sm" aria-label="Seconds between numbers">{SPEEDS.map((s) => <option key={s} value={s}>Every {s}s</option>)}</select>
                </div>
              )}
              <div className="flex flex-wrap gap-3 text-sm">
                <button onClick={() => setVoice(!voice)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">{voice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}{voice ? 'Voice on' : 'Voice off'}</button>
                <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"><Maximize className="h-4 w-4" />Full screen</button>
                {!ended && <button onClick={end} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"><Square className="h-4 w-4" />End game</button>}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label htmlFor="anchor" className="text-slate-600">Anchor voice</label>
                <select id="anchor" value={anchor} onChange={(e) => { setAnchor(e.target.value); store.set('tambola-anchor', e.target.value); }} className="rounded-lg border border-slate-300 px-2 py-1.5">
                  {ANCHOR_VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}: {v.note}</option>)}
                  <option value={DEVICE_VOICE}>This device&apos;s voice (no download)</option>
                </select>
                <button onClick={() => { anchorLine('n22', anchor); anchorWinner('Riya', 'full_house', anchor); }} className="rounded-lg border border-brand-200 px-3 py-1.5 font-medium text-brand-800 hover:bg-brand-50">&#9654; Hear it</button>
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow">
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => (
                <div key={n} className={'flex aspect-square items-center justify-center rounded-md text-sm sm:text-lg font-bold transition ' + (n === last ? 'bg-orange-500 text-white scale-110' : called.has(n) ? 'bg-brand-800 text-white' : 'bg-slate-100 text-slate-400')}>{n}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl bg-white p-4 shadow">
            <p className="flex items-center gap-2 font-semibold text-slate-800"><Trophy className="h-4 w-4 text-amber-500" />Prizes</p>
            <ul className="mt-3 space-y-2">
              {[...PRIZE_ORDER].reverse().map((p) => {
                const w = state.winners.find((x) => x.prize === p);
                return (
                  <li key={p} className={'rounded-xl p-3 ' + (w ? 'bg-amber-50' : 'bg-slate-50')}>
                    <p className="text-xs text-slate-500">{placeLabel(PRIZES[p].place)} prize · {PRIZES[p].rule}</p>
                    <p className="font-semibold text-slate-900">{PRIZES[p].label}</p>
                    {w ? <Link href={'/play/certificate/' + w.id} target="_blank" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline"><Award className="h-4 w-4" />{w.name} (at number {w.at_call})</Link> : <p className="text-sm text-slate-400">Not won yet</p>}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow">
            <p className="flex items-center gap-2 font-semibold text-slate-800"><Users className="h-4 w-4" />Players ({state.players})</p>
            <div className="mt-3 flex flex-wrap gap-2 max-h-72 overflow-y-auto">
              {players.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-1 pr-3 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.photo ? <img src={p.photo} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">{p.name[0]?.toUpperCase()}</span>}
                  {p.name}
                </div>
              ))}
              {!players.length && <p className="text-sm text-slate-400">Players appear here as they join.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
