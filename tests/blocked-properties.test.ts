import { describe, expect, it } from 'vitest';
import { blockedPropertyMatch } from '@/lib/listings/blocked';
import { insertNewProperty } from '@/lib/partners/new-property';

describe('blocked properties', () => {
  it('matches White Rabbit by name in any spelling', () => {
    expect(blockedPropertyMatch({ name: 'White Rabbit Guest House' })).not.toBeNull();
    expect(blockedPropertyMatch({ name: 'The WHITE-RABBIT Homestay, Bhagsu' })).not.toBeNull();
    expect(blockedPropertyMatch({ name: 'whiterabbit' })).not.toBeNull();
  });

  it('matches by phone in any format, or by slug', () => {
    expect(blockedPropertyMatch({ name: 'New Name Stay', contact_phone: '+91 83509 50090' })).not.toBeNull();
    expect(blockedPropertyMatch({ name: 'New Name Stay', contact_whatsapp: '918350950090' })).not.toBeNull();
    expect(blockedPropertyMatch({ name: 'x', slug: 'white-rabbit-guest-house-bhagsu-ab12' })).not.toBeNull();
  });

  it('leaves other properties alone', () => {
    expect(blockedPropertyMatch({ name: 'Mustard House', contact_phone: '+91 98160 00000', slug: 'mustard-house-homestay-dharamkot' })).toBeNull();
    expect(blockedPropertyMatch({ name: 'Rabbit Hole Cafe' })).toBeNull();
  });

  it('the partner wizard refuses to save a blocked property', async () => {
    const sb = { from: () => { throw new Error('must not reach the database'); } };
    const r = await insertNewProperty(sb, 'id-1', { name: 'White Rabbit Guest House', status: 'pending_review' }, 'white-rabbit-guest-house');
    expect(r.data).toBeNull();
    expect(r.error.message).toMatch(/cannot be listed/);
  });
});
