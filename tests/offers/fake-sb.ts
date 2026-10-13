// tests/offers/fake-sb.ts
/** A tiny chainable Supabase stand-in. Each awaited query on a table takes the next queued response for that table. */
export type Res = { data?: any; error?: any; count?: number | null };
export type Call = { table: string; op: string; args: unknown[] };

const OPS = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'in', 'is', 'gt', 'gte', 'lt', 'lte', 'or', 'order', 'limit', 'ilike'];

export function makeFake() {
  const calls: Call[] = [];
  const queues: Record<string, Res[]> = {};
  const next = (t: string) => {
    const r: Res = queues[t] && queues[t].length ? queues[t].shift()! : {};
    return { data: r.data ?? null, error: r.error ?? null, count: r.count ?? null };
  };
  const client = {
    from(table: string) {
      const b: any = {};
      for (const op of OPS) b[op] = (...args: unknown[]) => { calls.push({ table, op, args }); return b; };
      b.single = async () => next(table);
      b.maybeSingle = async () => next(table);
      b.then = (ok: any, fail: any) => Promise.resolve(next(table)).then(ok, fail);
      return b;
    },
  };
  return {
    client,
    calls,
    queue(table: string, ...rs: Res[]) { (queues[table] = queues[table] || []).push(...rs); },
    ops(table: string, op: string): unknown[][] { return calls.filter((c) => c.table === table && c.op === op).map((c) => c.args); },
    reset() { calls.length = 0; for (const k of Object.keys(queues)) delete queues[k]; },
  };
}

export const fake = makeFake();
