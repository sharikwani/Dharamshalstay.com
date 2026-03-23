-- =====================================================
-- Dharamshala Stay v3 — Migration (FIXED)
-- Run AFTER the v2 schema is already in place.
-- =====================================================

-- ============================
-- HELPER: is_admin() function
-- ============================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================
-- 1. Add sponsored/priority fields to properties
-- ============================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS priority_score INT DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES profiles(id);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(4,2) DEFAULT 10.00;

CREATE INDEX IF NOT EXISTS idx_properties_sort ON properties(is_sponsored DESC, priority_score DESC, sort_order ASC, published_at DESC);

-- ============================
-- 2. Add sponsored fields to taxi_routes
-- ============================
ALTER TABLE taxi_routes ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT FALSE;
ALTER TABLE taxi_routes ADD COLUMN IF NOT EXISTS priority_score INT DEFAULT 0;
ALTER TABLE taxi_routes ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(4,2) DEFAULT 10.00;
ALTER TABLE taxi_routes ADD COLUMN IF NOT EXISTS image VARCHAR(500);

-- ============================
-- 3. Add sponsored/commission fields to treks
-- ============================
ALTER TABLE treks ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT FALSE;
ALTER TABLE treks ADD COLUMN IF NOT EXISTS priority_score INT DEFAULT 0;
ALTER TABLE treks ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(4,2) DEFAULT 10.00;

-- ============================
-- 4. PARAGLIDING PACKAGES
-- ============================
CREATE TABLE IF NOT EXISTS paragliding_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(200) UNIQUE NOT NULL,
  name VARCHAR(300) NOT NULL,
  destination VARCHAR(200) NOT NULL DEFAULT 'Bir Billing',
  location_detail VARCHAR(300),
  package_type VARCHAR(50) DEFAULT 'tandem'
    CHECK (package_type IN ('tandem','solo','course','scenic','acrobatic')),
  duration VARCHAR(100),
  altitude VARCHAR(100),
  description TEXT,
  short_description TEXT,
  includes JSONB DEFAULT '[]',
  excludes JSONB DEFAULT '[]',
  safety_info TEXT,
  requirements TEXT,
  images JSONB DEFAULT '[]',
  price_per_person INT NOT NULL,
  group_price INT,
  min_participants INT DEFAULT 1,
  max_participants INT DEFAULT 20,
  available_months VARCHAR(200),
  faqs JSONB DEFAULT '[]',
  featured BOOLEAN DEFAULT FALSE,
  is_sponsored BOOLEAN DEFAULT FALSE,
  priority_score INT DEFAULT 0,
  commission_pct NUMERIC(4,2) DEFAULT 15.00,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  meta_title VARCHAR(300),
  meta_description VARCHAR(500),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paragliding_status ON paragliding_packages(status);

-- ============================
-- 5. BOOKINGS
-- ============================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_ref VARCHAR(20) UNIQUE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('hotel','taxi','trek','paragliding')),
  guest_name VARCHAR(200) NOT NULL,
  guest_email VARCHAR(200),
  guest_phone VARCHAR(20) NOT NULL,
  num_guests INT DEFAULT 1,
  special_requests TEXT,
  check_in DATE,
  check_out DATE,
  activity_date DATE,
  pickup_time VARCHAR(20),
  property_id UUID REFERENCES properties(id),
  taxi_route_id UUID REFERENCES taxi_routes(id),
  trek_id UUID REFERENCES treks(id),
  paragliding_id UUID REFERENCES paragliding_packages(id),
  pickup_location VARCHAR(300),
  drop_location VARCHAR(300),
  vehicle_type VARCHAR(50),
  amount INT NOT NULL DEFAULT 0,
  payment_method VARCHAR(20) DEFAULT 'offline'
    CHECK (payment_method IN ('online','offline','pay_at_hotel','partial_online')),
  payment_status VARCHAR(20) DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','partially_paid','refunded','failed')),
  transaction_id VARCHAR(200),
  status VARCHAR(30) DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','completed','no_show','failed')),
  booking_source VARCHAR(30) DEFAULT 'website'
    CHECK (booking_source IN ('website','whatsapp','phone','walkin','admin')),
  commission_pct NUMERIC(4,2) DEFAULT 10.00,
  commission_amount INT DEFAULT 0,
  commission_status VARCHAR(20) DEFAULT 'not_applicable'
    CHECK (commission_status IN ('not_applicable','pending','due','paid','overdue','disputed','waived')),
  commission_due_date DATE,
  commission_paid_date DATE,
  commission_notes TEXT,
  admin_notes TEXT,
  confirmed_by UUID REFERENCES profiles(id),
  cancelled_reason TEXT,
  hotel_notified_at TIMESTAMPTZ,
  admin_notified_at TIMESTAMPTZ,
  guest_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_category ON bookings(category);
CREATE INDEX IF NOT EXISTS idx_bookings_property ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_commission ON bookings(commission_status) WHERE commission_status IN ('pending','due','overdue');
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at DESC);

-- ============================
-- 6. COMMISSION RECORDS
-- ============================
CREATE TABLE IF NOT EXISTS commission_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id),
  provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('hotel','taxi','trek','paragliding')),
  booking_amount INT NOT NULL,
  commission_pct NUMERIC(4,2) NOT NULL,
  commission_amount INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','due','paid','overdue','disputed','waived')),
  due_date DATE,
  paid_date DATE,
  payment_ref VARCHAR(200),
  notes TEXT,
  settled_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- 7. NOTIFICATION LOG
