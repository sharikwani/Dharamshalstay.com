import { createHash, randomBytes, randomInt } from 'crypto';
import sharp from 'sharp';
import { HttpError, serviceClient } from '@/lib/server-auth';
import {
  PARTY_TYPES, PRIZES, generateTicket, makeRoomCode, nextNumber, ticketKey, wins,
  type PartyType, type Prize, type Ticket,
} from './tambola';
import { GAMES, type GameType, type WinPrize } from './party';
import { advance, answer, initialState, roundView, spin, type RoundView } from './party-store';
import { addWinner } from './winners';
import { normEmail, upsertContact } from '@/lib/email/contacts';

/** Shown next to the "send me offers" box; stored with the contact as proof of consent. */
export const GAME_CONSENT_TEXT = 'Email me travel ideas and offers from Dharamshala Stay (at most once a week). Unsubscribe any time.';

/**
 * Tambola rooms on the server. The host and each player hold a secret token (only its hash is stored);
 * every number and claim is decided here, then broadcast to the room's phones over Supabase Realtime.
 */

export const MAX_PLAYERS = 1000;
export const ROOMS_PER_IP_PER_HOUR = 10;
/** Rooms stop accepting calls and claims a day after they were made. */
const ROOM_LIFETIME_MS = 24 * 3600e3;

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const token = () => randomBytes(24).toString('base64url');

export type PublicWinner = { id: string; prize: WinPrize; place: number; name: string; player_id: string; at_call: number; detail: string | null };
export type PublicState = {
  code: string; game: GameType; party_name: string; party_type: PartyType; host_name: string;
  status: 'lobby' | 'live' | 'ended'; called: number[]; players: number; winners: PublicWinner[];
  /** Quiz, Most Likely and Lucky Draw: the current round as phones may see it. */
  round?: RoundView;
};

export type Room = {
  id: string; code: string; game: GameType; party_name: string; party_type: PartyType; host_name: string; host_token_hash: string;
  status: PublicState['status']; called: number[]; state: Record<string, any>; created_at: string; updated_at: string;
};


export function channelName(code: string) { return 'game:' + code; }

/** Tell every phone in the room. Fire-and-forget: phones also re-read the state on their own. */
export async function broadcast(code: string, state: PublicState): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    await fetch(url + '/realtime/v1/api/broadcast', {
      method: 'POST', signal: AbortSignal.timeout(5000),
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ topic: channelName(code), event: 'state', payload: state }] }),
    });
  } catch (e) { console.error('Game broadcast failed:', e); }
}

export async function loadRoom(code: string): Promise<Room> {
  if (!/^\d{6}$/.test(code)) throw new HttpError(404, 'No game with that code. Check the 6 digits on the host screen.');
  const { data, error } = await serviceClient().from('game_rooms')
    .select('id, code, game, party_name, party_type, host_name, host_token_hash, status, called, state, created_at, updated_at').eq('code', code).maybeSingle();
  if (error) throw new HttpError(500, 'Could not load the game. Please try again.');
  if (!data) throw new HttpError(404, 'No game with that code. Check the 6 digits on the host screen.');
  return data as Room;
}

export const expired = (r: Room) => Date.now() - new Date(r.created_at).getTime() > ROOM_LIFETIME_MS;

export async function publicState(code: string, room?: Room): Promise<PublicState> {
  const r = room ?? (await loadRoom(code));
  const sb = serviceClient();
  const [{ count }, { data: won }] = await Promise.all([
    sb.from('game_players').select('id', { count: 'exact', head: true }).eq('room_id', r.id),
    sb.from('game_winners').select('id, prize, place, at_call, player_id, detail, game_players(name)').eq('room_id', r.id).order('place'),
  ]);
  const round = r.game && r.game !== 'tambola' ? await roundView(r) : undefined;
  return {
    code: r.code, game: r.game || 'tambola', round, party_name: r.party_name, party_type: r.party_type, host_name: r.host_name,
    status: r.status === 'ended' || expired(r) ? 'ended' : r.status, called: r.called || [], players: count || 0,
    winners: (won || []).map((w: any) => ({ id: w.id, prize: w.prize, place: w.place, at_call: w.at_call, player_id: w.player_id, detail: w.detail ?? null, name: w.game_players?.name || 'Player' })),
  };
}

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

