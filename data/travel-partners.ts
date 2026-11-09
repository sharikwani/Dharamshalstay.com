/**
 * Verified travel partners: local operators we work with, shown on /travel-partners with a profile each.
 * Owner-curated (no sign-up yet). Only true claims here: badges are our own endorsement and track record, never
 * star ratings — stars appear only from real customer reviews (Google's review rules).
 * A profile stays out of Google (indexable: false) until it has a real description, so thin pages are not indexed.
 */
export type PartnerService = 'trek' | 'paragliding' | 'taxi';

export type TravelPartner = {
  slug: string;
  name: string;
  services: PartnerService[];
  /** "Top Partner" badge: the owner's recommendation (26-27 Oct 2026). */
  topPartner: boolean;
  /** "Verified by Dharamshala Stay": the owner has checked the business. */
  verified: boolean;
  /** Group trips completed with Dharamshala Stay, as recorded by the owner. */
  groupsCompleted: number;
  area?: string;
  bio?: string;
  photo?: string;
  /** The partner's account id (profiles.id): links customer star ratings (partner_reviews) to this profile. */
  partnerId?: string;
  indexable: boolean;
  added: string; // YYYY-MM-DD
};

export const SERVICE_INFO: Record<PartnerService, { label: string; href: string }> = {
  trek: { label: 'Treks', href: '/treks' },
  paragliding: { label: 'Paragliding', href: '/paragliding' },
  taxi: { label: 'Taxis', href: '/taxi' },
};

export const TRAVEL_PARTNERS: TravelPartner[] = [
  {
    slug: 'makkar-tour-and-travels',
    name: 'Makkar Tour and Travels',
    services: ['trek', 'paragliding', 'taxi'],
    topPartner: true,
    verified: true,
    groupsCompleted: 17,
    indexable: false, // add bio, area and photo, then set true
    added: '2026-10-27',
  },
  {
    slug: 'karan',
    name: 'Karan',
    services: ['taxi', 'trek', 'paragliding'],
    topPartner: false,
    verified: true,
    groupsCompleted: 0,
    area: 'Dharamshala and McLeod Ganj',
    bio: 'Karan is a local partner who runs taxis, treks and paragliding for our guests. His cars include Maruti Swift Dzire sedans for couples and small families, and a Toyota Innova and Toyota Rumion for groups of up to six, covering Kangra (Gaggal) Airport transfers, local sightseeing and outstation trips. Book through Dharamshala Stay: we confirm the car, the driver and the full price on WhatsApp before you travel.',
    partnerId: '2eea6ea2-9eb5-4749-b2b4-3449de140e41',
    indexable: false, // add a photo, then set true once he has a few reviews
    added: '2026-11-09',
  },
];

export const partnerBySlug = (slug: string) => TRAVEL_PARTNERS.find((p) => p.slug === slug) || null;
