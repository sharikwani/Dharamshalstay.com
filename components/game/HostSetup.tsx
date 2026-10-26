'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { post, store } from './useGame';
import { PARTY_TYPES, type PartyType } from '@/lib/game/tambola';
import { GAMES, QUIZ_PACKS, type GameType } from '@/lib/game/party';

type OwnQ = { q: string; options: string[]; answer: number };
const blankQ = (): OwnQ => ({ q: '', options: ['', '', '', ''], answer: 0 });

export default function HostSetup() {
  const router = useRouter();
  const [game, setGame] = useState<GameType>('tambola');
  const [partyName, setPartyName] = useState('');
  const [partyType, setPartyType] = useState<PartyType>('birthday');
  const [hostName, setHostName] = useState('');
  const [packs, setPacks] = useState<string[]>(QUIZ_PACKS.map((p) => p.id));
  const [own, setOwn] = useState<OwnQ[]>([]);
  const [prompts, setPrompts] = useState('');
  const [rounds, setRounds] = useState(8);
  const [prizes, setPrizes] = useState(3);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const g = new URLSearchParams(window.location.search).get('game');
    if (g && g in GAMES) setGame(g as GameType);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    const options = game === 'quiz' ? { packs, questions: own.map((q) => ({ ...q, options: q.options.filter((o) => o.trim()) })) }
      : game === 'most_likely' ? { rounds, prompts: prompts.split('\n') }
      : game === 'lucky_draw' ? { prizes } : {};
    try {
      const r = await post<{ code: string; hostToken: string }>('/api/game/rooms', { game, options, party_name: partyName, party_type: partyType, host_name: hostName });
      store.set('tambola-host-' + r.code, r.hostToken);
      // Started from a TV's QR (/play/tv/<id> → /play/host?tv=<id>): go back and send it straight to that TV.
      const tv = new URLSearchParams(window.location.search).get('tv');
      router.push(tv ? '/play/tv/' + encodeURIComponent(tv) : '/play/host/' + r.code);
    } catch (x: any) { setErr(x.message); setBusy(false); }
  }

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:ring-2 focus:ring-brand-500';
  const chip = (on: boolean) => 'rounded-full px-3 py-1.5 text-sm font-medium ' + (on ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200');
  const setQ = (i: number, patch: Partial<OwnQ>) => setOwn((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl bg-white p-6 shadow-lg">
      <div>
        <p className="block text-sm font-medium text-slate-700 mb-2">Game</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(GAMES) as GameType[]).map((g) => (
            <button type="button" key={g} onClick={() => setGame(g)} className={'rounded-xl border-2 p-3 text-left ' + (game === g ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300')}>
              <span className="text-2xl">{GAMES[g].emoji}</span>
              <span className="block font-semibold text-slate-900 text-sm mt-1">{GAMES[g].name}</span>
              <span className="block text-xs text-slate-500">{GAMES[g].short}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="block text-sm font-medium text-slate-700 mb-1">Type of party</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PARTY_TYPES) as PartyType[]).map((t) => <button type="button" key={t} onClick={() => setPartyType(t)} className={chip(partyType === t)}>{t === 'other' ? 'Other' : PARTY_TYPES[t]}</button>)}
        </div>
      </div>
      <div>
        <label htmlFor="party" className="block text-sm font-medium text-slate-700 mb-1">Party name (goes on the winners&apos; certificates)</label>
        <input id="party" value={partyName} onChange={(e) => setPartyName(e.target.value)} required maxLength={60} placeholder={partyType === 'anniversary' ? 'Neha & Rohit’s 10th Anniversary' : partyType === 'kitty' ? 'Sunday Kitty Club, October' : 'Riya’s 30th Birthday'} className={input} />
      </div>
      <div>
        <label htmlFor="host" className="block text-sm font-medium text-slate-700 mb-1">Host name</label>
        <input id="host" value={hostName} onChange={(e) => setHostName(e.target.value)} required maxLength={40} placeholder="Your name" className={input} />
      </div>

      {game === 'quiz' && (
        <div className="space-y-3 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Question packs (5 random questions from each)</p>
          <div className="flex flex-wrap gap-2">{QUIZ_PACKS.map((p) => <button type="button" key={p.id} onClick={() => setPacks((x) => (x.includes(p.id) ? x.filter((y) => y !== p.id) : [...x, p.id]))} className={chip(packs.includes(p.id))}>{p.name}</button>)}</div>
          <p className="text-sm font-medium text-slate-700 pt-2">Your own questions <span className="font-normal text-slate-500">(e.g. &quot;Where did Riya and Aman first meet?&quot;), asked first</span></p>
          {own.map((q, i) => (
            <div key={i} className="space-y-2 rounded-lg bg-white p-3 border border-slate-200">
              <div className="flex gap-2"><input value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} maxLength={140} placeholder={`Question ${i + 1}`} className={input + ' py-2'} /><button type="button" onClick={() => setOwn((qs) => qs.filter((_, j) => j !== i))} aria-label="Remove question" className="text-slate-400 hover:text-red-600"><Trash2 className="h-5 w-5" /></button></div>
              {q.options.map((o, k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="radio" name={'ans' + i} checked={q.answer === k} onChange={() => setQ(i, { answer: k })} title="Correct answer" />
                  <input value={o} onChange={(e) => setQ(i, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) })} maxLength={60} placeholder={`Answer ${'ABCD'[k]}${k < 2 ? '' : ' (optional)'}`} className="flex-1 rounded border border-slate-300 px-2 py-1.5" />
                </label>
              ))}
              <p className="text-xs text-slate-500">Tick the circle next to the right answer.</p>
            </div>
          ))}
          {own.length < 10 && <button type="button" onClick={() => setOwn((qs) => [...qs, blankQ()])} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><Plus className="h-4 w-4" />Add a question</button>}
        </div>
      )}

      {game === 'most_likely' && (
        <div className="space-y-3 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Number of questions</p>
          <div className="flex gap-2">{[5, 8, 12].map((n) => <button type="button" key={n} onClick={() => setRounds(n)} className={chip(rounds === n)}>{n}</button>)}</div>
          <label className="block text-sm font-medium text-slate-700">Your own questions (optional, one per line)</label>
          <textarea value={prompts} onChange={(e) => setPrompts(e.target.value)} rows={3} placeholder={'cut the cake before the birthday song\nsteal the DJ’s mic'} className={input} />
          <p className="text-xs text-slate-500">Each line becomes &quot;Who&apos;s most likely to &hellip;?&quot;. Keep it kind and fun.</p>
        </div>
      )}

      {game === 'lucky_draw' && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">How many prizes to draw?</p>
          <div className="flex gap-2">{[1, 2, 3].map((n) => <button type="button" key={n} onClick={() => setPrizes(n)} className={chip(prizes === n)}>{n}</button>)}</div>
        </div>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-orange-600 py-3 text-lg font-semibold text-white hover:bg-orange-700 disabled:opacity-60">{busy ? 'Starting…' : 'Create game and get the code'}</button>
      <p className="text-xs text-slate-500 text-center">Open this on the laptop or TV everyone can see. This screen becomes the host console.</p>
    </form>
  );
}