export async function createRoom(input: { party_name: unknown; party_type: unknown; host_name: unknown; game?: unknown; options?: unknown }, ipHash: string) {
  const party_name = clean(input.party_name, 60);
  const host_name = clean(input.host_name, 40);
  const party_type = String(input.party_type) as PartyType;
  if (party_name.length < 2) throw new HttpError(400, 'Please give the party a name, for example "Riya’s 30th Birthday".');
  if (!host_name) throw new HttpError(400, 'Please enter the host’s name.');
  if (!(party_type in PARTY_TYPES)) throw new HttpError(400, 'Please choose the type of party.');
  const game = (String(input.game || 'tambola') as GameType);
  if (!(game in GAMES)) throw new HttpError(400, 'Please choose a game.');
  const state = initialState(game, input.options);
  const sb = serviceClient();
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await sb.from('game_rooms').select('id', { count: 'exact', head: true }).eq('creator_ip_hash', ipHash).gte('created_at', since);
  if ((count || 0) >= ROOMS_PER_IP_PER_HOUR) throw new HttpError(429, 'Too many games started from here in the last hour. Please try again later.');
  const hostToken = token();
  for (let i = 0; i < 8; i++) {
    const code = makeRoomCode(randomInt);
    const { error } = await sb.from('game_rooms').insert({ code, game, state, party_name, party_type, host_name, host_token_hash: sha(hostToken), creator_ip_hash: ipHash });
    if (!error) return { code, hostToken };
    if (error.code !== '23505') { console.error('Game room insert failed:', error); break; }
  }
  throw new HttpError(500, 'Could not start the game. Please try again.');
}

export function requireHost(r: Room, hostToken: unknown) {
  if (typeof hostToken !== 'string' || sha(hostToken) !== r.host_token_hash) throw new HttpError(403, 'Only the host screen can do this.');
}

/** Shrink and re-encode a phone photo (any image) to a small square JPEG data URL, or null. */
export async function cleanPhoto(dataUrl: unknown): Promise<string | null> {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null;
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  if (b64.length > 4_000_000) throw new HttpError(413, 'That photo is too big. Please choose a smaller one.');
  try {
    const out = await sharp(Buffer.from(b64, 'base64'), { limitInputPixels: 40_000_000 }).rotate().resize(192, 192, { fit: 'cover' }).jpeg({ quality: 72 }).toBuffer();
    return 'data:image/jpeg;base64,' + out.toString('base64');
  } catch { throw new HttpError(400, 'We could not read that photo. Please try another one.'); }
}

export async function joinRoom(code: string, input: { name: unknown; photo: unknown; email?: unknown; phone?: unknown; consent?: unknown }) {
  const r = await loadRoom(code);
  if (r.status === 'ended' || expired(r)) throw new HttpError(410, 'This game has finished.');
  const name = clean(input.name, 30);
  if (!name) throw new HttpError(400, 'Please enter your name.');
  // The winner's coupon is sent to these; they are never shown to other players.
  const email = normEmail(String(input.email ?? ''));
  const phone = String(input.phone ?? '').replace(/[^\d+]/g, '');
  if (!email) throw new HttpError(400, 'Please enter your email, so we can send your coupon if you win.');
  if (phone.replace(/\D/g, '').length < 10) throw new HttpError(400, 'Please enter your mobile number.');
  const consent = input.consent === true;
  const photo = await cleanPhoto(input.photo);
  const sb = serviceClient();
  const { count } = await sb.from('game_players').select('id', { count: 'exact', head: true }).eq('room_id', r.id);
  if ((count || 0) >= MAX_PLAYERS) throw new HttpError(409, 'This game is full.');
  const playerToken = token();
  for (let i = 0; i < 12; i++) {
    // Only tambola has tickets; other games store an empty one with a unique key.
    const ticket = r.game === 'tambola' || !r.game ? generateTicket(() => randomInt(1_000_000) / 1_000_000) : [];
    const key = ticket.length ? ticketKey(ticket) : 'p-' + token();
    const { data, error } = await sb.from('game_players')
      .insert({ room_id: r.id, name, photo, email, phone, marketing_consent: consent, ticket, ticket_key: key, player_token_hash: sha(playerToken) }).select('id').single();
    if (!error && data) {
      upsertContact({ email, phone, name, source: 'website', interests: ['party-games'], ...(consent ? { consent: { text: GAME_CONSENT_TEXT, source: 'party-game-join' } } : {}) }).catch(() => null);
      broadcast(code, await publicState(code, r)).catch(() => {});
      return { playerId: data.id as string, token: playerToken, ticket, name };
    }
    if (error?.code !== '23505') { console.error('Game join failed:', error); break; }
  }
  throw new HttpError(500, 'Could not join the game. Please try again.');
}

