-- migration-v14: booking privacy + customer sign-up role
-- 1. "Users read own bookings" (v4) let ANY partner read EVERY booking, guest
--    phone numbers included. Customers now read only their own; partners keep
--    "Partner read own property bookings" (v3); admins keep is_admin().
DROP POLICY IF EXISTS "Users read own bookings" ON bookings;
CREATE POLICY "Customers read own bookings" ON bookings
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 2. Bookings are created only by /api/bookings (service role), which prices
--    them. Direct inserts from the browser could set any amount.
DROP POLICY IF EXISTS "Anyone can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Public insert bookings" ON bookings;

-- 3. Customer sign-ups were created as 'partner' (the register page did not
--    send a role, and its follow-up role change is blocked by v13). Repair
--    accounts that never acted as partners: no business name, no listings.
UPDATE profiles p SET role = 'user'
WHERE p.role = 'partner'
  AND coalesce(trim(p.business_name), '') = ''
  AND NOT EXISTS (SELECT 1 FROM properties pr WHERE pr.owner_id = p.id);
