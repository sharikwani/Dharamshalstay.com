import { serviceClient } from '@/lib/server-auth';
import { adminIds, isUnclaimed } from './ownership';

/** Name and state of a listing for the claim/removal pages (also finds listings already taken down). */
export async function loadListingForRequest(slug: string) {
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return null;
  const { data } = await serviceClient().from('properties')
    .select('id, name, slug, status, owner_id, owner_email')
    .eq('slug', slug).maybeSingle();
  if (!data || !['published', 'suspended'].includes(data.status)) return null;
  return {
    name: data.name as string, slug: data.slug as string,
    live: data.status === 'published',
    // Listings already run by their owner can't be claimed again.
    claimable: isUnclaimed(data, await adminIds()),
  };
}
