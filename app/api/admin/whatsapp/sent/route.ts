import { NextResponse } from 'next/server';
import { requireCaller, serviceClient, jsonError } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Tpl = { body: string; footer: string; buttons: string[] };
let cache: { at: number; byName: Record<string, Tpl> } | null = null;

/** Our approved template texts from Meta (cached 10 minutes), to show each sent message in full. */
async function templates(): Promise<Record<string, Tpl>> {
  if (cache && Date.now() - cache.at < 600e3) return cache.byName;
  const byName: Record<string, Tpl> = {};
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_WABA_ID}/message_templates?fields=name,language,components&limit=100`,
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const j: any = await res.json();
    for (const t of j.data || []) {
      const c = (type: string) => (t.components || []).find((x: any) => x.type === type);
      byName[t.name] = { body: c('BODY')?.text || '', footer: c('FOOTER')?.text || '', buttons: (c('BUTTONS')?.buttons || []).map((b: any) => b.text) };
    }
    cache = { at: Date.now(), byName };
  } catch { /* show what we have without the template text */ }
  return byName;
}

const fill = (body: string, params: string[]) => body.replace(/\{\{(\d+)\}\}/g, (m, n) => params[Number(n) - 1] ?? m);

/** GET ?q= : the WhatsApp templates we sent (booking alerts, hotel enquiry alerts, listing invites), newest first. */
export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const sb = serviceClient();
    const q = (new URL(req.url).searchParams.get('q') || '').replace(/\D/g, '');
    let x = sb.from('whatsapp_messages').select('id,booking_id,property_id,recipient_kind,to_phone,template,wa_message_id,status,error,created_at,updated_at')
      .order('created_at', { ascending: false }).limit(200);
    if (q) x = x.ilike('to_phone', `%${q}%`);
    const { data: rows, error } = await x;
    if (error) throw error;
    const list = rows || [];
    const ids = (k: 'property_id' | 'booking_id' | 'wa_message_id') => Array.from(new Set(list.map((r) => r[k]).filter(Boolean))) as string[];
    const [props, books, sends, tpl] = await Promise.all([
      ids('property_id').length ? sb.from('properties').select('id,name').in('id', ids('property_id')) : Promise.resolve({ data: [] as any[] }),
      ids('booking_id').length ? sb.from('bookings').select('id,booking_ref').in('id', ids('booking_id')) : Promise.resolve({ data: [] as any[] }),
      ids('wa_message_id').length ? sb.from('whatsapp_template_sends').select('wa_message_id,params').in('wa_message_id', ids('wa_message_id')) : Promise.resolve({ data: [] as any[] }),
      templates(),
    ]);
    const pName = new Map((props.data || []).map((p: any) => [p.id, p.name]));
    const bRef = new Map((books.data || []).map((b: any) => [b.id, b.booking_ref]));
    const params = new Map((sends.data || []).map((s: any) => [s.wa_message_id, s.params as string[]]));
    return NextResponse.json({
      rows: list.map((r) => {
        const t = tpl[r.template];
        const p = r.wa_message_id ? params.get(r.wa_message_id) : undefined;
        return {
          ...r, property_name: pName.get(r.property_id) || null, booking_ref: bRef.get(r.booking_id) || null,
          text: t ? fill(t.body, p || []) : null, has_values: !!p, footer: t?.footer || null, buttons: t?.buttons || [],
        };
      }),
    });
  } catch (e) { return jsonError(e); }
}
