-- v38: keep a copy of every email we send, so admin can open it from Admin -> Email -> Sent emails.
ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS html TEXT;
