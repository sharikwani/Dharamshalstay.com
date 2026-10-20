import { createClient } from '@supabase/supabase-js';
import type { PartyType, Prize } from './tambola';

/** Winner certificate data. No Node-only imports: the certificate image renders on the edge runtime. */
export type Certificate = {
  id: string; place: number; prize: Prize; name: string; photo: string | null; party_name: string; party_type: PartyType;
  host_name: string; date: string; discount_code: string; discount_amount: number; code_expires_at: string;
};

export async function certificate(winnerId: string): Promise<Certificate | null> {
  if (!/^[0-9a-f-]{36}$/i.test(winnerId)) return null;
  const { data } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }).from('game_winners')
    .select('id, place, prize, discount_code, discount_amount, code_expires_at, created_at, game_players(name, photo), game_rooms(party_name, party_type, host_name)')
    .eq('id', winnerId).maybeSingle();
  if (!data) return null;
  const d: any = data;
  return {
    id: d.id, place: d.place, prize: d.prize, name: d.game_players?.name || 'Winner', photo: d.game_players?.photo || null,
    party_name: d.game_rooms?.party_name || '', party_type: d.game_rooms?.party_type || 'other', host_name: d.game_rooms?.host_name || '',
    date: d.created_at, discount_code: d.discount_code, discount_amount: d.discount_amount, code_expires_at: d.code_expires_at,
  };
}
