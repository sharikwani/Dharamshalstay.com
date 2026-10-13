-- migration-v25: duplicate-action guards. Run once in the Supabase SQL editor after v24, BEFORE deploying the
-- code that uses it (bookings.client_request_id and whatsapp_conversations.processing_until). Safe to re-run.

-- A booking form submits one request id; a retry of the same submit finds the booking it already made.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_request_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_client_request_id ON bookings(client_request_id) WHERE client_request_id IS NOT NULL;

-- One commission record per booking (the auto_commission trigger and the admin route never add a second).
CREATE UNIQUE INDEX IF NOT EXISTS uq_commission_records_booking ON commission_records(booking_id);

-- One staff entry per partner, role and phone.
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_staff_partner_role_phone ON partner_staff(partner_id, role, phone);

-- WhatsApp AI turn lock: a conversation is being answered until this time.
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS processing_until TIMESTAMPTZ;
