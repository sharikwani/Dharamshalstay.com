/**
 * Save a new listing from the partner wizard under the id the wizard made when it opened, so a retry after a
 * lost response (or a double click) can never create a second listing.
 *
 * A unique violation is either this very listing (an earlier attempt did save) or another listing's slug. The
 * row is read back by id to tell which: our own row counts as saved (a draft is brought up to date, so a lost
 * draft save followed by "submit" still submits), while a slug clash retries with a short suffix, same id.
 */
type Result = { data: { id: string; status: string } | null; error: any };

const randomSuffix = () => Math.random().toString(36).slice(2, 6);

export async function insertNewProperty(
  sb: any, id: string, payload: Record<string, any>, baseSlug: string, suffix: () => string = randomSuffix,
): Promise<Result> {
  const status = String(payload.status);
  const tryInsert = (slug: string) => sb.from('properties').insert({ ...payload, id, slug }).select('id').single();

  let r = await tryInsert(baseSlug);
  for (let attempt = 0; r.error?.code === '23505' && attempt < 3; attempt++) {
    const { data: mine, error: readError } = await sb.from('properties').select('id, status').eq('id', id).maybeSingle();
    if (readError) return { data: null, error: readError };
    if (mine) {
      // Only a draft can still be edited by the partner; a listing already in review stays as it is.
      if (mine.status !== 'draft') return { data: { id, status: String(mine.status) }, error: null };
      const { error } = await sb.from('properties').update(payload).eq('id', id);
      return error ? { data: null, error } : { data: { id, status }, error: null };
    }
    r = await tryInsert(`${baseSlug}-${suffix()}`);
  }
  if (r.error) return { data: null, error: r.error };
  return { data: { id, status }, error: null };
}
