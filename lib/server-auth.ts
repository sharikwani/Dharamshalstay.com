import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type Caller = { user: User; profile: Record<string, any> };

export function serviceClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function bearerFrom(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

/** The signed-in user behind this request and their profile row, or null. */
export async function getCaller(req: Request): Promise<Caller | null> {
  const token = bearerFrom(req);
  if (!token) return null;
  const sb = serviceClient();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) return null;
  return { user, profile };
}

export async function requireCaller(req: Request, roles?: string[]): Promise<Caller> {
  const caller = await getCaller(req);
  if (!caller) throw new HttpError(401, 'Please log in again');
  if (roles && !roles.includes(caller.profile.role)) throw new HttpError(403, 'You do not have access to this');
  return caller;
}

export function jsonError(e: unknown): NextResponse {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: 'Server error' }, { status: 500 });
}