/** The host calls the next number. Two quick taps call one number, not two. */
export async function callNumber(code: string, hostToken: unknown): Promise<PublicState> {
  const r = await loadRoom(code);
  requireHost(r, hostToken);
  if (r.status === 'ended' || expired(r)) throw new HttpError(410, 'This game has finished.');
  const called = r.called || [];
  const n = nextNumber(called, () => randomInt(1_000_000) / 1_000_000);
  if (n === null) return endRoom(code, hostToken);
  const { data, error } = await serviceClient().rpc('game_call_number', { p_room: r.id, p_expected_count: called.length, p_number: n });
  if (error) { console.error('Game call failed:', error); throw new HttpError(500, 'Could not call the number. Please try again.'); }
  const state = await publicState(code, { ...r, status: 'live', called: Array.isArray(data) && data.length ? data : called });
  await broadcast(code, state);
  return state;
}

export async function endRoom(code: string, hostToken: unknown): Promise<PublicState> {
  const r = await loadRoom(code);
  requireHost(r, hostToken);
  await serviceClient().from('game_rooms').update({ status: 'ended', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', r.id);
  const state = await publicState(code, { ...r, status: 'ended' });
  await broadcast(code, state);
  return state;
}

/** Host lobby: who has joined (newest first, with photos). */
export async function roomPlayers(code: string, hostToken: unknown, limit = 80) {
  const r = await loadRoom(code);
  requireHost(r, hostToken);
  const { data } = await serviceClient().from('game_players').select('id, name, photo').eq('room_id', r.id).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

export type ClaimResult = { result: 'won'; winnerId: string; place: number } | { result: 'not_yet' | 'taken' | 'ended' };

export async function claim(code: string, playerToken: unknown, prize: unknown): Promise<ClaimResult> {
  if (typeof prize !== 'string' || !(prize in PRIZES)) throw new HttpError(400, 'Unknown prize.');
  if (typeof playerToken !== 'string' || !playerToken) throw new HttpError(403, 'Please join the game first.');
  const p = prize as Prize;
  const r = await loadRoom(code);
  if (r.status === 'ended' || expired(r)) return { result: 'ended' };
  const sb = serviceClient();
  const { data: player } = await sb.from('game_players').select('id, ticket').eq('room_id', r.id).eq('player_token_hash', sha(playerToken)).maybeSingle();
  if (!player) throw new HttpError(403, 'Please join the game first.');
  if (!wins(player.ticket as Ticket, r.called || [], p)) return { result: 'not_yet' };
  const { place } = PRIZES[p];
  const { count } = await sb.from('game_players').select('id', { count: 'exact', head: true }).eq('room_id', r.id);
  const won = await addWinner(r.id, player.id, p, place, { players: count || 0, atCall: (r.called || []).length });
  if (won === 'taken') return { result: 'taken' };
  let room = r;
  if (p === 'full_house') {
    await sb.from('game_rooms').update({ status: 'ended', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', r.id);
    room = { ...r, status: 'ended' };
  }
  await broadcast(code, await publicState(code, room));
  return { result: 'won', winnerId: won, place };
}

/* ---------------------------------------------------------------- Quiz, Most Likely, Lucky Draw */

/** Host's "Next" in Quiz / Most Likely. */
export async function nextRound(code: string, hostToken: unknown): Promise<PublicState> {
  const r = await loadRoom(code);
  requireHost(r, hostToken);
  if (expired(r)) throw new HttpError(410, 'This game has finished.');
  const next = await advance(r);
  const state = await publicState(code, next);
  await broadcast(code, state);
  return state;
}

/** A player's quiz answer or Most Likely vote. */
export async function submitAnswer(code: string, playerToken: unknown, value: unknown): Promise<{ result: 'ok' | 'already' | 'closed' }> {
  if (typeof playerToken !== 'string' || !playerToken) throw new HttpError(403, 'Please join the game first.');
  const r = await loadRoom(code);
  const { data: player } = await serviceClient().from('game_players').select('id').eq('room_id', r.id).eq('player_token_hash', sha(playerToken)).maybeSingle();
  if (!player) throw new HttpError(403, 'Please join the game first.');
  const result = await answer(r, player.id, value);
  // The host screen shows how many have answered.
  if (result === 'ok') publicState(code, r).then((s) => broadcast(code, s)).catch(() => {});
  return { result };
}

/** Lucky Draw: the host spins. */
export async function spinDraw(code: string, hostToken: unknown): Promise<PublicState> {
  const r = await loadRoom(code);
  requireHost(r, hostToken);
  if (expired(r)) throw new HttpError(410, 'This game has finished.');
  await spin(r);
  const state = await publicState(code);
  await broadcast(code, state);
  return state;
}

/** Names and photos of everyone in the room (for voting and the Lucky Draw reel). Never emails or phones. */
export async function publicPlayers(code: string, limit = 300) {
  const r = await loadRoom(code);
  const { data } = await serviceClient().from('game_players').select('id, name, photo').eq('room_id', r.id).order('created_at').limit(limit);
  return data || [];
}
