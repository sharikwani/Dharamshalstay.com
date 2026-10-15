/**
 * Where a property is: full address and map links. The location is public;
 * the hotel's phone is not (see lib/db.ts PRIVATE_PROPERTY_FIELDS).
 */
export type Located = {
  name?: string;
  address_line1?: string | null;
  address_line2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

/** "Jogiwara Road, McLeod Ganj, Himachal Pradesh 176219" with duplicate parts removed. */
export function formatAddress(p: Located): string {
  const parts: string[] = [];
  for (const raw of [p.address_line1, p.address_line2, p.city]) {
    const part = (raw || '').trim();
    if (part && !parts.some((x) => x.toLowerCase().includes(part.toLowerCase()))) parts.push(part);
  }
  const tail = [p.state || 'Himachal Pradesh', p.pincode].filter(Boolean).join(' ');
  return [...parts, tail].join(', ');
}

export function hasCoordinates(p: Located): boolean {
  const lat = Number(p.latitude), lng = Number(p.longitude);
  return p.latitude != null && p.longitude != null && Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
}

/** Google Maps view/directions links and an OpenStreetMap embed (no API key needed). */
export function mapLinks(latitude: number | string, longitude: number | string) {
  const lat = Number(latitude), lng = Number(longitude);
  const ll = lat.toFixed(6) + ',' + lng.toFixed(6);
  const d = 0.004;
  return {
    view: 'https://www.google.com/maps/search/?api=1&query=' + ll,
    directions: 'https://www.google.com/maps/dir/?api=1&destination=' + ll,
    embed: 'https://www.openstreetmap.org/export/embed.html?bbox=' +
      [lng - d, lat - d * 0.6, lng + d, lat + d * 0.6].map((n) => n.toFixed(6)).join('%2C') +
      '&layer=mapnik&marker=' + lat.toFixed(6) + '%2C' + lng.toFixed(6),
  };
}

/** Map link for a property: exact pin when known, else a search for name + address. */
export function propertyMapUrl(p: Located): string {
  if (hasCoordinates(p)) return mapLinks(p.latitude!, p.longitude!).view;
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([p.name, formatAddress(p)].filter(Boolean).join(', '));
}
