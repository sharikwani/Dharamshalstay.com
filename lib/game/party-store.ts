import { randomInt } from 'crypto';
import { HttpError, serviceClient } from '@/lib/server-auth';
import { MOST_LIKELY_PROMPTS, QUIZ_PACKS, QUIZ_SECONDS, cleanPrompts, cleanQuestions, quizPoints, shuffle, type GameType, type QuizQuestion } from './party';
import type { Room } from './store';
import { addWinner } from './winners';

/**
 * Rounds for Party Quiz, Who's Most Likely To and Lucky Draw. Room state lives in game_rooms.state;
 * answers and votes in game_answers (one per player per round). The server decides scores and winners.
 */

type Phase = 'lobby' | 'question' | 'reveal' | 'ended';
const rand = () => randomInt(1_000_000) / 1_000_000;

export type LeaderRow = { player_id: string; name: string; points: number };
export type RoundView =
  | { kind: 'quiz'; phase: Phase; index: number; total: number; seconds: number; startedAt: number | null; answered: number;
      q?: string; options?: string[]; answer?: number; counts?: number[]; leaderboard?: LeaderRow[] }
  | { kind: 'most_likely'; phase: Phase; index: number; total: number; answered: number; prompt?: string; results?: { player_id: string; name: string; votes: number }[] }
  | { kind: 'lucky_draw'; prizes: number };

/** A new room's state from the host's options. */
export function initialState(game: GameType, options: unknown): Record<string, any> {
  const o: any = options && typeof options === 'object' ? options : {};
  if (game === 'quiz') {
    const packs = Array.isArray(o.packs) ? o.packs.map(String) : ['bollywood', 'india', 'himachal'];
    const own = cleanQuestions(o.questions);
    const fromPacks = QUIZ_PACKS.filter((p) => packs.includes(p.id)).flatMap((p) => shuffle(p.questions, rand).slice(0, 5));
    const questions = [...own, ...shuffle(fromPacks, rand)].slice(0, 20);
    if (!questions.length) throw new HttpError(400, 'Pick at least one question pack or add your own questions.');
    return { questions, index: -1, phase: 'lobby', started_at: null };
  }
  if (game === 'most_likely') {
    const own = cleanPrompts(o.prompts);
    const prompts = [...own, ...shuffle(MOST_LIKELY_PROMPTS, rand)].slice(0, Math.max(own.length, Math.min(20, Math.max(3, Number(o.rounds) || 8))));
    return { prompts, index: -1, phase: 'lobby' };
  }
  if (game === 'lucky_draw') return { prizes: Math.min(3, Math.max(1, Number(o.prizes) || 3)) };
  return {};
}

async function answersOf(roomId: string) {
  const { data } = await serviceClient().from('game_answers').select('player_id, round, answer, ms, points').eq('room_id', roomId);
  return data || [];
}
async function namesOf(roomId: string): Promise<Map<string, string>> {
  const { data } = await serviceClient().from('game_players').select('id, name').eq('room_id', roomId);
  return new Map((data || []).map((p: any) => [p.id, p.name]));
}

function leaderboard(answers: any[], names: Map<string, string>, limit = 10): LeaderRow[] {
  const total = new Map<string, { points: number; ms: number }>();
  for (const a of answers) {
    const t = total.get(a.player_id) || { points: 0, ms: 0 };
    t.points += a.points || 0; t.ms += a.ms || 0;
    total.set(a.player_id, t);
  }
  return Array.from(total.entries()).sort((a, b) => b[1].points - a[1].points || a[1].ms - b[1].ms)
    .slice(0, limit).map(([id, t]) => ({ player_id: id, name: names.get(id) || 'Player', points: t.points }));
}

function voteTally(answers: any[], round: number | null, names: Map<string, string>) {
  const c = new Map<string, number>();
  for (const a of answers) if (round === null || a.round === round) c.set(a.answer, (c.get(a.answer) || 0) + 1);
  return Array.from(c.entries()).sort((a, b) => b[1] - a[1]).map(([id, votes]) => ({ player_id: id, name: names.get(id) || 'Player', votes }));
}

