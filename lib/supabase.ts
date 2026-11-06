import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// No request to Supabase may hang forever. A stalled token refresh or sign-in kept the admin
// login button spinning (6 Nov 2026); with a limit it fails and shows an error instead.
// Uploads (storage) and calls that bring their own abort signal are left alone.
const REQUEST_TIMEOUT_MS = 20000;
export function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (init.signal || url.includes('/storage/v1/') || typeof AbortSignal.timeout !== 'function') return fetch(input, init);
  return fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

// Browser client (for client components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: fetchWithTimeout } });

// Server client with service role (for API routes / server actions)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Auth helpers
export async function signUp(email: string, password: string, metadata: Record<string, string>) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Emails the admin that a listing is waiting for approval. Never throws; true when the server accepted it. */
export async function notifyPropertySubmitted(id: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const res = await fetch('/api/partner/property-submitted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: JSON.stringify({ id }),
    });
    return res.ok;
  } catch {
    // The listing is saved either way; it still shows in /admin/approvals.
    return false;
  }
}

/** fetch() that sends the logged-in user's token, for /api/partner and /api/admin routes. */
export async function authFetch(input: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session) headers.set('Authorization', 'Bearer ' + session.access_token);
  return fetch(input, { ...init, headers });
}
