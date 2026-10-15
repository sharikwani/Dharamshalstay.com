import { serviceClient } from '@/lib/server-auth';

/** Ids of admin accounts. Listings we added ourselves (directory or partner) are owned by an admin until claimed. */
export async function adminIds(): Promise<Set<string>> {
  const { data, error } = await serviceClient().from('profiles').select('id').eq('role', 'admin');
  if (error) throw new Error(error.message);
  return new Set((data || []).map((p) => p.id));
}

/** Not yet run by its real owner: no owner email, and owned by nobody or by one of our admin accounts. */
export function isUnclaimed(p: { owner_id?: string | null; owner_email?: string | null }, admins: Set<string>): boolean {
  return !p.owner_email && (!p.owner_id || admins.has(p.owner_id));
}
