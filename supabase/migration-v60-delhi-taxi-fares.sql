-- v60: Delhi taxi fares, same in both directions (owner, 26 Nov 2026).
-- Sedan (Swift Dzire / Etios): 17,000. SUV (Ertiga / Innova): 22,000. The old 10,000 / 13,000 fares are removed.
-- Run in the Supabase SQL editor. The site caches taxi pages for up to 1 hour.

-- 1. Sedan: 17,000 both ways
UPDATE taxi_routes
SET price = 17000, updated_at = NOW()
WHERE vehicle_category = 'sedan'
  AND ((from_location = 'Dharamshala' AND to_location = 'Delhi')
    OR (from_location = 'Delhi' AND to_location = 'Dharamshala'));

-- 2. SUV: 22,000 both ways
UPDATE taxi_routes
SET price = 22000, updated_at = NOW()
WHERE vehicle_category = 'suv'
  AND ((from_location = 'Dharamshala' AND to_location = 'Delhi')
    OR (from_location = 'Delhi' AND to_location = 'Dharamshala'));

-- 3. Add the SUV option for Delhi to Dharamshala if it does not exist yet (copied from the reverse SUV row)
INSERT INTO taxi_routes (from_location, to_location, route_type, vehicle_category, vehicle_name, max_passengers,
  price, price_type, distance_km, duration, description, includes, excludes, status, commission_pct, image)
SELECT 'Delhi', 'Dharamshala', route_type, vehicle_category, vehicle_name, max_passengers,
  22000, price_type, distance_km, duration, description, includes,
  '["Tolls", "Parking", "HP entry tax for non-HP vehicles (if any)"]'::jsonb, status, commission_pct, image
FROM taxi_routes
WHERE from_location = 'Dharamshala' AND to_location = 'Delhi' AND vehicle_category = 'suv'
  AND NOT EXISTS (
    SELECT 1 FROM taxi_routes
    WHERE from_location = 'Delhi' AND to_location = 'Dharamshala' AND vehicle_category = 'suv'
  )
LIMIT 1;

-- 4. Check: every Delhi row should now be 17,000 (sedan) or 22,000 (SUV). Any other row (e.g. hatchback) shows here too.
SELECT from_location, to_location, vehicle_category, vehicle_name, price, status
FROM taxi_routes
WHERE from_location = 'Delhi' OR to_location = 'Delhi'
ORDER BY from_location, vehicle_category;
