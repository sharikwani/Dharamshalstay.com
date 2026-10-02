-- migration-v7: content fact-check fixes (Oct 2026)
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Treks are editable in /admin/treks, so the site does not override them in
-- code. These updates correct facts that were wrong in the original seed data.
-- (Destination rows no longer need updating: the five core destinations are
-- served from data/destinations.ts, and place photos from /images/places.)

-- Triund: Snowline Cafe is ABOVE Triund, not before it; altitude ~2,850 m;
-- Forest Department fee is Rs.100/person/day since the 2024 revision.
UPDATE treks SET
  max_altitude = '2,850 m',
  distance = '6-7 km one way (from Gallu Devi)',
  itinerary = '[
    {"day": 1, "title": "Dharamkot to Triund", "description": "Start 9 AM from Gallu Devi above Dharamkot. Trek through oak and rhododendron forest to Magic View Cafe, then tackle the steep final switchbacks to Triund (about 6-7 km in total). Camp, sunset, dinner."},
    {"day": 2, "title": "Sunrise & Descent", "description": "Wake early for sunrise over the Dhauladhar. Breakfast, then descend 3-4 hours back to Dharamkot."}
  ]'::jsonb,
  faqs = '[
    {"question": "Is Triund safe for beginners?", "answer": "Yes, it is considered beginner-friendly though moderately strenuous, with a well-marked trail. Avoid trekking after dark and check weather orders in monsoon and winter."},
    {"question": "Do I need a permit?", "answer": "Yes. The Forest Department charges an entry fee (Rs.100 per person per day as of the 2024 revision) and camping is about Rs.550 per two-person tent including entry; overnight numbers are capped. Fees change, so check locally -- we handle this when you book through us."}
  ]'::jsonb,
  meta_description = 'Book the Triund Trek. Complete guide with itinerary, fees & camping info. Guided treks from Rs.1,500/person.',
  updated_at = NOW()
WHERE slug = 'triund-trek';

-- Replace old stock-photo URLs on treks (the site already ignores them, this
-- just keeps the admin panel tidy).
UPDATE treks SET images = '["/images/places/triund.jpg", "/images/places/indrahar-pass.jpg"]'::jsonb, updated_at = NOW()
WHERE slug = 'triund-trek' AND images::text LIKE '%unsplash%';

UPDATE treks SET images = '["/images/places/kareri-lake.jpg"]'::jsonb, updated_at = NOW()
WHERE slug = 'kareri-lake-trek' AND images::text LIKE '%unsplash%';

-- Destination rows: replace stock images (two of them return 404).
UPDATE destinations SET image = '/images/places/dharamshala-town.jpg' WHERE slug = 'dharamshala' AND image LIKE '%unsplash%';
UPDATE destinations SET image = '/images/places/mcleod-ganj.jpg'      WHERE slug = 'mcleod-ganj' AND image LIKE '%unsplash%';
UPDATE destinations SET image = '/images/places/bhagsu-waterfall.jpg' WHERE slug = 'bhagsu'      AND image LIKE '%unsplash%';
UPDATE destinations SET image = '/images/places/dharamkot.jpg'        WHERE slug = 'dharamkot'   AND image LIKE '%unsplash%';
UPDATE destinations SET image = '/images/places/naddi.jpg'            WHERE slug = 'naddi'       AND image LIKE '%unsplash%';
