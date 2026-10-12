import { describe, expect, it } from 'vitest';
import { safeJson } from '@/components/seo/JsonLd';

const LS = String.fromCharCode(0x2028);

describe('safeJson', () => {
  it('cannot close the script tag', () => {
    const input = { description: `</script><script>alert(1)</script> & more${LS}` };
    const out = safeJson(input);
    expect(out).not.toMatch(/[<>&]/);
    expect(out.includes(LS)).toBe(false);
    expect(JSON.parse(out)).toEqual(input);
  });
});
