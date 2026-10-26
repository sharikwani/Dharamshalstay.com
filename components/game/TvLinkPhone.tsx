'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Tv } from 'lucide-react';
import { store } from './useGame';
import { hostedGames, normPairId, remoteKey, sendToTv, showPairId, type TvLink } from './tv';
import { GAMES } from '@/lib/game/party';
import type { PublicState } from '@/lib/game/store';

type Hosted = TvLink & { state: PublicState };

/** /play/tv/<pairId> on the host's phone (opened by scanning the TV's QR): pick the game and send it to the TV. */
export function TvLinkPhone({ pairId }: { pairId: string }) {
  const router = useRouter();
  const [games, setGames] = useState<Hosted[] | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const id = normPairId(pairId);

  useEffect(() => {
    (async () => {
      const list = await Promise.all(hostedGames().map(async (g) => {
        try {
          const r = await fetch('/api/game/' + g.code, { cache: 'no-store' });
          return r.ok ? { ...g, state: (await r.json()) as PublicState } : null;
        } catch { return null; }
      }));
      setGames(list.filter((g): g is Hosted => !!g && g.state.status !== 'ended'));
    })();
  }, []);

  async function send(g: Hosted) {
    setBusy(g.code); setErr('');
    const ok = await sendToTv(id, { code: g.code, hostToken: g.hostToken });
    setBusy('');
    if (!ok) { setErr('The TV did not answer. Check the TV still shows the QR code (open dharamshalastay.com/tv on it) and try again.'); return; }
    store.set(remoteKey(g.code), true);
    router.push('/play/host/' + g.code);
  }

  if (id.length !== 8) return <TvCodeForm />;
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900"><Tv className="h-6 w-6 text-brand-700" />Show on the TV</h1>
      <p className="text-slate-600">TV code <strong className="tracking-widest">{showPairId(id)}</strong>. Choose the game to put on the TV; this phone becomes the remote.</p>
      {games === null && <Loader2 className="h-6 w-6 animate-spin text-brand-600" />}
      {games?.map((g) => (
        <button key={g.code} onClick={() => send(g)} disabled={!!busy}
          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-4 text-left shadow ring-1 ring-slate-200 hover:ring-brand-500 disabled:opacity-60">
          <span>
            <span className="block font-semibold text-slate-900">{GAMES[g.state.game].emoji} {g.state.party_name}</span>
            <span className="text-sm text-slate-500">{GAMES[g.state.game].name} · game {g.code} · {g.state.players} players</span>
          </span>
          <span className="shrink-0 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white">{busy === g.code ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Show on this TV'}</span>
        </button>
      ))}
      {games && !games.length && (
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-slate-700">This phone has not started a game yet. Start one; it goes to the TV as soon as it is ready.</p>
          <Link href={'/play/host?tv=' + id} className="mt-4 inline-block rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white">Start a game</Link>
        </div>
      )}
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}

/** /play/tv: for phones without a camera, type the code shown on the TV. */
export function TvCodeForm() {
  const router = useRouter();
  const [v, setV] = useState('');
  const id = normPairId(v);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (id.length === 8) router.push('/play/tv/' + id); }} className="mx-auto max-w-md space-y-4">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900"><Tv className="h-6 w-6 text-brand-700" />Connect your TV</h1>
      <p className="text-slate-600">On the TV, open <strong>dharamshalastay.com/tv</strong>. It shows a QR code and an 8-letter code. Scan the QR, or type the code here.</p>
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="ABCD-2345" autoCapitalize="characters" autoComplete="off"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-2xl tracking-widest outline-none focus:ring-2 focus:ring-brand-500" />
      <button disabled={id.length !== 8} className="w-full rounded-xl bg-orange-600 px-6 py-3 text-lg font-semibold text-white disabled:opacity-50">Continue</button>
    </form>
  );
}
