-- migration-v47: hatchback taxis (Alto 800, Swift) as their own option on taxi routes. Run once in the SQL editor. Safe to re-run.
ALTER TABLE taxi_routes DROP CONSTRAINT IF EXISTS taxi_routes_vehicle_category_check;
ALTER TABLE taxi_routes ADD CONSTRAINT taxi_routes_vehicle_category_check
  CHECK (vehicle_category IN ('hatchback','sedan','suv','innova','tempo','bus'));