/** The round as phones see it: no quiz answer until the reveal. */
export async function roundView(r: Room): Promise<RoundView | undefined> {
  const s = r.state || {};
  const ended = r.status === 'ended';
  if (r.game === 'lucky_draw') return { kind: 'lucky_draw', prizes: s.prizes || 3 };
  if (r.game === 'quiz') {
    const qs: QuizQuestion[] = s.questions || [];
    const phase: Phase = ended ? 'ended' : s.phase || 'lobby';
    const cur = qs[s.index];
    const answers = s.index >= 0 || ended ? await answersOf(r.id) : [];
    const now = answers.filter((a: any) => a.round === s.index);
    const view: RoundView = { kind: 'quiz', phase, index: s.index ?? -1, total: qs.length, seconds: QUIZ_SECONDS, startedAt: s.started_at ?? null, answered: now.length };
    if (cur && phase !== 'lobby') { view.q = cur.q; view.options = cur.options; }
    if (cur && (phase === 'reveal' || phase === 'ended')) {
      view.answer = cur.answer;
      view.counts = cur.options.map((_, i) => now.filter((a: any) => a.answer === String(i)).length);
    }
    if (phase === 'reveal' || phase === 'ended') view.leaderboard = leaderboard(answers, await namesOf(r.id));
    return view;
  }
  if (r.game === 'most_likely') {
    const ps: string[] = s.prompts || [];
    const phase: Phase = ended ? 'ended' : s.phase || 'lobby';
    const answers = s.index >= 0 ? await answersOf(r.id) : [];
    const view: RoundView = { kind: 'most_likely', phase, index: s.index ?? -1, total: ps.length, answered: answers.filter((a: any) => a.round === s.index).length };
    if (ps[s.index] && phase !== 'lobby') view.prompt = ps[s.index];
    if (phase === 'reveal') view.results = voteTally(answers, s.index, await namesOf(r.id)).slice(0, 5);
    if (phase === 'ended') view.results = voteTally(answers, null, await namesOf(r.id)).slice(0, 5);
    return view;
  }
  return undefined;
}

async function playerCount(roomId: string) {
  const { count } = await serviceClient().from('game_players').select('id', { count: 'exact', head: true }).eq('room_id', roomId);
  return count || 0;
}

