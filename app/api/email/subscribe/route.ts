import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { serviceClient } from '@/lib/server-auth';
import { normEmail, upsertContact } from '@/lib/email/contacts';
import { deliver } from '@/lib/email/send';
import { SITE } from '@/lib/email/layout';
import { newsletterConfirm } from '@/lib/email/templates';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email().max(200),
  name: z.string().max(120).optional(),
  lang: z.enum(['en', 'hi']).optional(),
  interests: z.array(z.string().max(30)).max(6).optional(),
  website: z.string().max(0).optional(), // honeypot
});

/** Newsletter sign-up: saved without consent until they click the confirmation link (double opt-in). */
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  const { email, name, lang, interests } = parsed.data;
  if (!normEmail(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });

  const sb = serviceClient();
  const c = await upsertContact({ email, name, language: lang, source: 'newsletter', interests }, sb);
  if (!c) return NextResponse.json({ error: 'Could not sign you up. Please try again.' }, { status: 500 });
  if (c.marketing_consent && !c.unsubscribed_at) return NextResponse.json({ ok: true, already: true });
  if (c.suppressed_reason) return NextResponse.json({ ok: true });

  // At most one confirmation email per address per day, so the form can't be used to flood someone's inbox.
  const { count } = await sb.from('email_messages').select('id', { count: 'exact', head: true })
    .eq('to_email', email.toLowerCase()).eq('template', 'newsletter_confirm').gte('created_at', new Date(Date.now() - 86400e3).toISOString());
  if (count) return NextResponse.json({ ok: true });

  const token = c.double_opt_in_token || randomUUID();
  if (!c.double_opt_in_token) await sb.from('contacts').update({ double_opt_in_token: token }).eq('id', c.id);
  const { subject, doc } = newsletterConfirm(name || c.name, `${SITE()}/email/confirm?t=${token}`);
  await deliver({ to: email, subject, doc, kind: 'transactional', template: 'newsletter_confirm' });
  return NextResponse.json({ ok: true });
}
