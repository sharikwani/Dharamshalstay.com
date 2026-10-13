import { authFetch } from '@/lib/supabase';

/** Browser helper for admin pages: ask the server to ping IndexNow for a hotel page. Best effort, never throws. */
export async function notifyHotelChanged(slug: string | null | undefined): Promise<void> {
  if (!slug) return;
  try {
    await authFetch('/api/admin/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
  } catch {
    // A missed ping only delays recrawling.
  }
}
