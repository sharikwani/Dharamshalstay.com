'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Smartphone, Tv } from 'lucide-react';
import { store } from './useGame';
import { hostKey, listenForCaster, listenForPhone, newPairId, showPairId } from './tv';

const SITE = 'https://www.dharamshalastay.com';

/** /tv on the TV's browser: a QR that the host scans with their phone to put the game on this screen. */
export default function TvPairScreen() {
  const router = useRouter();
  const [pairId, setPairId] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    const id = newPairId();
    setPairId(id);
    const go = (code: string, hostToken: string) => {
      setLinking(true);
      store.set(hostKey(code), hostToken);
      router.replace('/tv/' + code);
    };
    listenForCaster((l) => go(l.code, l.hostToken));
    return listenForPhone(id, (l) => go(l.code, l.hostToken));
  }, [router]);

  const link = SITE + '/play/tv/' + pairId;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-950 px-6 py-10 text-white">
      <p className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-orange-300"><Tv className="h-5 w-5" />Dharamshala Stay party games</p>
      <h1 className="mt-3 text-center font-heading text-4xl font-bold sm:text-5xl">Put your game on this TV</h1>
      {linking ? (
        <p className="mt-10 flex items-center gap-3 text-2xl"><Loader2 className="h-8 w-8 animate-spin" />Connecting…</p>
      ) : (
        <div className="mt-10 grid items-center gap-10 md:grid-cols-[auto_1fr]">
          {pairId
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={'/api/qr?u=' + encodeURIComponent(link)} alt="QR code to connect your phone to this TV" className="mx-auto h-64 w-64 rounded-3xl bg-white p-4" />
            : <div className="mx-auto h-64 w-64 rounded-3xl bg-white/10" />}
          <ol className="max-w-xl space-y-5 text-xl">
            <li className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold">1</span><span>On your phone, start a game at <strong>dharamshalastay.com/play</strong> (or use one you already started).</span></li>
            <li className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold">2</span><span>Scan this QR with <strong>the same phone</strong>, and tap <strong>Show on this TV</strong>.</span></li>
            <li className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold">3</span><span>The TV runs the game and calls it out loud. Your phone becomes the remote.</span></li>
            <li className="flex gap-3 text-base text-brand-200"><Smartphone className="mt-1 h-5 w-5 shrink-0" /><span>No camera? On the phone open <strong className="text-white">dharamshalastay.com/play/tv</strong> and type <strong className="text-2xl tracking-widest text-orange-300">{pairId ? showPairId(pairId) : '…'}</strong></span></li>
          </ol>
        </div>
      )}
    </div>
  );
}
