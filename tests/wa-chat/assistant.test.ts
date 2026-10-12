import { describe, expect, it, vi, beforeEach } from 'vitest';

const runTool = vi.hoisted(() => vi.fn(async (..._a: any[]) => JSON.stringify({ hotels: [{ name: 'Pine View' }] })));
vi.mock('@/lib/wa-chat/tools', () => ({ TOOL_DEFS: [{ type: 'function', function: { name: 'search_hotels' } }], runTool }));

import { reply, SYSTEM_PROMPT, toOpenAiMessages } from '@/lib/wa-chat/assistant';

const msg = (author: string, body: string, kind = 'text') => ({ id: body, conversation_id: 'c1', direction: author === 'customer' ? 'in' : 'out', author, body, kind } as any);
const ctx = () => ({ conversationId: 'c1', phone: '919800000001', profileName: 'Asha', handedOver: false });
const completion = (message: any) => new Response(JSON.stringify({ choices: [{ message }] }));

beforeEach(() => { vi.stubEnv('OPENAI_API_KEY', 'k'); runTool.mockClear(); });

describe('assistant', () => {
  it('system prompt carries the hard rules', () => {
    for (const rule of [/never confirm/i, /never invent/i, /discount/i, /human/i, /same language/i, /handover/i]) expect(SYSTEM_PROMPT).toMatch(rule);
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
  it('stops after 5 tool calls', async () => {
    const loop = () => completion({ role: 'assistant', content: null, tool_calls: [{ id: 't', type: 'function', function: { name: 'search_hotels', arguments: '{}' } }] });
    vi.stubGlobal('fetch', vi.fn(async () => loop()));
    await expect(reply([msg('customer', 'hi')], ctx())).rejects.toThrow(/tool/);
    expect(runTool).toHaveBeenCalledTimes(5);
  });
  it('throws when OpenAI fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    await expect(reply([msg('customer', 'hi')], ctx())).rejects.toThrow();
  });
});
