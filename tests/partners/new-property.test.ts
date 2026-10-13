import { describe, it, expect } from 'vitest';
import { insertNewProperty } from '@/lib/partners/new-property';

const ID = '77777777-7777-4777-8777-777777777777';

/** A fake supabase client: `insertResults` answer each insert in turn; `existing` is the row read back by id. */
function fake(opts: { insertResults: any[]; existing?: any; updateError?: any }) {
  const ops: any[] = [];
  const sb = {
    from: (_t: string) => ({
      insert: (row: any) => { ops.push({ op: 'insert', row }); return { select: () => ({ single: async () => opts.insertResults.shift() }) }; },
      select: () => ({ eq: (_c: string, v: string) => ({ maybeSingle: async () => { ops.push({ op: 'read', id: v }); return { data: opts.existing ?? null, error: null }; } }) }),
      update: (row: any) => ({ eq: async (_c: string, v: string) => { ops.push({ op: 'update', row, id: v }); return { error: opts.updateError ?? null }; } }),
    }),
  };
  return { sb, ops };
}
const ok = { data: { id: ID }, error: null };
const dup = { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
const payload = (status: string) => ({ name: 'Hill View', owner_id: 'u1', status });

describe('insertNewProperty', () => {
  it('inserts with the id made for this wizard', async () => {
    const { sb, ops } = fake({ insertResults: [ok] });
    const r = await insertNewProperty(sb, ID, payload('draft'), 'hill-view');
    expect(r).toEqual({ data: { id: ID, status: 'draft' }, error: null });
    expect(ops[0].row).toMatchObject({ id: ID, slug: 'hill-view', status: 'draft' });
  });

  it('a slug taken by another listing retries with a suffix, same id', async () => {
    const { sb, ops } = fake({ insertResults: [dup, ok] });
    const r = await insertNewProperty(sb, ID, payload('draft'), 'hill-view', () => 'ab12');
    expect(r.error).toBeNull();
    const inserts = ops.filter((o) => o.op === 'insert');
    expect(inserts.map((o) => [o.row.id, o.row.slug])).toEqual([[ID, 'hill-view'], [ID, 'hill-view-ab12']]);
  });

  it('a retry after a lost response finds its own row and never makes a second one', async () => {
    const { sb, ops } = fake({ insertResults: [dup], existing: { id: ID, status: 'pending_review' } });
    const r = await insertNewProperty(sb, ID, payload('pending_review'), 'hill-view');
    expect(r).toEqual({ data: { id: ID, status: 'pending_review' }, error: null });
    expect(ops.filter((o) => o.op === 'insert')).toHaveLength(1);
    expect(ops.some((o) => o.op === 'update')).toBe(false);
  });

  it('a lost draft save followed by submit moves that same row to review', async () => {
    const { sb, ops } = fake({ insertResults: [dup], existing: { id: ID, status: 'draft' } });
    const r = await insertNewProperty(sb, ID, { ...payload('pending_review'), submitted_at: 'now' }, 'hill-view');
    expect(r).toEqual({ data: { id: ID, status: 'pending_review' }, error: null });
    const u = ops.find((o) => o.op === 'update');
    expect(u.id).toBe(ID);
    expect(u.row).toMatchObject({ status: 'pending_review', submitted_at: 'now' });
    expect(u.row).not.toHaveProperty('id');
  });

  it('a row already in review is left alone by a later draft save', async () => {
    const { sb, ops } = fake({ insertResults: [dup], existing: { id: ID, status: 'pending_review' } });
    const r = await insertNewProperty(sb, ID, payload('draft'), 'hill-view');
    expect(r).toEqual({ data: { id: ID, status: 'pending_review' }, error: null });
    expect(ops.some((o) => o.op === 'update')).toBe(false);
  });

  it('other errors are returned as they are', async () => {
    const err = { code: '42501', message: 'permission denied' };
    const { sb } = fake({ insertResults: [{ data: null, error: err }] });
    expect(await insertNewProperty(sb, ID, payload('draft'), 'hill-view')).toEqual({ data: null, error: err });
  });
});
