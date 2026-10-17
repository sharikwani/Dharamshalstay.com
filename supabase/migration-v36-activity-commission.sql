-- migration-v36-activity-commission.sql
-- Owner decision 2026-10-17: 25% commission on all treks and paragliding packages (was 10% and 15%).
-- Applies to new bookings only; bookings already made keep the commission they were made with.
-- Run once in the Supabase SQL editor. Safe to re-run.

UPDATE treks SET commission_pct = 25 WHERE commission_pct IS DISTINCT FROM 25;
UPDATE paragliding_packages SET commission_pct = 25 WHERE commission_pct IS DISTINCT FROM 25;

-- New treks and packages start at 25% too.
ALTER TABLE treks ALTER COLUMN commission_pct SET DEFAULT 25.00;
ALTER TABLE paragliding_packages ALTER COLUMN commission_pct SET DEFAULT 25.00;

-- Trek and paragliding partners on the old 20% default move to 25% (Partner Agreement v2026-10-v2).
-- A rate set by hand (anything other than 20) is kept.
UPDATE profiles SET commission_pct = 25
WHERE role = 'partner' AND partner_type IN ('trek', 'paragliding') AND commission_pct = 20;
