import { serviceClient, HttpError } from '@/lib/server-auth';

export type AdminListingRequest = {
  id: string; kind: 'claim' | 'removal'; name: string; phone: string; email: string | null;
  role: string | null; message: string | null; verified: boolean; status: string;
  admin_note: string | null; created_at: string;
  property: { id: string; name: string; slug: string; status: string; owner_email: string | null } | null;
};

export async function listListingRequests(status: 'pending' | 'done' | 'rejected'): Promise<AdminListingRequest[]> {
  const { data, error } = await serviceClient().from('listing_requests')
    .select('id, kind, name, phone, email, role, message, verified, status, admin_note, created_at, property:properties(id, name, slug, status, owner_email)')
    .eq('status', status).order('created_at', { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data as any[]) || [];
}

export async function pendingListingRequestCount(): Promise<number> {
  const { count } = await serviceClient().from('listing_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending');
  return count || 0;
}

/** Id of the account that has CONFIRMED this email, if any (profiles.email alone is not proof). */
async function confirmedUserId(email: string): Promise<string | null> {
  const sb = serviceClient();
  for (let page = 1; ; page++) {
    const { data: list, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const match = list.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.email_confirmed_at ? match.id : null;
    if (!list.nextPage) return null;
  }
}

export type ListingAction = 'link_owner' | 'remove_listing' | 'restore_listing' | 'reject' | 'mark_done';

/** Apply an admin decision to a request. Returns a short note of what happened. */
export async function actOnListingRequest(id: string, action: ListingAction, note?: string): Promise<string> {
  const sb = serviceClient();
  const { data: r } = await sb.from('listing_requests').select('id, kind, email, property_id').eq('id', id).maybeSingle();
  if (!r) throw new HttpError(404, 'Request not found');
  const now = new Date().toISOString();
  let result = '';

  if (action === 'link_owner') {
    const email = (r.email || '').trim().toLowerCase();
    if (!email) throw new HttpError(400, 'This request has no email to link');
    const ownerId = await confirmedUserId(email);
    const updates: Record<string, unknown> = { owner_email: email, updated_at: now };
    if (ownerId) updates.owner_id = ownerId;
    const { error } = await sb.from('properties').update(updates).eq('id', r.property_id);
    if (error) throw new Error(error.message);
    result = ownerId ? 'Linked to their partner login.' : 'Saved their email. The listing links to their login once they sign up and confirm ' + email + '.';
  } else if (action === 'remove_listing' || action === 'restore_listing') {
    const status = action === 'remove_listing' ? 'suspended' : 'published';
    const { error } = await sb.from('properties').update({ status, updated_at: now }).eq('id', r.property_id);
    if (error) throw new Error(error.message);
    result = action === 'remove_listing' ? 'Listing taken off the site.' : 'Listing is live again.';
  } else {
    result = action === 'reject' ? 'Rejected.' : 'Marked as done.';
  }

  const status = action === 'reject' ? 'rejected' : action === 'restore_listing' ? 'rejected' : 'done';
  const { error } = await sb.from('listing_requests')
    .update({ status, admin_note: [result, note].filter(Boolean).join(' '), updated_at: now }).eq('id', id);
  if (error) throw new Error(error.message);
  return result;
}
