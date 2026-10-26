'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useGame, store } from './useGame';
import HostConsole from './HostConsole';
import { DrawHost, LikelyHost, QuizHost } from './PartyGames';
import { TvBar, TvRemote } from './TvRemote';
import { remoteKey } from './tv';

/** The host's screen: only the device that started the game (it holds the host token). When a TV hosts, a remote. */
export default function HostRoom({ code }: { code: string }) {
  const { state, error, setState } = useGame(code);
  const [hostToken, setHostToken] = useState<string | null | undefined>(undefined);
  const [remote, setRemote] = useState(false);
  useEffect(() => {
    setHostToken(store.get<string>('tambola-host-' + code));
    setRemote(store.get<boolean>(remoteKey(code)) === true);
  }, [code]);
  const setRemoteMode = (on: boolean) => { store.set(remoteKey(code), on); setRemote(on); };

  if (error && !state) return <p className="text-center text-slate-700 py-10">{error}</p>;
  if (!state || hostToken === undefined) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;
  if (!hostToken) return (
    <div className="max-w-md mx-auto rounded-2xl bg-white p-6 text-center shadow">
      <p className="text-slate-700">This screen is not the host of game {code}. The host screen is the device that started the game.</p>
      <Link href={'/play/' + code} className="mt-4 inline-block font-semibold text-brand-600 underline">Join as a player instead</Link>
    </div>
  );
  if (remote) return <TvRemote code={code} state={state} hostToken={hostToken} setState={setState} onLeave={() => setRemoteMode(false)} />;
  const props = { code, state, hostToken, setState };
  return (
    <>
      {state.status !== 'ended' && <TvBar code={code} hostToken={hostToken} onRemote={() => setRemoteMode(true)} />}
      {state.game === 'quiz' ? <QuizHost {...props} />
        : state.game === 'most_likely' ? <LikelyHost {...props} />
          : state.game === 'lucky_draw' ? <DrawHost {...props} />
            : <HostConsole {...props} />}
    </>
  );
}
