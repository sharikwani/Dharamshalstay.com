'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useGame, store } from './useGame';
import HostConsole from './HostConsole';
import { DrawHost, LikelyHost, QuizHost } from './PartyGames';

/** The host's TV/laptop: only the device that started the game (it holds the host token). */
export default function HostRoom({ code }: { code: string }) {
  const { state, error, setState } = useGame(code);
  const [hostToken, setHostToken] = useState<string | null | undefined>(undefined);
  useEffect(() => { setHostToken(store.get<string>('tambola-host-' + code)); }, [code]);

  if (error && !state) return <p className="text-center text-slate-700 py-10">{error}</p>;
  if (!state || hostToken === undefined) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;
  if (!hostToken) return (
    <div className="max-w-md mx-auto rounded-2xl bg-white p-6 text-center shadow">
      <p className="text-slate-700">This screen is not the host of game {code}. The host screen is the device that started the game.</p>
      <Link href={'/play/' + code} className="mt-4 inline-block font-semibold text-brand-600 underline">Join as a player instead</Link>
    </div>
  );
  if (state.game === 'quiz') return <QuizHost code={code} state={state} hostToken={hostToken} setState={setState} />;
  if (state.game === 'most_likely') return <LikelyHost code={code} state={state} hostToken={hostToken} setState={setState} />;
  if (state.game === 'lucky_draw') return <DrawHost code={code} state={state} hostToken={hostToken} setState={setState} />;
  return <HostConsole code={code} state={state} hostToken={hostToken} setState={setState} />;
}
