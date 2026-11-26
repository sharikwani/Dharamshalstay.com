-- v59: taxi route distances. Gaggal airport to Dharamshala town was 22 km (same as to McLeod Ganj).
-- Reference: HPTDC lists Gaggal Airport - Dharamshala as 17 km; our guides say about 13-17 km.
-- Gaggal to McLeod Ganj stays at 22 km (the old 18 km copy is also corrected).
-- Run in the Supabase SQL editor. Prices are NOT changed.

UPDATE taxi_routes
SET distance_km = 15
WHERE from_location = 'Gaggal Airport' AND to_location = 'Dharamshala';

UPDATE taxi_routes
SET distance_km = 22
WHERE from_location = 'Gaggal Airport' AND to_location = 'McLeod Ganj';
