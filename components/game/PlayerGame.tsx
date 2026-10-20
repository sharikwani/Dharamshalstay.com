'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Trophy, Loader2, PartyPopper, Award, Volume2, VolumeX } from 'lucide-react';
import { useGame, post, store } from './useGame';
import { PRIZES, PRIZE_ORDER, PARTY_TYPES, callText, placeLabel, wins, type Prize, type Ticket } from '@/lib/game/tambola';

type Me = { playerId: string; token: string; ticket: Ticket; name: string };

/** Resize a picked photo on the phone before upload (keeps the upload small on mobile data). */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const s = Math.min(img.width, img.height);
    const c = document.createElement('canvas');
    c.width = c.height = 384;
    c.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 384, 384);
    return c.toDataURL('image/jpeg', 0.8);
  } finally { URL.revokeObjectURL(url); }
}

function Join({ code, party, onJoined }: { code: string; party: string; onJoined: (m: Me) => void }) {
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const me = await post<Me>(`/api/game/${code}/join`, { name, photo });
      store.set('tambola-player-' + code, me);
      onJoined(me);
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="max-w-sm mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-4">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Joining game {code}</p>
        <h1 className="text-2xl font-heading font-bold text-slate-900 mt-1">{party}</h1>
      </div>
      <button type="button" onClick={() => file.current?.click()} className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-dashed border-brand-200 bg-brand-50 text-brand-700">
        {photo ? <img src={photo} alt="Your photo" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center text-xs font-medium"><Camera className="h-7 w-7 mb-1" />Add photo</span>}
      </button>
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { setPhoto(await shrink(f)); } catch { setErr('Could not read that photo.'); } } }} />
      <p className="text-center text-xs text-slate-500">Your photo goes on your winner certificate.</p>
      <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={30} placeholder="Your name" className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:ring-2 focus:ring-brand-500" />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-orange-600 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60">{busy ? 'Getting your ticket…' : 'Get my ticket'}</button>
    </form>
  );
}

