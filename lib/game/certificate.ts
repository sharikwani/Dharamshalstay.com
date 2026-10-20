import { createClient } from '@supabase/supabase-js';
import type { PartyType } from './tambola';
import type { GameType, WinPrize } from './party';

/**
 * Winner certificate data. No Node-only imports: the certificate image renders on the edge runtime.
 * The coupon code itself is never part of it: certificates are shared publicly, and the code goes only
 * to the winner's email.
 */
export type Certificate = {
  id: string; place: number; prize: WinPrize; game: GameType; detail: string | null; name: string; photo: string | null;
  party_name: string; party_type: PartyType; host_name: string; date: string;
  /** Coupon value when one was issued (games with enough players), else null. */
  discount_amount: number | null; code_expires_at: string | null;
};

export async function certificate(winnerId: string): Promise<Certificate | null> {
  if (!/^[0-9a-f-]{36}$/i.test(winnerId)) return null;
  const { data } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }).from('game_winners')
    .select('id, place, prize, detail, discount_code, discount_amount, code_expires_at, created_at, game_players(name, photo), game_rooms(party_name, party_type, host_name, game)')
    .eq('id', winnerId).maybeSingle();
  if (!data) return null;
  const d: any = data;
  return {
    id: d.id, place: d.place, prize: d.prize, game: d.game_rooms?.game || 'tambola', detail: d.detail ?? null,
    name: d.game_players?.name || 'Winner', photo: d.game_players?.photo || null,
    party_name: d.game_rooms?.party_name || '', party_type: d.game_rooms?.party_type || 'other', host_name: d.game_rooms?.host_name || '',
    date: d.created_at, discount_amount: d.discount_code ? d.discount_amount : null, code_expires_at: d.discount_code ? d.code_expires_at : null,
  };
}