/** Top 3 of a finished quiz or vote get certificates (and coupons when enough played). */
async function finish(r: Room) {
  const answers = await answersOf(r.id);
  const players = await playerCount(r.id);
  if (r.game === 'quiz') {
    const top = leaderboard(answers, new Map(), 3).filter((x) => x.points > 0);
    for (let i = 0; i < top.length; i++) await addWinner(r.id, top[i].player_id, 'quiz', i + 1, { players, detail: `${top[i].points.toLocaleString('en-IN')} points` });
  }
  if (r.game === 'most_likely') {
    const ps: string[] = r.state?.prompts || [];
    const top = voteTally(answers, null, new Map()).slice(0, 3);
    for (let i = 0; i < top.length; i++) {
      const t = top[i];
      // Their funniest title: the question they got the most votes on.
      const mine = answers.filter((a: any) => a.answer === t.player_id);
      const byRound = new Map<number, number>();
      mine.forEach((a: any) => byRound.set(a.round, (byRound.get(a.round) || 0) + 1));
      const best = Array.from(byRound.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
      await addWinner(r.id, t.player_id, 'most_likely', i + 1, { players, detail: best !== undefined && ps[best] ? `Voted most likely to ${ps[best]}` : `${t.votes} votes` });
    }
  }
}

/** Host's "Next": lobby -> question 1 -> reveal -> question 2 ... -> ended (winners). */
export async function advance(r: Room): Promise<Room> {
  if (r.game !== 'quiz' && r.game !== 'most_likely') throw new HttpError(400, 'This game has no rounds.');
  if (r.status === 'ended') return r;
  const s = { ...(r.state || {}) };
  const total = (r.game === 'quiz' ? s.questions : s.prompts)?.length || 0;
  let status: Room['status'] = 'live';
  if (s.phase === 'lobby' || s.phase === undefined) { s.index = 0; s.phase = 'question'; s.started_at = Date.now(); }
  else if (s.phase === 'question') { s.phase = 'reveal'; }
  else if (s.phase === 'reveal' && s.index + 1 < total) { s.index += 1; s.phase = 'question'; s.started_at = Date.now(); }
  else { s.phase = 'ended'; status = 'ended'; }
  const now = new Date().toISOString();
  // Only if nobody else moved the game on in between (two taps call one step).
  const { data, error } = await serviceClient().from('game_rooms')
    .update({ state: s, status, updated_at: now, ...(status === 'ended' ? { ended_at: now } : {}), ...(r.status === 'lobby' ? { started_at: now } : {}) })
    .eq('id', r.id).eq('updated_at', r.updated_at).select('id').maybeSingle();
  if (error) throw new HttpError(500, 'Could not move the game on. Please try again.');
  if (!data) return r;
  const next = { ...r, state: s, status, updated_at: now };
  if (status === 'ended') await finish(next);
  return next;
}

/** A quiz answer (option index) or a Most Likely vote (player id). One per round; points decided here. */
export async function answer(r: Room, playerId: string, value: unknown): Promise<'ok' | 'already' | 'closed'> {
  const s = r.state || {};
  if (r.status === 'ended' || s.phase !== 'question') return 'closed';
  let row: { answer: string; ms: number | null; points: number };
  if (r.game === 'quiz') {
    const q: QuizQuestion | undefined = s.questions?.[s.index];
    const choice = Number(value);
    if (!q || !Number.isInteger(choice) || choice < 0 || choice >= q.options.length) throw new HttpError(400, 'Pick one of the answers.');
    const ms = Date.now() - Number(s.started_at || Date.now());
    if (ms > QUIZ_SECONDS * 1000 + 1500) return 'closed';
    row = { answer: String(choice), ms, points: quizPoints(choice === q.answer, ms) };
  } else if (r.game === 'most_likely') {
    const target = String(value || '');
    const { data: p } = await serviceClient().from('game_players').select('id').eq('room_id', r.id).eq('id', target).maybeSingle();
    if (!p) throw new HttpError(400, 'Pick one of the players.');
    row = { answer: target, ms: null, points: 0 };
  } else throw new HttpError(400, 'This game has no answers.');
  const { error } = await serviceClient().from('game_answers').insert({ room_id: r.id, player_id: playerId, round: s.index, ...row });
  if (error?.code === '23505') return 'already';
  if (error) throw new HttpError(500, 'Could not save your answer. Please try again.');
  return 'ok';
}

/** Lucky Draw: pick a random player who has not won yet. */
export async function spin(r: Room): Promise<string | null> {
  if (r.game !== 'lucky_draw') throw new HttpError(400, 'Only the Lucky Draw spins.');
  if (r.status === 'ended') return null;
  const sb = serviceClient();
  const [{ data: players }, { data: won }] = await Promise.all([
    sb.from('game_players').select('id').eq('room_id', r.id),
    sb.from('game_winners').select('player_id, place').eq('room_id', r.id),
  ]);
  const prizes = r.state?.prizes || 3;
  const taken = new Set((won || []).map((w: any) => w.player_id));
  const pool = (players || []).filter((p: any) => !taken.has(p.id));
  if (!pool.length) throw new HttpError(409, 'Everyone has already won!');
  const place = (won || []).length + 1;
  if (place > prizes) return null;
  const pick = pool[randomInt(pool.length)];
  const id = await addWinner(r.id, pick.id, 'lucky_draw', place, { players: (players || []).length });
  if (id === 'taken') return null;
  const now = new Date().toISOString();
  await sb.from('game_rooms').update({ status: place >= prizes ? 'ended' : 'live', updated_at: now, ...(place >= prizes ? { ended_at: now } : {}) }).eq('id', r.id);
  return id;
}
