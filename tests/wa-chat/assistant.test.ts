import { describe, expect, it, vi, beforeEach } from 'vitest';

const runTool = vi.hoisted(() => vi.fn(async (..._a: any[]) => JSON.stringify({ hotels: [{ name: 'Pine View' }] })));
vi.mock('@/lib/wa-chat/tools', () => ({ TOOL_DEFS: [{ type: 'function', function: { name: 'search_hotels' } }], runTool }));
const own = vi.hoisted(() => ({ rows: [] as any[], throws: false, calls: [] as string[] }));
vi.mock('@/lib/wa-chat/booking-store', () => ({ ownBookings: async (p: string) => { own.calls.push(p); if (own.throws) throw new Error('db down'); return own.rows; } }));

import { reply, SYSTEM_PROMPT, toOpenAiMessages } from '@/lib/wa-chat/assistant';

const msg = (author: string, body: string, kind = 'text') => ({ id: body, conversation_id: 'c1', direction: author === 'customer' ? 'in' : 'out', author, body, kind } as any);
const ctx = () => ({ conversationId: 'c1', phone: '919800000001', profileName: 'Asha', handedOver: false });
const completion = (message: any) => new Response(JSON.stringify({ choices: [{ message }] }));

beforeEach(() => { vi.stubEnv('OPENAI_API_KEY', 'k'); runTool.mockClear(); Object.assign(own, { rows: [], throws: false, calls: [] }); });

describe('assistant', () => {
  it('system prompt carries the hard rules', () => {
    for (const rule of [/never say confirmed/i, /never invent/i, /discount/i, /human/i, /same language/i, /handover/i]) expect(SYSTEM_PROMPT).toMatch(rule);
  });
  it('mentions the advertised booking discount instead of denying it', () => {
    expect(SYSTEM_PROMPT).toContain('Discount of up to ₹500 on every booking');
    expect(SYSTEM_PROMPT).toMatch(/applied by our team when the booking is confirmed/i);
  });
  it('only books once the customer chose the payment themselves', () => {
    expect(SYSTEM_PROMPT).toContain('Only call create_booking after the customer has explicitly chosen pay online or pay later in their own words; if they have not, ask which they prefer. Never choose the payment for them.');
    expect(SYSTEM_PROMPT).toContain("For a quote with an offer code, YES means pay online (pay later isn't allowed for offers).");
  });
  it('maps history roles and labels team messages', () => {
    expect(toOpenAiMessages([msg('customer', 'hi'), msg('ai', 'hello'), msg('admin', 'I can help'), msg('ai', 'x', 'system')])).toEqual([
      { role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }, { role: 'assistant', content: '[Team member] I can help' },
    ]);
  });
  it('runs tools then returns the final text', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(completion({ role: 'assistant', content: null, tool_calls: [{ id: 't1', type: 'function', function: { name: 'search_hotels', arguments: '{"area":"mcleod"}' } }] }))
      .mockResolvedValueOnce(completion({ role: 'assistant', content: '  Pine View is lovely.  ' }));
    vi.stubGlobal('fetch', f);
    expect(await reply([msg('customer', 'hotels in mcleod?')], ctx())).toBe('Pine View is lovely.');
    expect(runTool).toHaveBeenCalledWith('search_hotels', { area: 'mcleod' }, expect.objectContaining({ conversationId: 'c1' }));
    const second = JSON.parse(f.mock.calls[1][1].body);
    expect(second.messages.at(-1)).toMatchObject({ role: 'tool', tool_call_id: 't1' });
  });
  it('stops after 6 tool calls', async () => {
    const loop = () => completion({ role: 'assistant', content: null, tool_calls: [{ id: 't', type: 'function', function: { name: 'search_hotels', arguments: '{}' } }] });
    vi.stubGlobal('fetch', vi.fn(async () => loop()));
    await expect(reply([msg('customer', 'hi')], ctx())).rejects.toThrow(/tool/);
    expect(runTool).toHaveBeenCalledTimes(6);
  });
  it('throws when OpenAI fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    await expect(reply([msg('customer', 'hi')], ctx())).rejects.toThrow();
  });
  it('explains WhatsApp offers without exact percents or pay-later discounts', () => {
    expect(SYSTEM_PROMPT).toMatch(/get_offer_code/);
    expect(SYSTEM_PROMPT).toMatch(/only through this chat/);
    expect(SYSTEM_PROMPT).toMatch(/paid online in full/);
    expect(SYSTEM_PROMPT).toMatch(/pay later gets no offer/i);
    expect(SYSTEM_PROMPT).toMatch(/Never say an exact percent before quote_booking/);
    expect(SYSTEM_PROMPT).toMatch(/never offer both/);
  });
});

describe('bookings already made in this chat', () => {
  const hours = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
  const bk = (over: any = {}) => ({
    booking_ref: 'HTL-261013-2F2F2', category: 'hotel', room_name: 'Deluxe - Breakfast', check_in: '2026-10-20', check_out: '2026-10-22',
    activity_date: null, pickup_time: null, payment_method: 'pay_at_hotel', payment_status: 'pending', status: 'pending',
    booking_source: 'whatsapp', created_at: hours(0.1), ...over,
  });
  const systemOf = async () => {
    const f = vi.fn(async () => completion({ role: 'assistant', content: 'ok' }));
    vi.stubGlobal('fetch', f);
    await reply([msg('customer', 'hi')], ctx());
    return JSON.parse((f.mock.calls[0] as any)[1].body).messages[0].content as string;
  };

  it('lists WhatsApp bookings from the last 24 hours so later turns do not book again', async () => {
    own.rows = [
      bk(),
      bk({ booking_ref: 'TRK-1', category: 'trek', room_name: null, check_in: null, check_out: null, activity_date: '2026-10-25', payment_method: 'online', payment_status: 'paid', status: 'confirmed' }),
      bk({ booking_ref: 'WEB-1', booking_source: 'website' }),
      bk({ booking_ref: 'OLD-1', created_at: hours(25) }),
    ];
    const sys = await systemOf();
    expect(own.calls).toEqual(['919800000001']);
    expect(sys).toContain('Bookings made in this chat in the last 24h:');
    expect(sys).toContain('HTL-261013-2F2F2 (hotel – Deluxe - Breakfast, 2026-10-20 to 2026-10-22, pay later, requested)');
    expect(sys).toContain('TRK-1 (trek, 2026-10-25, paid online, confirmed)');
    expect(sys).not.toContain('WEB-1');
    expect(sys).not.toContain('OLD-1');
    expect(sys).toMatch(/already booked.*never book (it|them) again/i);
  });
  it('keeps the list short (max 5)', async () => {
    own.rows = Array.from({ length: 8 }, (_, i) => bk({ booking_ref: `HTL-${i}` }));
    const sys = await systemOf();
    expect(sys).toContain('HTL-4');
    expect(sys).not.toContain('HTL-5');
  });
  it('says nothing when there are none, and still answers when the lookup fails', async () => {
    expect(await systemOf()).not.toContain('Bookings made in this chat');
    own.throws = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await systemOf()).not.toContain('Bookings made in this chat');
  });
});
