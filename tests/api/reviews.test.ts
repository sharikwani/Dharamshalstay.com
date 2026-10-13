// tests/api/reviews.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  prop: null as any, recent: 0, dup: false, verified: false, insertError: null as any, emailThrows: false,
  uploads: [] as any[][], inserted: [] as any[], removed: [] as string[][], emails: [] as any[], phoneChecks: [] as any[][],
  page: { reviews: [] as any[], total: 0 },
}));
vi.mock('@/lib/reviews/store', () => ({
  propertyRef: async (id: string) => (h.prop && h.prop.id === id ? h.prop : null),
  countRecentByIp: async () => h.recent,
  phoneAlreadyReviewed: async (pid: string, phone: string) => { h.phoneChecks.push([pid, phone]); return h.dup; },
  hadVerifiedStay: async () => h.verified,
  uploadReviewPhoto: async (path: string, _b: unknown, type: string) => { h.uploads.push([path, type]); },
  insertReview: async (row: any) => { if (h.insertError) throw h.insertError; h.inserted.push(row); },
  removeUploads: async (l: string[]) => { h.removed.push(l); },
  loadSummary: async () => ({ count: 25, average: 4.4, categories: { cleanliness: null, location: null, staff: null, value: null }, distribution: [0, 0, 2, 9, 14] }),
  loadApprovedPage: async () => h.page,
}));
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email')>()),
  adminEmail: () => 'owner@x.test',
  sendEmail: async (m: any) => { if (h.emailThrows) throw new Error('mail down'); h.emails.push(m); },
}));

import { HttpError } from '@/lib/server-auth';
import { GET, POST } from '@/app/api/reviews/route';

const PID = '11111111-1111-4111-8111-111111111111';
const jpg = (name = 'a.jpg') => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8])], name, { type: 'image/jpeg' });
function form(over: Record<string, string | null> = {}, files: File[] = []) {
  const f = new FormData();
  const v: Record<string, string | null> = {
    property_id: PID, name: 'Ravi Kumar', phone: '+91 98057-00665', rating: '5',
    rating_cleanliness: '', rating_location: '', rating_staff: '', rating_value: '',
    title: 'Lovely quiet stay', body: 'Clean rooms, warm staff and a great view of the mountains.',
    stay_month: '2026-01', trip_type: 'family', website: '', ...over,
  };
  for (const k of Object.keys(v)) if (v[k] !== null) f.set(k, v[k] as string); // null = field absent
  for (const file of files) f.append('photos', file);
  return f;
}
const post = (f: FormData) => POST(new Request('http://x/api/reviews', { method: 'POST', body: f, headers: { 'x-real-ip': '1.2.3.4' } }));

