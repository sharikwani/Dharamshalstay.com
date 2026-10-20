import { randomInt } from 'crypto';
import { serviceClient } from '@/lib/server-auth';
import { inBackground } from '@/lib/background';
import { deliver } from '@/lib/email/send';
import type { EmailDoc } from '@/lib/email/layout';
import { siteConfig } from '@/lib/config';
import { CODE_MIN_BOOKING, CODE_VALID_DAYS, PRIZES, makePrizeCode, placeLabel, type Prize } from './tambola';
import { prizeLabel, type WinPrize } from './party';

/** Discount codes only for games with at least this many players (a game played alone should not mint codes). */
export const MIN_PLAYERS_FOR_CODES = 5;
/** Coupon values for 1st, 2nd and 3rd place in Quiz, Lucky Draw and Most Likely (tambola uses PRIZES). */
export const PLACE_AMOUNTS = [300, 200, 100];

export type { WinPrize };
export const prizeAmount = (prize: WinPrize, place: number) => (prize in PRIZES ? PRIZES[prize as Prize].amount : PLACE_AMOUNTS[place - 1] || PLACE_AMOUNTS[2]);

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

/** Email the winner their coupon (transactional: they entered their email to receive it). Never throws. */
async function sendCoupon(winnerId: string) {
  const sb = serviceClient();
  const { data: w } = await sb.from('game_winners')
    .select('id, prize, place, discount_code, discount_amount, code_expires_at, code_sent_at, game_players(name, email), game_rooms(party_name)')
    .eq('id', winnerId).maybeSingle();
  const x: any = w;
  if (!x?.discount_code || x.code_sent_at || !x.game_players?.email) return;
  const first = String(x.game_players.name || '').split(' ')[0] || 'there';
  const cert = `${siteConfig.url}/play/certificate/${x.id}`;
  const doc: EmailDoc = {
    kicker: 'You won!', heading: `Congratulations ${first}! Rs ${x.discount_amount} off is yours`,
    preheader: `Your ${placeLabel(x.place)} prize coupon from ${x.game_rooms?.party_name || 'the party'}.`,
    blocks: [
      { type: 'p', text: `You won ${placeLabel(x.place)} prize (${prizeLabel(x.prize)}) at ${x.game_rooms?.party_name || 'the party'}. Here is your Dharamshala Stay coupon.` },
      { type: 'details', title: 'Your coupon', rows: [['Code', x.discount_code], ['Discount', `Rs ${x.discount_amount} off`], ['Use on', `A hotel stay, trek, taxi or paragliding booked with Dharamshala Stay worth Rs ${CODE_MIN_BOOKING.toLocaleString('en-IN')} or more`], ['Valid till', day(x.code_expires_at)], ['Uses', 'One']] },
      { type: 'callout', tone: 'success', title: 'How to use it', text: 'Send the code to us on WhatsApp, or write it in your booking enquiry, and we take it off your price.' },
      { type: 'button', label: 'Use it on WhatsApp', href: `https://wa.me/${siteConfig.whatsapp}?text=` + encodeURIComponent('Hi, I want to use my party game coupon ' + x.discount_code), secondary: { label: 'See your certificate', href: cert } },
      { type: 'small', text: 'You are getting this because you entered your email to receive the prize when you joined the game.' },
    ],
    footer: { kind: 'transactional' },
  };
  const r = await deliver({ to: x.game_players.email, subject: `Your Rs ${x.discount_amount} Dharamshala Stay coupon (${placeLabel(x.place)} prize)`, doc, kind: 'transactional', template: 'game_prize' });
  if (r.ok) await sb.from('game_winners').update({ code_sent_at: new Date().toISOString() }).eq('id', winnerId);
}

/**
 * Record a winner. The coupon is made only when the game has enough players, and emailed to the winner.
 * Returns the winner id, or 'taken' when that prize and place already has a winner.
 */
export async function addWinner(roomId: string, playerId: string, prize: WinPrize, place: number, opts: { players: number; atCall?: number; detail?: string | null }): Promise<string | 'taken'> {
  const sb = serviceClient();
  const withCode = opts.players >= MIN_PLAYERS_FOR_CODES;
  for (let i = 0; i < 5; i++) {
    const { data, error } = await sb.from('game_winners').insert({
      room_id: roomId, player_id: playerId, prize, place, at_call: opts.atCall ?? 0, detail: opts.detail ?? null,
      ...(withCode ? {
        discount_code: makePrizeCode(randomInt), discount_amount: prizeAmount(prize, place),
        code_expires_at: new Date(Date.now() + CODE_VALID_DAYS * 86400e3).toISOString(),
      } : {}),
    }).select('id').single();
    if (!error && data) {
      if (withCode) inBackground('Game coupon email', () => sendCoupon(data.id));
      return data.id as string;
    }
    // The prize was won first by someone else; a clash on the random coupon code just retries.
    if (error?.code === '23505' && !/discount_code/.test(error.message + (error.details || ''))) return 'taken';
    if (error?.code !== '23505') { console.error('Game winner insert failed:', error); break; }
  }
  throw new Error('Could not record the winner');
}
