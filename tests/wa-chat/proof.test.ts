import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { checkProof } from '@/lib/wa-chat/proof';

const input = (over: any = {}) => ({ data: new Uint8Array([1, 2, 3]).buffer, mimeType: 'image/jpeg', guestName: 'Asha Rao', startDate: '2026-10-24', reasonCode: 'medical', reasonText: 'Fever', ...over });
let calls: any[] = [];
const reply = (content: string, ok = true) => vi.fn(async (_u: string, init: any) => { calls.push(JSON.parse(init.body)); return { ok, json: async () => ({ choices: [{ message: { content } }] }) }; });

beforeEach(() => { calls = []; vi.stubEnv('OPENAI_API_KEY', 'k'); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('checkProof', () => {
  it('sends the image with the booking facts and returns the verdict', async () => {
    vi.stubGlobal('fetch', reply('{"verdict":"matches","notes":"Doctor note for Asha Rao dated 22 Oct"}'));
    expect(await checkProof(input())).toEqual({ verdict: 'matches', notes: 'Doctor note for Asha Rao dated 22 Oct' });
    const parts = calls[0].messages[1].content;
    expect(parts[0].text).toMatch(/Asha Rao/);
    expect(parts[0].text).toMatch(/2026-10-24/);
    expect(parts[1].image_url.url).toMatch(/^data:image\/jpeg;base64,AQID$/);
    expect(calls[0].model).toBe('gpt-4.1');
  });
  it('sends PDFs as a file part', async () => {
    vi.stubGlobal('fetch', reply('{"verdict":"mismatch","notes":"Different name"}'));
    await checkProof(input({ mimeType: 'application/pdf' }));
    expect(calls[0].messages[1].content[1]).toMatchObject({ type: 'file', file: { file_data: expect.stringMatching(/^data:application\/pdf;base64,/) } });
  });
  it('is unclear for unsupported files, bad JSON, API errors and no key', async () => {
    vi.stubGlobal('fetch', reply('not json'));
    expect((await checkProof(input({ mimeType: 'video/mp4' }))).verdict).toBe('unclear');
    expect(calls).toEqual([]);
    expect((await checkProof(input())).verdict).toBe('unclear');
    vi.stubGlobal('fetch', reply('{}', false));
    expect((await checkProof(input())).verdict).toBe('unclear');
    vi.stubGlobal('fetch', reply('{"verdict":"definitely","notes":""}'));
    expect((await checkProof(input())).verdict).toBe('unclear');
    vi.stubEnv('OPENAI_API_KEY', '');
    expect((await checkProof(input())).verdict).toBe('unclear');
  });
});
