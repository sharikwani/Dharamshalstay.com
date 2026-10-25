import { authFetch } from '@/lib/supabase';

/** Browser helper: after saving a property, let public pages show the change at once. Best effort, never throws. */
export async function refreshPropertyPages(): Promise<void> {
  try { await authFetch('/api/properties/refresh', { method: 'POST' }); } catch { /* pages refresh within 5 minutes anyway */ }
}

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
