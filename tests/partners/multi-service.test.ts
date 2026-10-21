import { describe, expect, it } from 'vitest';
import { offers, partnerServices } from '@/lib/partners/types';
import { agreementFor, AGREEMENT_VERSION } from '@/lib/partners/agreement';
import { docsFor, missingItems, staffRolesNeeded } from '@/lib/partners/requirements';
import { checkAssignment } from '@/lib/manual-booking';

const karan = { partner_type: 'taxi', partner_services: ['taxi', 'trek', 'paragliding'] };

describe('multi-service partners', () => {
  it('reads services, falling back to the old single type', () => {
    expect(partnerServices(karan)).toEqual(['paragliding', 'taxi', 'trek']);
    expect(partnerServices({ partner_type: 'trek', partner_services: null })).toEqual(['trek']);
    expect(partnerServices({ partner_type: 'hotel' })).toEqual([]);
    expect(offers(karan, 'paragliding')).toBe(true);
    expect(offers({ partner_type: 'taxi' }, 'trek')).toBe(false);
  });
  it('keeps the single-service agreement exactly as before', () => {
    const a = agreementFor('taxi');
    expect(a.version).toBe(AGREEMENT_VERSION);
    expect(a.commission).toBe(20);
    expect(a.body).toContain('commission of 20% of the booking value');
    expect(a.body).toContain('we credit 80% of the booking value');
  });
  it('lists every service and its own rate in a multi-service agreement', () => {
    const a = agreementFor(['taxi', 'trek', 'paragliding']);
    expect(a.commission).toBeNull();
    expect(a.version).toBe(AGREEMENT_VERSION + '-multi');
    expect(a.body).toContain('25% for paragliding and trek bookings and 20% for taxi bookings');
    expect(a.body).toContain('taxi and cab services');
    expect(a.body).toContain('paragliding flights');
    expect(a.body).toContain('guided treks');
  });
  it('needs drivers and pilots and every document for all services', () => {
    expect(staffRolesNeeded(['taxi', 'trek', 'paragliding'])).toEqual(['driver', 'pilot']);
    expect(docsFor(['taxi', 'trek'])).toContain('tourism_registration');
    const missing = missingItems({
      partner_type: 'taxi', services: ['taxi', 'paragliding'], legal_name: 'Karan', phone: '1', pan_number: 'X', payout_method: 'upi', payout_details: { account_holder: 'K', upi_id: 'k@upi' },
      documents: [], staff: [], vehicles: [{ id: 'v1', registration_no: null, make_model: 'Maruti Swift', active: true }], agreementSigned: false,
    }).map((m) => m.label);
    expect(missing).toContain('At least one driver');
    expect(missing).toContain('At least one pilot');
    expect(missing.some((m) => m.includes('for Maruti Swift'))).toBe(true);
  });
  it('lets a multi-service partner take each of their services, and only those', () => {
    const p = { id: 'k', role: 'partner', partner_status: 'verified', ...karan };
    expect(checkAssignment('paragliding', p, null, null)).toBeNull();
    expect(checkAssignment('taxi', p, null, null)).toBeNull();
    expect(checkAssignment('trek', { ...p, partner_services: ['taxi'] }, null, null)).toMatch(/does not offer trek/);
  });
});
