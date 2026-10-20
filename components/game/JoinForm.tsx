'use client';
import { useRef, useState } from 'react';
import { Camera, Lock } from 'lucide-react';
import { post, store } from './useGame';
import type { Ticket } from '@/lib/game/tambola';
import { GAMES, type GameType } from '@/lib/game/party';

export type Me = { playerId: string; token: string; ticket: Ticket; name: string };

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

export const playerKey = (code: string) => 'tambola-player-' + code;

export default function JoinForm({ code, party, game, onJoined }: { code: string; party: string; game: GameType; onJoined: (m: Me) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const me = await post<Me>(`/api/game/${code}/join`, { name, photo, email, phone, consent });
      store.set(playerKey(code), me);
      onJoined(me);
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:ring-2 focus:ring-brand-500';
  return (
    <form onSubmit={submit} className="max-w-sm mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-3">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">{GAMES[game].emoji} {GAMES[game].name} · game {code}</p>
        <h1 className="text-2xl font-heading font-bold text-slate-900 mt-1">{party}</h1>
      </div>
      <button type="button" onClick={() => file.current?.click()} className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-dashed border-brand-200 bg-brand-50 text-brand-700">
        {photo ? <img src={photo} alt="Your photo" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center text-xs font-medium"><Camera className="h-7 w-7 mb-1" />Add photo</span>}
      </button>
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { setPhoto(await shrink(f)); } catch { setErr('Could not read that photo.'); } } }} />
      <p className="text-center text-xs text-slate-500">Your photo goes on your winner certificate{game === 'lucky_draw' ? ' and the draw' : ''}.</p>
      <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={30} placeholder="Your name" autoComplete="name" className={input} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email (your coupon is sent here if you win)" autoComplete="email" className={input} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" inputMode="tel" placeholder="Mobile number" autoComplete="tel" className={input} />
      <p className="flex gap-1.5 text-xs text-slate-500"><Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />Never shown to other players. Winners get a Dharamshala Stay discount coupon by email.</p>
      <label className="flex items-start gap-2 text-xs text-slate-600 leading-snug">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
        <span>Email me travel ideas and offers from Dharamshala Stay (at most once a week). Unsubscribe any time.</span>
      </label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-orange-600 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60">{busy ? 'Joining…' : game === 'tambola' ? 'Get my ticket' : 'Join the game'}</button>
      <p className="text-center text-[11px] text-slate-400">By joining you agree to our <a href="/privacy" className="underline">privacy policy</a>.</p>
    </form>
  );
}
