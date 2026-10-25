-- v51: party tickets (Christmas / New Year parties, e.g. at Panchvati Cottages) sold online.
-- A ticket purchase is a booking with category 'event', paid through the usual Razorpay link; once paid it
-- gets a ticket code and a ticket card (email + WhatsApp). Safe to re-run.

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_category_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_category_check
  CHECK (category IN ('hotel','taxi','trek','paragliding','guide','event'));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS event_slug TEXT,          -- which party (data/parties.ts)
  ADD COLUMN IF NOT EXISTS ticket_type TEXT,         -- ticket type id within the party
  ADD COLUMN IF NOT EXISTS ticket_qty INT CHECK (ticket_qty BETWEEN 1 AND 20),
  ADD COLUMN IF NOT EXISTS ticket_code TEXT,         -- shown on the ticket card, checked at the gate
  ADD COLUMN IF NOT EXISTS ticket_sent_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_ticket_code ON bookings(ticket_code) WHERE ticket_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_event_slug ON bookings(event_slug) WHERE event_slug IS NOT NULL;

-- Booking references for tickets start EVT-.
CREATE OR REPLACE FUNCTION generate_booking_ref()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.category
    WHEN 'hotel' THEN NEW.booking_ref := 'HTL';
    WHEN 'taxi' THEN NEW.booking_ref := 'TXI';
    WHEN 'trek' THEN NEW.booking_ref := 'TRK';
    WHEN 'paragliding' THEN NEW.booking_ref := 'PLG';
    WHEN 'guide' THEN NEW.booking_ref := 'GDE';
    WHEN 'event' THEN NEW.booking_ref := 'EVT';
    ELSE NEW.booking_ref := 'BKG';
  END CASE;
  NEW.booking_ref := NEW.booking_ref || '-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 5));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