-- ============================
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  recipient_type VARCHAR(20) CHECK (recipient_type IN ('hotel','admin','guest')),
  recipient_email VARCHAR(200),
  recipient_phone VARCHAR(20),
  subject VARCHAR(500),
  body TEXT,
  booking_id UUID REFERENCES bookings(id),
  property_id UUID REFERENCES properties(id),
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','skipped')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- 8. Update inquiries constraint for paragliding
-- ============================
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_type_check;
ALTER TABLE inquiries ADD CONSTRAINT inquiries_type_check
  CHECK (type IN ('hotel','taxi','trek','paragliding','general'));
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS paragliding_id UUID REFERENCES paragliding_packages(id);

-- ============================
-- 9. ENABLE RLS on new tables
-- ============================
ALTER TABLE paragliding_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- ============================
-- 10. Drop any broken policies
-- ============================
DROP POLICY IF EXISTS "Public read published paragliding" ON paragliding_packages;
DROP POLICY IF EXISTS "Public insert bookings" ON bookings;
DROP POLICY IF EXISTS "Users read own bookings" ON bookings;

-- ============================
-- 11. ADMIN full-CRUD RLS on ALL tables via is_admin()
--     This is the critical fix: admin pages use anon client
--     (authenticated as admin user) and need RLS to allow access.
-- ============================
CREATE POLICY "Admin full access profiles" ON profiles FOR ALL USING (is_admin());
CREATE POLICY "Admin full access properties" ON properties FOR ALL USING (is_admin());
CREATE POLICY "Admin full access taxi_routes" ON taxi_routes FOR ALL USING (is_admin());
CREATE POLICY "Admin full access treks" ON treks FOR ALL USING (is_admin());
CREATE POLICY "Admin full access guides" ON guides FOR ALL USING (is_admin());
CREATE POLICY "Admin full access inquiries" ON inquiries FOR ALL USING (is_admin());
CREATE POLICY "Admin full access blog_posts" ON blog_posts FOR ALL USING (is_admin());
CREATE POLICY "Admin full access testimonials" ON testimonials FOR ALL USING (is_admin());
CREATE POLICY "Admin full access destinations" ON destinations FOR ALL USING (is_admin());
CREATE POLICY "Admin full access activity_log" ON activity_log FOR ALL USING (is_admin());
CREATE POLICY "Admin full access property_images" ON property_images FOR ALL USING (is_admin());
CREATE POLICY "Admin full access paragliding" ON paragliding_packages FOR ALL USING (is_admin());
CREATE POLICY "Admin full access bookings" ON bookings FOR ALL USING (is_admin());
CREATE POLICY "Admin full access commissions" ON commission_records FOR ALL USING (is_admin());
CREATE POLICY "Admin full access notifications" ON notification_log FOR ALL USING (is_admin());

-- ============================
-- 12. Public read policies for new tables
-- ============================
CREATE POLICY "Public read published paragliding" ON paragliding_packages
  FOR SELECT USING (status = 'published');

-- ============================
-- 13. Booking insert policy (API uses service_role, but safety net)
-- ============================
CREATE POLICY "Public insert bookings" ON bookings
  FOR INSERT WITH CHECK (true);

-- ============================
-- 14. Partner: read bookings for own properties
-- ============================
CREATE POLICY "Partner read own property bookings" ON bookings
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

CREATE POLICY "Partner read own commissions" ON commission_records
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

-- ============================
-- 15. Booking ref trigger
-- ============================
CREATE OR REPLACE FUNCTION generate_booking_ref()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.category
    WHEN 'hotel' THEN NEW.booking_ref := 'HTL';
    WHEN 'taxi' THEN NEW.booking_ref := 'TXI';
    WHEN 'trek' THEN NEW.booking_ref := 'TRK';
    WHEN 'paragliding' THEN NEW.booking_ref := 'PLG';
    ELSE NEW.booking_ref := 'BKG';
  END CASE;
  NEW.booking_ref := NEW.booking_ref || '-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 5));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_booking_ref ON bookings;
CREATE TRIGGER set_booking_ref
  BEFORE INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.booking_ref IS NULL OR NEW.booking_ref = '')
  EXECUTE FUNCTION generate_booking_ref();

-- ============================
-- 16. Commission record trigger — FIXED: NULL due_date for non-hotel bookings
--     FIXED: removed redundant UPDATE on bookings row
-- ============================
CREATE OR REPLACE FUNCTION create_commission_record()
RETURNS TRIGGER AS $$
DECLARE
  v_due DATE;
BEGIN
  IF NEW.payment_method IN ('offline', 'pay_at_hotel') AND NEW.commission_amount > 0 THEN
    v_due := COALESCE(NEW.check_out, NEW.activity_date, CURRENT_DATE) + INTERVAL '7 days';
    INSERT INTO commission_records (
      booking_id, property_id, provider_type,
      booking_amount, commission_pct, commission_amount,
      status, due_date
    ) VALUES (
      NEW.id, NEW.property_id, NEW.category,
      NEW.amount, NEW.commission_pct, NEW.commission_amount,
      'pending', v_due
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_commission ON bookings;
CREATE TRIGGER auto_commission
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_commission_record();
