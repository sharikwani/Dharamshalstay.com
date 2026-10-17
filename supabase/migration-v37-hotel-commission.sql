-- migration-v37-hotel-commission.sql
-- Owner decision 2026-10-17: hotel commission 15%.
-- New hotels default to 15%, and directory listings with no rate (0% or blank) move to 15%.
-- A rate agreed with a hotel (e.g. Panchvati Cottages, 20%) is kept. Existing bookings keep their commission.
-- Run once in the Supabase SQL editor. Safe to re-run.

UPDATE properties SET commission_pct = 15 WHERE commission_pct IS NULL OR commission_pct = 0;
ALTER TABLE properties ALTER COLUMN commission_pct SET DEFAULT 15.00;
