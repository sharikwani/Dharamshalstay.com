-- migration-v46: a partner offering services with different rates (taxi 20%, trek and paragliding 25%) has no
-- single commission rate; each booking then uses its own service's rate. Run once in the SQL editor. Safe to re-run.
ALTER TABLE profiles ALTER COLUMN commission_pct DROP NOT NULL;
-- Partners already offering services with different rates, still on a default rate: switch to per-service rates.
UPDATE profiles SET commission_pct = NULL
WHERE role = 'partner' AND commission_pct IN (20, 25)
  AND partner_services @> ARRAY['taxi']::TEXT[] AND (partner_services && ARRAY['trek','paragliding']::TEXT[]);
