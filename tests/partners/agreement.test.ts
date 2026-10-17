import { describe, it, expect } from 'vitest';
import { agreementFor, sha256Hex, AGREEMENT_VERSION } from '@/lib/partners/agreement';
import { renderAgreementPdf, toPdfSafe } from '@/lib/partners/agreement-pdf';

describe('agreement text', () => {
  it('states the 20% commission for taxis on online and cash bookings', () => {
    const a = agreementFor('taxi');
    expect(a.version).toBe(AGREEMENT_VERSION);
    expect(a.commission).toBe(20);
    expect(a.body).toMatch(/commission of 20%/);
    expect(a.body).toMatch(/credit 80%/);
    expect(a.body).toMatch(/cash/i);
    expect(a.body).toMatch(/taxi/i);
  });
  it('states 25% for trek and paragliding partners, and 75% to them on online payments', () => {
    for (const t of ['trek', 'paragliding'] as const) {
      const a = agreementFor(t);
      expect(a.commission).toBe(25);
      expect(a.body).toMatch(/commission of 25%/);
      expect(a.body).toMatch(/credit 75%/);
      expect(a.body).toMatch(/owe us the 25% commission/);
      expect(a.body).not.toMatch(/\b20%/);
    }
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
