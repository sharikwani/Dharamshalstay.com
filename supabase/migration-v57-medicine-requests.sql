-- v57: emergency medicine delivery requests from /medicine-delivery-dharamshala (owner, 20 Nov 2026).
-- People send their details and a doctor's prescription; we confirm it with the doctor, then a licensed partner
-- chemist delivers. Prescriptions are health data: private bucket, admin-only, files deleted after 30 days.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS medicine_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  patient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  area TEXT NOT NULL,
  address TEXT NOT NULL,
  medicines TEXT NOT NULL,
  urgency TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  doctor_phone TEXT NOT NULL,
  prescription_path TEXT,
  prescription_type TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  ip_hash TEXT
);

ALTER TABLE medicine_requests DROP CONSTRAINT IF EXISTS medicine_requests_status_check;
ALTER TABLE medicine_requests ADD CONSTRAINT medicine_requests_status_check
  CHECK (status IN ('new', 'checking', 'doctor_confirmed', 'delivered', 'rejected'));

CREATE INDEX IF NOT EXISTS medicine_requests_status_idx ON medicine_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS medicine_requests_ip_idx ON medicine_requests(ip_hash, created_at);

-- No policies: only the server (service role) can read or write. The public form goes through /api/medicine.
ALTER TABLE medicine_requests ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('medicine-prescriptions', 'medicine-prescriptions', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Check: table and private bucket exist.
SELECT 'table' AS what, count(*)::text AS value FROM information_schema.tables WHERE table_name = 'medicine_requests'
UNION ALL
SELECT 'bucket public?', public::text FROM storage.buckets WHERE id = 'medicine-prescriptions';
