import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { isUuid } from '@/lib/availability/validate';
import { loadRoomsProperty } from '@/lib/rooms/store';
import { readJson } from '@/lib/availability/handlers';
import { roomsGet, roomsPut } from '@/lib/rooms/handlers';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // Next 14 caches GET fetches (Supabase reads) in route handlers otherwise

async function anyProperty(id: string | null) {
  if (!id || !isUuid(id)) throw new HttpError(400, 'property_id is required');
  const p = await loadRoomsProperty(id);
  if (!p) throw new HttpError(404, 'Property not found');
  return p;
}

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    return await roomsGet(await anyProperty(new URL(req.url).searchParams.get('property_id')));
  } catch (e) { return jsonError(e); }
}

export async function PUT(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const body = await readJson(req);
    if (!body || typeof body !== 'object') throw new HttpError(400, 'Invalid request');
    const p = await anyProperty(String(body.property_id || ''));
    return await roomsPut(p, body, { label: 'Admin' });
  } catch (e) { return jsonError(e); }
}
