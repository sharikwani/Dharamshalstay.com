import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/server-auth', () => ({ serviceClient: () => ({}) }));
import { mediaPath } from '@/lib/wa-chat/media';

describe('WhatsApp media path', () => {
  it('names the file after the conversation and message, with the right extension', () => {
    expect(mediaPath('conv', 'msg', 'image/jpeg')).toBe('conv/msg.jpg');
    expect(mediaPath('conv', 'msg', 'application/pdf')).toBe('conv/msg.pdf');
    expect(mediaPath('conv', 'msg', 'audio/ogg; codecs=opus')).toBe('conv/msg.ogg');
  });
  it('falls back to .bin for unknown types', () => {
    expect(mediaPath('c', 'm', 'application/x-weird')).toBe('c/m.bin');
  });
});
