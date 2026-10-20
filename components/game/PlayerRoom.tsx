'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useGame, store } from './useGame';
import JoinForm, { playerKey, type Me } from './JoinForm';
import PlayerGame from './PlayerGame';
import { DrawPlayer, LikelyPlayer, QuizPlayer } from './PartyGames';

/** A player's phone: load the room, join it, then show the right game. */
export default function PlayerRoom({ code }: { code: string }) {
  const { state, error } = useGame(code);
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setMe(store.get<Me>(playerKey(code))); setReady(true); }, [code]);

  const box = (text: string, link = 'Try another code') => <div className="max-w-sm mx-auto rounded-2xl bg-white p-6 text-center shadow"><p className="text-slate-700">{text}</p><Link href="/play" className="mt-4 inline-block text-brand-600 underline">{link}</Link></div>;
  if (error && !state) return box(error);
  if (!state || !ready) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;
  if (!me) return state.status === 'ended' ? box('This game has finished.', 'Join another game') : <JoinForm code={code} party={state.party_name} game={state.game} onJoined={setMe} />;
  if (state.game === 'quiz') return <QuizPlayer code={code} state={state} me={me} />;
  if (state.game === 'most_likely') return <LikelyPlayer code={code} state={state} me={me} />;
  if (state.game === 'lucky_draw') return <DrawPlayer state={state} me={me} />;
  return <PlayerGame code={code} state={state} me={me} />;
}
