import { describe, it, expect } from 'vitest';
import { agreementFor, sha256Hex, AGREEMENT_VERSION } from '@/lib/partners/agreement';
import { renderAgreementPdf, toPdfSafe } from '@/lib/partners/agreement-pdf';

describe('agreement text', () => {
  it('states the 20% commission on online and cash bookings', () => {
    const a = agreementFor('taxi');
    expect(a.version).toBe(AGREEMENT_VERSION);
    expect(a.body).toMatch(/20%/);
    expect(a.body).toMatch(/cash/i);
    expect(a.body).toMatch(/taxi/i);
  });
  it('is stable for hashing', () => {
    expect(sha256Hex(agreementFor('trek').body)).toBe(sha256Hex(agreementFor('trek').body));
    expect(sha256Hex('a')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('agreement PDF', () => {
  it('transliterates characters standard PDF fonts cannot draw', () => {
    expect(toPdfSafe('Fee ₹500 — “quoted” • ok नमस्ते')).toBe('Fee Rs.500 - "quoted" - ok ?');
  });
  it('renders a PDF', async () => {
    const a = agreementFor('paragliding');
    const bytes = await renderAgreementPdf({ ...a, signedName: 'Ravi Kumar', signedAt: '2026-10-09T10:00:00Z', ip: '1.2.3.4', email: 'r@example.com', sha256: sha256Hex(a.body) });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(2000);
  });
});
