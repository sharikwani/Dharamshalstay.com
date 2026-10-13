// app/api/partner/availability/route.ts
import { NextResponse } from 'next/server';
import { requireCaller, jsonError, type Caller } from '@/lib/server-auth';
import { assertActive } from '@/lib/partners/load';
import { loadProperty, ownedProperties, type PropertySummary } from '@/lib/availability/store';
import { gridResponse, publicProperty, putResponse, readJson } from '@/lib/availability/handlers';
import { isUuid } from '@/lib/availability/validate';

export const dynamic = 'force-dynamic';

async function activePartner(req: Request): Promise<Caller> {
  const caller = await requireCaller(req, ['partner']);
  assertActive(caller.profile.partner_status);
  return caller;
}

/** The property, only when this partner owns it (own or claimed: owner_id = caller). */
async function ownProperty(id: string, caller: Caller): Promise<PropertySummary | null> {
  const prop = await loadProperty(id);
  return prop && prop.owner_id === caller.profile.id ? prop : null;
}

const notFound = () => NextResponse.json({ error: 'Property not found' }, { status: 404 });
const badId = () => NextResponse.json({ error: 'property_id is required' }, { status: 400 });

export async function GET(req: Request) {
  try {
    const caller = await activePartner(req);
    const params = new URL(req.url).searchParams;
    const id = params.get('property_id');
    if (id === null) return NextResponse.json({ properties: (await ownedProperties(caller.profile.id)).map(publicProperty) });
    if (!isUuid(id)) return badId();
    const prop = await ownProperty(id, caller);
    if (!prop) return notFound();
    return await gridResponse(prop, params);
  } catch (e) { return jsonError(e); }
}

export async function PUT(req: Request) {
  try {
    const caller = await activePartner(req);
    const body = await readJson(req);
    if (!body || !isUuid(body.property_id)) return badId();
    const prop = await ownProperty(body.property_id, caller);
    if (!prop) return notFound();
    return await putResponse(prop, body, caller.user.id);
  } catch (e) { return jsonError(e); }
}
