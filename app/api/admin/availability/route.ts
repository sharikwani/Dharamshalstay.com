// app/api/admin/availability/route.ts
import { NextResponse } from 'next/server';
import { requireCaller, jsonError } from '@/lib/server-auth';
import { loadProperty } from '@/lib/availability/store';
import { gridResponse, putResponse, readJson } from '@/lib/availability/handlers';
import { isUuid } from '@/lib/availability/validate';

export const dynamic = 'force-dynamic';

const notFound = () => NextResponse.json({ error: 'Property not found' }, { status: 404 });
const badId = () => NextResponse.json({ error: 'property_id is required' }, { status: 400 });

export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const params = new URL(req.url).searchParams;
    const id = params.get('property_id');
    if (!isUuid(id)) return badId();
    const prop = await loadProperty(id);
    if (!prop) return notFound();
    return await gridResponse(prop, params);
  } catch (e) { return jsonError(e); }
}

export async function PUT(req: Request) {
  try {
    const caller = await requireCaller(req, ['admin']);
    const body = await readJson(req);
    if (!body || !isUuid(body.property_id)) return badId();
    const prop = await loadProperty(body.property_id);
    if (!prop) return notFound();
    return await putResponse(prop, body, caller.user.id);
  } catch (e) { return jsonError(e); }
}
