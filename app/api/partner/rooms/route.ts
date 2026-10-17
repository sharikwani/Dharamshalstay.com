import { NextResponse } from 'next/server';
import { HttpError, jsonError, requireCaller, type Caller } from '@/lib/server-auth';
import { assertActive } from '@/lib/partners/load';
import { isUuid } from '@/lib/availability/validate';
import { ensureRoomIds, loadRoomsProperty, ownedRoomsProperties } from '@/lib/rooms/store';
import { readJson } from '@/lib/availability/handlers';
import { roomsGet, roomsPut } from '@/lib/rooms/handlers';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise
const LIVE = ['published', 'approved'];

async function activePartner(req: Request) {
  const c = await requireCaller(req, ['partner']);
  assertActive(c.profile.partner_status);
  return c;
}

async function ownProperty(id: string | null, caller: Caller, forWrite: boolean) {
  if (!id || !isUuid(id)) throw new HttpError(400, 'property_id is required');
  // Read without writing: room ids are persisted only once the caller is known to own the property.
  const p = await loadRoomsProperty(id, { assignIds: false });
  if (!p || p.owner_id !== caller.profile.id) throw new HttpError(404, 'Property not found');
  if (forWrite && !LIVE.includes(p.status)) throw new HttpError(403, 'Use the listing form to edit rooms on a draft listing.');
  const withIds = await ensureRoomIds(p);
  if (!withIds) throw new HttpError(404, 'Property not found');
  return withIds;
}

export async function GET(req: Request) {
  try {
    const caller = await activePartner(req);
    const id = new URL(req.url).searchParams.get('property_id');
    if (!id) return NextResponse.json({ properties: await ownedRoomsProperties(caller.profile.id) });
    return await roomsGet(await ownProperty(id, caller, false));
  } catch (e) { return jsonError(e); }
}

export async function PUT(req: Request) {
  try {
    const caller = await activePartner(req);
    const body = await readJson(req);
    if (!body || typeof body !== 'object') throw new HttpError(400, 'Invalid request');
    const p = await ownProperty(String(body.property_id || ''), caller, true);
    const name = caller.profile.full_name || caller.profile.email || 'Partner';
    return await roomsPut(p, body, { label: `${name} (partner)` });
  } catch (e) { return jsonError(e); }
}
