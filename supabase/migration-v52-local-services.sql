-- v52: local services directory (first category: luggage storage). Businesses sign up on /luggage-storage/list-your-service;
-- the owner approves them in /admin/services before they appear. Safe to re-run.
CREATE TABLE IF NOT EXISTS local_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'luggage_storage' CHECK (category IN ('luggage_storage')),
  name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  area TEXT NOT NULL,
  address TEXT,
  maps_url TEXT,
  price_text TEXT,
  hours TEXT,
  description TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected', 'hidden')),
  ip_hash TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_local_services_cat_status ON local_services(category, status);
ALTER TABLE local_services ENABLE ROW LEVEL SECURITY;
-- No policies: all access goes through API routes with the service role.

-- The first listing, added by the owner on 25 Oct 2026.
INSERT INTO local_services (slug, category, name, owner_name, phone, area, price_text, description, features, status, published_at)
VALUES (
  'makkar-luggage-storage-kandi', 'luggage_storage', 'Makkar Luggage Storage and Luggage Holding Services', 'Viren Makkar', '917833000062',
  'Kandi, Dharamshala', 'About Rs 80 to 100 per bag per day',
  'A local luggage storage and luggage holding service in Kandi, lower Dharamshala. Leave your bags for a few hours or a few days while you trek, sightsee or wait for a night bus.',
  ARRAY['All types of luggage accepted', 'Pick-up and drop within 5 km (charged extra)', 'Hourly and day storage'], 'published', NOW()
) ON CONFLICT (slug) DO NOTHING;
