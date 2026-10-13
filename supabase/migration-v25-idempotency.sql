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

-- A WhatsApp send that timed out may still have been delivered: such chat messages are logged as 'unknown'.
ALTER TABLE whatsapp_chat_messages DROP CONSTRAINT IF EXISTS whatsapp_chat_messages_status_check;
ALTER TABLE whatsapp_chat_messages ADD CONSTRAINT whatsapp_chat_messages_status_check
  CHECK (status IN ('received','sent','delivered','read','failed','unknown'));

-- Deleting a property: the database clears every reference to it in the same statement, so the admin delete can
-- never stop half-way. v5 set ON DELETE SET NULL on four of these by constraint name; this re-asserts it whatever
-- the constraint is called, and adds testimonials, whose reference never had an ON DELETE rule.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND c.confrelid = 'public.properties'::regclass
      AND array_length(c.conkey, 1) = 1 AND a.attname = 'property_id'
      AND c.conrelid IN (SELECT to_regclass('public.' || t)
                         FROM unnest(ARRAY['bookings','inquiries','commission_records','notification_log','testimonials']) AS t)
      AND c.confdeltype <> 'n'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL', r.tbl, r.conname);
  END LOOP;
END $$;
