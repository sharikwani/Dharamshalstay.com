'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Award, Check, Clock, Loader2, Maximize, PartyPopper, Square, Trophy, Users, X } from 'lucide-react';
import { post } from './useGame';
import type { Me } from './JoinForm';
import type { PublicState } from '@/lib/game/store';
import type { RoundView } from '@/lib/game/party-store';
import { GAMES, prizeLabel } from '@/lib/game/party';
import { PARTY_TYPES, placeLabel } from '@/lib/game/tambola';

type Player = { id: string; name: string; photo: string | null };
const OPTION_COLORS = ['bg-rose-500', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500'];
const LETTERS = ['A', 'B', 'C', 'D'];

/** Everyone's name and photo, refreshed when the player count changes. */
export function useRoster(code: string, count: number) {
  const [players, setPlayers] = useState<Player[]>([]);
  useEffect(() => {
    const t = setTimeout(() => fetch(`/api/game/${code}/players`, { cache: 'no-store' }).then((r) => r.json()).then((j) => setPlayers(j.players || [])).catch(() => {}), 800);
    return () => clearTimeout(t);
  }, [code, count]);
  return players;
}

export function Avatar({ p, size = 40 }: { p?: Pick<Player, 'name' | 'photo'> | null; size?: number }) {
  const s = { width: size, height: size };
  // eslint-disable-next-line @next/next/no-img-element
  return p?.photo ? <img src={p.photo} alt="" style={s} className="rounded-full object-cover shrink-0" /> : <span style={s} className="flex shrink-0 items-center justify-center rounded-full bg-brand-700 font-bold text-white">{(p?.name || '?')[0].toUpperCase()}</span>;
}

/** Seconds left in a quiz question, counted from when this screen first saw it (phone clocks differ). */
function useCountdown(key: string, seconds: number, active: boolean) {
  const [left, setLeft] = useState(seconds);
  const start = useRef<{ key: string; at: number }>({ key: '', at: 0 });
  useEffect(() => {
    if (!active) return;
    if (start.current.key !== key) start.current = { key, at: Date.now() };
    const tick = () => setLeft(Math.max(0, seconds - Math.floor((Date.now() - start.current.at) / 1000)));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [key, seconds, active]);
  return active ? left : 0;
}

export function RoomHeader({ state, code }: { state: PublicState; code: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-brand-950 p-5 text-white">
      <div>
        <p className="text-xs uppercase tracking-wide text-orange-300">{GAMES[state.game].emoji} {GAMES[state.game].name} · {PARTY_TYPES[state.party_type]} · hosted by {state.host_name}</p>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold">{state.party_name}</h1>
        <p className="mt-3 text-brand-200">Join on your phone: <strong className="text-white">dharamshalastay.com/play</strong></p>
        <p className="text-5xl sm:text-6xl font-bold tracking-[0.2em] text-orange-400 mt-1">{code}</p>
        <p className="mt-2 flex items-center gap-2 text-brand-200"><Users className="h-4 w-4" />{state.players} players joined</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={'/api/game/qr?code=' + code} alt={'QR code to join game ' + code} className="h-36 w-36 rounded-xl bg-white p-2" />
    </div>
  );
}

export function Winners({ state, meId }: { state: PublicState; meId?: string }) {
  if (!state.winners.length) return null;
  const list = [...state.winners].sort((a, b) => a.place - b.place);
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <p className="flex items-center gap-2 font-heading font-bold text-lg text-slate-900"><Trophy className="h-5 w-5 text-amber-500" />Winners</p>
      <ul className="mt-3 space-y-2">
        {list.map((w) => (
          <li key={w.id} className={'flex items-center justify-between gap-3 rounded-xl p-3 ' + (w.player_id === meId ? 'bg-amber-100' : 'bg-slate-50')}>
            <span className="min-w-0"><span className="font-bold text-orange-600 mr-2">{placeLabel(w.place)}</span><span className="font-semibold text-slate-900">{w.name}</span>
              <span className="block text-xs text-slate-500 truncate">{w.detail || prizeLabel(w.prize)}</span></span>
            <Link href={'/play/certificate/' + w.id} target="_blank" className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline"><Award className="h-4 w-4" />Certificate</Link>
          </li>
        ))}
      </ul>
      {meId && list.some((w) => w.player_id === meId) && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-green-700"><PartyPopper className="h-4 w-4" />You won! Open your certificate to share it. If the game had 5+ players, your coupon is on its way to your email.</p>}
    </div>
  );
}

function HostButtons({ children, code, hostToken, ended, onError }: { children: React.ReactNode; code: string; hostToken: string; ended: boolean; onError: (m: string) => void }) {
  async function end() {
    if (!window.confirm('End the game for everyone?')) return;
    try { await post(`/api/game/${code}/end`, { hostToken }); } catch (x: any) { onError(x.message); }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {children}
      <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"><Maximize className="h-4 w-4" />Full screen</button>
      {!ended && <button onClick={end} className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"><Square className="h-4 w-4" />End game</button>}
    </div>
  );
}

const big = 'inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-lg font-semibold text-white hover:bg-orange-700 disabled:opacity-60';

/* ================================================================== Quiz */

export function QuizHost({ code, state, hostToken, setState }: { code: string; state: PublicState; hostToken: string; setState: (s: PublicState) => void }) {
  const r = state.round as Extract<RoundView, { kind: 'quiz' }>;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const left = useCountdown('q' + r.index, r.seconds, r.phase === 'question');
  const next = useCallback(async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try { setState(await post<PublicState>(`/api/game/${code}/next`, { hostToken })); } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }, [busy, code, hostToken, setState]);
  // Reveal by itself when time is up or everyone has answered.
  const auto = useRef('');
  useEffect(() => {
    if (r.phase !== 'question') return;
    const key = 'q' + r.index;
    if ((left === 0 || (state.players > 0 && r.answered >= state.players)) && auto.current !== key) { auto.current = key; next(); }
  }, [left, r.phase, r.index, r.answered, state.players, next]);

  const last = r.index + 1 >= r.total;
  return (
    <div className="space-y-5">
      <RoomHeader state={state} code={code} />
      {r.phase === 'lobby' && (
        <div className="rounded-2xl bg-white p-6 shadow text-center">
          <p className="text-xl font-semibold text-slate-800">{r.total} questions ready. {state.players ? `${state.players} players in.` : 'Waiting for players…'}</p>
          <p className="text-slate-500 mt-1">Each question has {r.seconds} seconds. Faster right answers score more.</p>
          <button onClick={next} disabled={busy} className={big + ' mt-5'}>Start the quiz</button>
        </div>
      )}
      {(r.phase === 'question' || r.phase === 'reveal') && r.q && (
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Question {r.index + 1} of {r.total}</span>
            {r.phase === 'question' ? <span className="flex items-center gap-1 text-lg font-bold text-orange-600"><Clock className="h-5 w-5" />{left}s</span> : <span>{r.answered} answered</span>}
          </div>
          <h2 className="mt-3 text-center text-3xl sm:text-5xl font-heading font-bold text-slate-900 leading-tight">{r.q}</h2>
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {r.options!.map((o, i) => (
              <div key={i} className={'flex items-center gap-3 rounded-xl p-4 text-lg sm:text-2xl font-semibold text-white transition ' + OPTION_COLORS[i] + (r.phase === 'reveal' && i !== r.answer ? ' opacity-30' : '')}>
                <span className="rounded-lg bg-white/25 px-2.5">{LETTERS[i]}</span><span className="flex-1">{o}</span>
                {r.phase === 'reveal' && <span className="text-base">{r.counts?.[i] ?? 0}</span>}
                {r.phase === 'reveal' && i === r.answer && <Check className="h-7 w-7" />}
              </div>
            ))}
          </div>
          {r.phase === 'question' && <p className="mt-4 text-center text-slate-500">{r.answered} of {state.players} answered</p>}
        </div>
      )}
      {(r.phase === 'reveal' || r.phase === 'ended') && r.leaderboard && r.leaderboard.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="font-heading font-bold text-lg text-slate-900">Leaderboard</p>
          <ol className="mt-3 space-y-1">{r.leaderboard.slice(0, 5).map((x, i) => <li key={x.player_id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span><span className="font-bold text-orange-600 mr-2">{i + 1}</span>{x.name}</span><span className="font-semibold">{x.points.toLocaleString('en-IN')}</span></li>)}</ol>
        </div>
      )}
      <Winners state={state} />
      <HostButtons code={code} hostToken={hostToken} ended={state.status === 'ended'} onError={setErr}>
        {r.phase === 'question' && <button onClick={next} disabled={busy} className={big}>Reveal answer</button>}
        {r.phase === 'reveal' && <button onClick={next} disabled={busy} className={big}>{last ? 'Finish and show winners' : 'Next question'}</button>}
      </HostButtons>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}

export function QuizPlayer({ code, state, me }: { code: string; state: PublicState; me: Me }) {
  const r = state.round as Extract<RoundView, { kind: 'quiz' }>;
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const left = useCountdown('q' + r.index, r.seconds, r.phase === 'question');
  const mine = picked[r.index];
  async function pick(i: number) {
    if (mine !== undefined) return;
    setPicked((p) => ({ ...p, [r.index]: i })); setMsg(null);
    try {
      const res = await post<{ result: string }>(`/api/game/${code}/answer`, { token: me.token, value: i });
      if (res.result === 'closed') setMsg('Time was up for this one.');
    } catch (x: any) { setMsg(x.message); setPicked((p) => { const n = { ...p }; delete n[r.index]; return n; }); }
  }
  const rank = r.leaderboard?.findIndex((x) => x.player_id === me.playerId) ?? -1;
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <p className="text-xs text-slate-500">{GAMES.quiz.name} · {state.party_name} · {state.players} playing</p>
      {r.phase === 'lobby' && <div className="rounded-2xl bg-white p-6 text-center shadow"><p className="font-semibold text-slate-800">You are in, {me.name}!</p><p className="text-slate-500 text-sm mt-1">Watch the big screen. The quiz starts soon.</p></div>}
      {(r.phase === 'question' || r.phase === 'reveal') && r.q && (
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="flex justify-between text-sm text-slate-500"><span>Q{r.index + 1}/{r.total}</span>{r.phase === 'question' && <span className="font-bold text-orange-600">{left}s</span>}</div>
          <p className="mt-2 text-center text-2xl font-heading font-bold text-slate-900">{r.q}</p>
          <div className="mt-4 grid grid-cols-1 gap-2">
            {r.options!.map((o, i) => {
              const reveal = r.phase === 'reveal';
              const right = reveal && i === r.answer;
              const wrong = reveal && mine === i && i !== r.answer;
              return (
                <button key={i} onClick={() => pick(i)} disabled={mine !== undefined || reveal}
                  className={'flex items-center gap-3 rounded-xl p-4 text-left text-lg font-semibold text-white transition ' + OPTION_COLORS[i] + (mine !== undefined && mine !== i && !right ? ' opacity-40' : '') + (mine === i ? ' ring-4 ring-slate-900' : '')}>
                  <span className="rounded bg-white/25 px-2">{LETTERS[i]}</span><span className="flex-1">{o}</span>{right && <Check className="h-6 w-6" />}{wrong && <X className="h-6 w-6" />}
                </button>
              );
            })}
          </div>
          {r.phase === 'question' && mine !== undefined && <p className="mt-3 text-center font-semibold text-slate-700">Locked in! Wait for the answer…</p>}
          {r.phase === 'reveal' && <p className="mt-3 text-center font-semibold">{mine === r.answer ? '🎉 Correct!' : mine === undefined ? 'You did not answer this one.' : 'Not this time!'}</p>}
          {msg && <p className="mt-2 text-sm text-amber-700">{msg}</p>}
        </div>
      )}
      {r.leaderboard && rank >= 0 && <p className="text-center text-sm text-slate-600">You are <strong>#{rank + 1}</strong> with {r.leaderboard[rank].points.toLocaleString('en-IN')} points.</p>}
      <Winners state={state} meId={me.playerId} />
    </div>
  );
}

/* ================================================================== Who's Most Likely To */

export function LikelyHost({ code, state, hostToken, setState }: { code: string; state: PublicState; hostToken: string; setState: (s: PublicState) => void }) {
  const r = state.round as Extract<RoundView, { kind: 'most_likely' }>;
  const roster = useRoster(code, state.players);
  const byId = new Map(roster.map((p) => [p.id, p]));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function next() {
    if (busy) return;
    setBusy(true); setErr(null);
    try { setState(await post<PublicState>(`/api/game/${code}/next`, { hostToken })); } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  const last = r.index + 1 >= r.total;
  return (
    <div className="space-y-5">
      <RoomHeader state={state} code={code} />
      {r.phase === 'lobby' && (
        <div className="rounded-2xl bg-white p-6 shadow text-center">
          <p className="text-xl font-semibold text-slate-800">{r.total} funny questions ready. {state.players < 3 ? 'Best with 3 or more players.' : `${state.players} players in.`}</p>
          <button onClick={next} disabled={busy} className={big + ' mt-5'}>Start</button>
        </div>
      )}
      {(r.phase === 'question' || r.phase === 'reveal') && r.prompt && (
        <div className="rounded-2xl bg-gradient-to-br from-fuchsia-600 to-orange-500 p-8 text-center text-white shadow">
          <p className="text-sm opacity-80">Question {r.index + 1} of {r.total}</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-heading font-bold leading-tight">Who&apos;s most likely to {r.prompt}?</h2>
          {r.phase === 'question' && <p className="mt-4 text-lg">{r.answered} of {state.players} voted</p>}
        </div>
      )}
      {(r.phase === 'reveal' || r.phase === 'ended') && r.results && (
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="font-heading font-bold text-lg text-slate-900">{r.phase === 'ended' ? 'Most votes overall' : 'The votes are in!'}</p>
          <ol className="mt-3 space-y-2">{r.results.map((x, i) => (
            <li key={x.player_id} className={'flex items-center gap-3 rounded-xl p-3 ' + (i === 0 ? 'bg-amber-100 text-xl' : 'bg-slate-50')}>
              <Avatar p={byId.get(x.player_id) || { name: x.name, photo: null }} size={i === 0 ? 64 : 40} />
              <span className="flex-1 font-semibold">{x.name}</span><span className="font-bold">{x.votes} vote{x.votes === 1 ? '' : 's'}</span>
            </li>
          ))}{!r.results.length && <li className="text-slate-500">No votes this round.</li>}</ol>
        </div>
      )}
      <Winners state={state} />
      <HostButtons code={code} hostToken={hostToken} ended={state.status === 'ended'} onError={setErr}>
        {r.phase === 'question' && <button onClick={next} disabled={busy} className={big}>Show the votes</button>}
        {r.phase === 'reveal' && <button onClick={next} disabled={busy} className={big}>{last ? 'Finish and show winners' : 'Next question'}</button>}
      </HostButtons>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}

export function LikelyPlayer({ code, state, me }: { code: string; state: PublicState; me: Me }) {
  const r = state.round as Extract<RoundView, { kind: 'most_likely' }>;
  const roster = useRoster(code, state.players);
  const [voted, setVoted] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  async function vote(id: string) {
    if (voted[r.index]) return;
    setVoted((v) => ({ ...v, [r.index]: id })); setMsg(null);
    try {
      const res = await post<{ result: string }>(`/api/game/${code}/answer`, { token: me.token, value: id });
      if (res.result === 'closed') setMsg('Voting closed for this one.');
    } catch (x: any) { setMsg(x.message); setVoted((v) => { const n = { ...v }; delete n[r.index]; return n; }); }
  }
  const others = roster.filter((p) => p.id !== me.playerId);
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <p className="text-xs text-slate-500">{GAMES.most_likely.name} · {state.party_name}</p>
      {r.phase === 'lobby' && <div className="rounded-2xl bg-white p-6 text-center shadow"><p className="font-semibold text-slate-800">You are in, {me.name}!</p><p className="text-slate-500 text-sm mt-1">Watch the big screen. Questions start soon.</p></div>}
      {r.phase === 'question' && r.prompt && (
        <div className="rounded-2xl bg-white p-4 shadow">
          <p className="text-center text-xl font-heading font-bold text-slate-900">Who&apos;s most likely to {r.prompt}?</p>
          {voted[r.index] ? <p className="mt-4 text-center font-semibold text-green-700">Vote in! Watch the big screen.</p> : (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {others.map((p) => <button key={p.id} onClick={() => vote(p.id)} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-left font-medium hover:bg-brand-50"><Avatar p={p} size={36} /><span className="truncate">{p.name}</span></button>)}
              {!others.length && <p className="col-span-2 text-center text-sm text-slate-500">Waiting for more players…</p>}
            </div>
          )}
          {msg && <p className="mt-2 text-sm text-amber-700">{msg}</p>}
        </div>
      )}
      {r.phase === 'reveal' && r.results && <div className="rounded-2xl bg-white p-4 shadow"><p className="font-semibold">Top votes</p><ol className="mt-2 space-y-1 text-sm">{r.results.map((x) => <li key={x.player_id} className="flex justify-between"><span>{x.name}{x.player_id === me.playerId ? ' (you!)' : ''}</span><span>{x.votes}</span></li>)}</ol></div>}
      <Winners state={state} meId={me.playerId} />
    </div>
  );
}

/* ================================================================== Lucky Draw */

/** The reel: flicks through everyone's photos, then lands on the winner. */
function Reel({ roster, winner, onSettled }: { roster: Player[]; winner: Player | null; onSettled: () => void }) {
  const [shown, setShown] = useState<Player | null>(winner);
  const [spinning, setSpinning] = useState(false);
  const lastWinner = useRef<string | null>(winner?.id ?? null);
  useEffect(() => {
    if (!winner || winner.id === lastWinner.current || roster.length < 2) { setShown(winner); onSettled(); return; }
    lastWinner.current = winner.id;
    setSpinning(true);
    let i = 0;
    let delay = 60;
    let t: ReturnType<typeof setTimeout>;
    const step = () => {
      setShown(roster[i++ % roster.length]);
      delay *= 1.08;
      if (delay < 450) t = setTimeout(step, delay); else { setShown(winner); setSpinning(false); onSettled(); }
    };
    step();
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, roster]);
  return (
    <div className="flex flex-col items-center py-6">
      <div className={'rounded-full p-2 ' + (spinning ? 'bg-slate-200' : 'bg-gradient-to-br from-amber-300 to-orange-500')}><Avatar p={shown} size={180} /></div>
      <p className={'mt-4 text-4xl font-heading font-bold ' + (spinning ? 'text-slate-400' : 'text-slate-900')}>{shown?.name || 'Ready to spin'}</p>
      {!spinning && winner && <p className="mt-1 text-xl text-orange-600 font-semibold">🎉 Winner!</p>}
    </div>
  );
}

export function DrawHost({ code, state, hostToken, setState }: { code: string; state: PublicState; hostToken: string; setState: (s: PublicState) => void }) {
  const r = state.round as Extract<RoundView, { kind: 'lucky_draw' }>;
  const roster = useRoster(code, state.players);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const latest = [...state.winners].sort((a, b) => b.place - a.place)[0];
  // The winners list waits for the reel to stop, so the name is not spoiled while it spins.
  const [settled, setSettled] = useState(state.winners.length);
  const winner = latest ? roster.find((p) => p.id === latest.player_id) || { id: latest.player_id, name: latest.name, photo: null } : null;
  async function spinNow() {
    if (busy) return;
    setBusy(true); setErr(null);
    try { setState(await post<PublicState>(`/api/game/${code}/spin`, { hostToken })); } catch (x: any) { setErr(x.message); } finally { setTimeout(() => setBusy(false), 3500); }
  }
  const done = state.status === 'ended' || state.winners.length >= r.prizes;
  return (
    <div className="space-y-5">
      <RoomHeader state={state} code={code} />
      <div className="rounded-2xl bg-white p-6 shadow text-center">
        <p className="text-slate-500">{state.winners.length} of {r.prizes} prize{r.prizes > 1 ? 's' : ''} drawn</p>
        <Reel roster={roster} winner={winner} onSettled={() => setSettled(state.winners.length)} />
        {!done && <button onClick={spinNow} disabled={busy || state.players < 1} className={big}>{state.winners.length ? 'Spin for the next prize' : 'Spin!'}</button>}
        {!roster.length && <p className="mt-3 text-slate-500">Waiting for players to join…</p>}
      </div>
      {!done && roster.length > 0 && <div className="flex flex-wrap justify-center gap-2">{roster.slice(0, 60).map((p) => <Avatar key={p.id} p={p} size={44} />)}</div>}
      <Winners state={{ ...state, winners: [...state.winners].sort((a, b) => a.place - b.place).slice(0, settled) }} />
      <HostButtons code={code} hostToken={hostToken} ended={state.status === 'ended'} onError={setErr}>{null}</HostButtons>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}

export function DrawPlayer({ state, me }: { state: PublicState; me: Me }) {
  const r = state.round as Extract<RoundView, { kind: 'lucky_draw' }>;
  // Phones learn the winner while the TV reel is still spinning: wait for it.
  const [shown, setShown] = useState(state.winners.length);
  useEffect(() => { const t = setTimeout(() => setShown(state.winners.length), 4500); return () => clearTimeout(t); }, [state.winners.length]);
  const visible = { ...state, winners: [...state.winners].sort((a, b) => a.place - b.place).slice(0, shown) };
  const mine = visible.winners.some((w) => w.player_id === me.playerId);
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="rounded-2xl bg-white p-6 text-center shadow">
        <p className="text-4xl">{GAMES.lucky_draw.emoji}</p>
        <p className="mt-2 font-semibold text-slate-800">You are in the draw, {me.name}!</p>
        <p className="text-slate-500 text-sm mt-1">{shown < state.winners.length ? 'Spinning… watch the big screen!' : `${visible.winners.length} of ${r.prizes} prizes drawn. Watch the big screen.`}</p>
        {mine && <p className="mt-3 text-lg font-bold text-green-700">🎉 You won!</p>}
      </div>
      <Winners state={visible} meId={me.playerId} />
    </div>
  );
}