beforeEach(() => {
  h.prop = { id: PID, name: 'Snow View', slug: 'snow-view', owner_id: 'o1', status: 'published' };
  h.recent = 0; h.dup = false; h.verified = false; h.insertError = null; h.emailThrows = false;
  h.uploads = []; h.inserted = []; h.removed = []; h.emails = []; h.phoneChecks = [];
  h.page = { reviews: [], total: 0 };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/reviews', () => {
  it('pretends to accept a bot that fills the honeypot, and stores nothing', async () => {
    const res = await post(form({ website: 'http://spam.example' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(h.inserted).toEqual([]);
    expect(h.emails).toEqual([]);
    expect(h.phoneChecks).toEqual([]);
  });

  it('returns the first validation problem', async () => {
    const res = await post(form({ title: 'Nice' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('The title needs at least 5 characters.');
  });

  it('gives the friendly message when a field is missing from the submission', async () => {
    const res = await post(form({ phone: null }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Please enter a valid mobile number.');
  });

  it('refuses a fourth photo or a disguised file before uploading anything', async () => {
    expect((await post(form({}, [jpg(), jpg(), jpg(), jpg()]))).status).toBe(400);
    const fake = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])], 'x.png', { type: 'image/png' });
    const res = await post(form({}, [fake]));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/does not look like a real image/);
    expect(h.uploads).toEqual([]);
  });

  it('404s for an unpublished property', async () => {
    h.prop.status = 'draft';
    expect((await post(form())).status).toBe(404);
  });

  it('allows 5 reviews per IP per hour, then 429', async () => {
    h.recent = 4;
    expect((await post(form())).status).toBe(200);
    h.recent = 5;
    const res = await post(form());
    expect(res.status).toBe(429);
    expect(h.inserted).toHaveLength(1);
  });

  it('refuses a second review from the same phone, however it is typed', async () => {
    h.dup = true;
    const res = await post(form({ phone: '09805700665' }));
    expect(res.status).toBe(409);
    expect(h.phoneChecks).toEqual([[PID, '9805700665']]);
    expect(h.inserted).toEqual([]);
  });

  it('stores a pending review with private photos, the verified flag and an IP hash, and emails the owner', async () => {
    h.verified = true;
    const res = await post(form({ name: '<b>Ravi</b>' }, [jpg('one.jpg'), jpg('two.jpg')]));
    expect(res.status).toBe(200);
    expect(h.uploads.map((u) => u[1])).toEqual(['image/jpeg', 'image/jpeg']);
    expect(h.uploads[0][0]).toMatch(new RegExp('^' + PID + '/[0-9a-f-]{36}/1\\.jpg$'));
    expect(h.uploads[1][0]).toMatch(/\/2\.jpg$/);
    const row = h.inserted[0];
    expect(row.photos).toEqual(h.uploads.map((u) => u[0]));
    expect(row.id).toBe(row.photos[0].split('/')[1]);
    expect(row).toMatchObject({ property_id: PID, phone: '9805700665', rating: 5, verified_stay: true, trip_type: 'family' });
    expect(row.ip_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(row).not.toHaveProperty('status');
    expect(h.emails[0].to).toBe('owner@x.test');
    expect(h.emails[0].subject).toBe('New review to approve: Snow View');
    expect(h.emails[0].html).toContain('&lt;b&gt;Ravi&lt;/b&gt;');
    expect(h.emails[0].html).toContain('(verified stay)');
  });

  it('removes uploaded photos when the insert fails', async () => {
    h.insertError = new HttpError(409, 'You have already reviewed this property with this mobile number.');
    const res = await post(form({}, [jpg()]));
    expect(res.status).toBe(409);
    expect(h.removed).toEqual([[h.uploads[0][0]]]);
  });

  it('still succeeds when the owner email fails', async () => {
    h.emailThrows = true;
    expect((await post(form())).status).toBe(200);
    expect(h.inserted).toHaveLength(1);
  });
});

describe('GET /api/reviews', () => {
  const get = (q: string) => GET(new Request('http://x/api/reviews?' + q));
  it('rejects a bad property id', async () => {
    expect((await get('property_id=abc')).status).toBe(400);
  });
  it('returns the summary and a page with has_more', async () => {
    h.page = { reviews: [{ id: 'r1' }], total: 25 };
    const two = await (await get('property_id=' + PID + '&page=2')).json();
    expect(two).toMatchObject({ page: 2, total: 25, has_more: true, reviews: [{ id: 'r1' }] });
    expect(two.summary.count).toBe(25);
    const three = await (await get('property_id=' + PID + '&page=3')).json();
    expect(three.has_more).toBe(false);
    const junk = await (await get('property_id=' + PID + '&page=x')).json();
    expect(junk.page).toBe(1);
  });
  it('shows nothing for an unpublished or unknown property', async () => {
    h.page = { reviews: [{ id: 'r1' }], total: 25 };
    h.prop.status = 'draft';
    const draft = await (await get('property_id=' + PID)).json();
    expect(draft).toMatchObject({ reviews: [], total: 0, has_more: false });
    expect(draft.summary.count).toBe(0);
    h.prop = null;
    expect(await (await get('property_id=' + PID)).json()).toMatchObject({ reviews: [], total: 0 });
  });
});
