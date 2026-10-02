/** URL slug for a taxi route page, shared by server and client code. */
function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function taxiRouteSlug(from: string, to: string): string {
  return slugify(from) + '-to-' + slugify(to) + '-taxi';
}