export default function PlayerGame({ code }: { code: string }) {
  const { state, error } = useGame(code);
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [marks, setMarks] = useState<number[]>([]);
  const [auto, setAuto] = useState(false);
  const [voice, setVoice] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [claiming, setClaiming] = useState<Prize | null>(null);
  const spoken = useRef(0);

  useEffect(() => {
    setMe(store.get<Me>('tambola-player-' + code));
    setMarks(store.get<number[]>('tambola-marks-' + code) || []);
    setAuto(!!store.get<boolean>('tambola-auto'));
    setReady(true);
  }, [code]);

  const called = useMemo(() => state?.called || [], [state]);
  const calledSet = useMemo(() => new Set(called), [called]);
  const last = called[called.length - 1];

  useEffect(() => {
    if (!voice || !last || called.length === spoken.current) return;
    spoken.current = called.length;
    try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(callText(last))); } catch { /* no voice */ }
  }, [voice, last, called.length]);

  if (error && !state) return <div className="max-w-sm mx-auto rounded-2xl bg-white p-6 text-center shadow"><p className="text-slate-700">{error}</p><Link href="/play" className="mt-4 inline-block text-brand-600 underline">Try another code</Link></div>;
  if (!state || !ready) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;

  const party = state.party_name;
  if (!me) {
    if (state.status === 'ended') return <div className="max-w-sm mx-auto rounded-2xl bg-white p-6 text-center shadow"><p className="text-slate-700">This game has finished.</p><Link href="/play" className="mt-4 inline-block text-brand-600 underline">Join another game</Link></div>;
    return <Join code={code} party={party} onJoined={setMe} />;
  }

  const marked = new Set(auto ? called : marks);
  const toggle = (n: number) => {
    if (auto || !n) return;
    const next = marked.has(n) ? marks.filter((x) => x !== n) : [...marks, n];
    setMarks(next); store.set('tambola-marks-' + code, next);
  };
  const taken = new Map(state.winners.map((w) => [w.prize, w]));
  const mine = state.winners.filter((w) => w.player_id === me.playerId);

  async function claimPrize(p: Prize) {
    if (!me || claiming) return;
    setClaiming(p); setMsg(null);
    try {
      const r = await post<{ result: string; winnerId?: string; place?: number }>(`/api/game/${code}/claim`, { token: me.token, prize: p });
      if (r.result === 'won') setMsg({ tone: 'ok', text: `You won ${PRIZES[p].label}! Your ${placeLabel(r.place!)} prize certificate is ready.` });
      else if (r.result === 'taken') setMsg({ tone: 'warn', text: `Someone claimed ${PRIZES[p].label} just before you.` });
      else if (r.result === 'ended') setMsg({ tone: 'warn', text: 'The game has finished.' });
      else setMsg({ tone: 'warn', text: `Not yet: ${PRIZES[p].rule.toLowerCase()} must all be called first.` });
    } catch (x: any) { setMsg({ tone: 'warn', text: x.message }); } finally { setClaiming(null); }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 truncate">{PARTY_TYPES[state.party_type]} · game {code} · {state.players} playing</p>
          <h1 className="font-heading font-bold text-lg text-slate-900 truncate">{party}</h1>
        </div>
        <button onClick={() => setVoice(!voice)} className="shrink-0 rounded-full bg-white p-2 shadow" aria-label={voice ? 'Mute calls' : 'Read numbers aloud'}>{voice ? <Volume2 className="h-5 w-5 text-brand-700" /> : <VolumeX className="h-5 w-5 text-slate-400" />}</button>
      </div>

      <div className="flex items-center gap-4 rounded-2xl bg-brand-900 p-4 text-white">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-orange-500 text-4xl font-bold shadow-inner">{last ?? '–'}</div>
        <div className="min-w-0">
          <p className="text-sm text-brand-200">{state.status === 'lobby' ? 'Waiting for the host to start…' : state.status === 'ended' ? 'Game over' : last ? callText(last) : ''}</p>
          <p className="mt-1 flex flex-wrap gap-1">{called.slice(-8, -1).reverse().map((n) => <span key={n} className="rounded bg-white/15 px-1.5 text-sm">{n}</span>)}</p>
          <p className="text-xs text-brand-300 mt-1">{called.length} of 90 called</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-2 shadow-lg">
        <p className="px-2 pb-2 text-sm font-semibold text-slate-700">{me.name}&apos;s ticket</p>
        <div className="grid grid-cols-9 gap-1">
          {me.ticket.flat().map((n, i) => (
            <button key={i} onClick={() => toggle(n)} disabled={!n}
              className={'aspect-square rounded-md text-base sm:text-lg font-bold transition ' + (!n ? 'bg-slate-100' : marked.has(n) ? 'bg-orange-500 text-white scale-95' : calledSet.has(n) ? 'bg-amber-100 text-slate-900 ring-2 ring-amber-400' : 'bg-brand-50 text-brand-900')}>
              {n || ''}
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 px-2 text-xs text-slate-600"><input type="checkbox" checked={auto} onChange={(e) => { setAuto(e.target.checked); store.set('tambola-auto', e.target.checked); }} />Mark called numbers for me</label>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PRIZE_ORDER.map((p) => {
          const w = taken.get(p);
          const ready = wins(me.ticket, called, p);
          return (
            <button key={p} onClick={() => claimPrize(p)} disabled={!!w || state.status === 'ended' || !!claiming}
              className={'rounded-xl p-3 text-center font-semibold shadow transition disabled:opacity-60 ' + (w ? 'bg-slate-200 text-slate-500' : ready ? 'bg-green-600 text-white animate-pulse' : 'bg-white text-slate-800')}>
              <span className="block text-xs font-medium">{placeLabel(PRIZES[p].place)} prize</span>
              {claiming === p ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : PRIZES[p].label}
              <span className="block text-[11px] font-normal truncate">{w ? 'Won by ' + w.name : PRIZES[p].rule}</span>
            </button>
          );
        })}
      </div>
      {msg && <p className={'rounded-lg px-3 py-2 text-sm ' + (msg.tone === 'ok' ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800')}>{msg.text}</p>}

      {mine.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-4 text-white shadow-lg">
          <p className="flex items-center gap-2 font-bold"><PartyPopper className="h-5 w-5" />You are a winner!</p>
          {mine.map((w) => <Link key={w.id} href={'/play/certificate/' + w.id} className="mt-2 flex items-center justify-between rounded-lg bg-white/20 px-3 py-2 font-semibold hover:bg-white/30"><span className="flex items-center gap-2"><Award className="h-4 w-4" />{placeLabel(w.place)} prize: {PRIZES[w.prize].label}</span><span>Certificate &rarr;</span></Link>)}
        </div>
      )}

      {state.winners.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow">
          <p className="flex items-center gap-2 font-semibold text-slate-800"><Trophy className="h-4 w-4 text-amber-500" />Winners</p>
          <ul className="mt-2 space-y-1 text-sm">{[...state.winners].sort((a, b) => a.place - b.place).map((w) => <li key={w.id} className="flex justify-between"><span>{placeLabel(w.place)} · {PRIZES[w.prize].label}</span><Link href={'/play/certificate/' + w.id} className="font-medium text-brand-700 underline">{w.name}</Link></li>)}</ul>
        </div>
      )}
      <p className="text-center text-xs text-slate-400">Free to play. Tambola by Dharamshala Stay.</p>
    </div>
  );
}
