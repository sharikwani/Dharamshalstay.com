import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { requireActivityPartner } from '@/lib/partners/load';
import { whatsappProfilePatch } from '@/lib/partners/whatsapp';

export const dynamic = 'force-dynamic';

// WhatsApp alert settings only. Unlike /api/partner/profile this works after verification too,
// so verified partners can switch alerts on or off and change the number themselves.
const schema = z.object({
  whatsapp_number: z.string().trim().max(20).optional(),
  whatsapp_alerts: z.boolean(),
});

async function loadSettings(id: string) {
  const { data, error } = await serviceClient().from('profiles').select('phone, whatsapp_number, whatsapp_alerts').eq('id', id).single();
  if (error || !data) {
    if (error) console.error('Partner WhatsApp settings load failed:', error);
    throw new HttpError(500, 'Could not load your WhatsApp settings. Please try again.');
  }
  return data as { phone: string | null; whatsapp_number: string | null; whatsapp_alerts: boolean | null };
}

const view = (p: { phone: string | null; whatsapp_number: string | null; whatsapp_alerts: boolean | null }) =>
  ({ whatsapp_number: p.whatsapp_number ?? null, whatsapp_alerts: !!p.whatsapp_alerts, phone: p.phone ?? null });

export async function GET(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req);
    return NextResponse.json(view(await loadSettings(profile.id)));
  } catch (e) { return jsonError(e); }
}

export async function PATCH(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, 'Please check the WhatsApp details.');
    const d = parsed.data;
    const current = await loadSettings(profile.id);
    // Omitted number → keep the saved one; empty number → fall back to the account phone.
    const rawNumber = d.whatsapp_number !== undefined ? d.whatsapp_number || current.phone : current.whatsapp_number || current.phone;
    const patch = whatsappProfilePatch({ rawNumber, alerts: d.whatsapp_alerts, wasOn: !!current.whatsapp_alerts, by: 'partner' });
    const { error } = await serviceClient().from('profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', profile.id);
    if (error) {
      console.error('Partner WhatsApp settings save failed:', error);
      throw new HttpError(500, 'Could not save your WhatsApp settings. Please try again.');
    }
    return NextResponse.json(view({ ...current, ...(patch as any) }));
  } catch (e) { return jsonError(e); }
}
