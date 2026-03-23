-- =====================================================
-- Dharamshala Stay v2 — Complete Supabase Schema
-- Supports: Public site, Partner Portal, Admin Portal
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== USER PROFILES =====
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(200) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'partner' CHECK (role IN ('partner', 'admin')),
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  business_name VARCHAR(300),
  gst_number VARCHAR(20),
  pan_number VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== DESTINATIONS =====
CREATE TABLE destinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  tagline VARCHAR(300),
  description TEXT,
  long_description TEXT,
  altitude VARCHAR(50),
  best_time VARCHAR(200),
  how_to_reach TEXT,
  things_to_do JSONB DEFAULT '[]',
  image VARCHAR(500),
  image_alt VARCHAR(300),
  hotel_count INT DEFAULT 0,
  faqs JSONB DEFAULT '[]',
  meta_title VARCHAR(300),
  meta_description VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== PROPERTIES (Hotels/Homestays/Hostels) =====
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES profiles(id),
  status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_review','changes_requested','approved','published','rejected','suspended')),
  slug VARCHAR(200) UNIQUE,
  featured BOOLEAN DEFAULT FALSE,

  -- Basic Info
  name VARCHAR(300) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('hotel','homestay','hostel','guesthouse','resort','villa','camp')),
  star_rating SMALLINT CHECK (star_rating BETWEEN 1 AND 5),
  description TEXT,
  short_description TEXT,

  -- Location
  destination_slug VARCHAR(100),
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) DEFAULT 'Himachal Pradesh',
  pincode VARCHAR(10),
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  landmark VARCHAR(300),
  distance_from_bus_stand VARCHAR(50),
  distance_from_airport VARCHAR(50),

  -- Contact (property-level)
  contact_name VARCHAR(200),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(200),
  contact_whatsapp VARCHAR(20),

  -- Property Details
  total_rooms INT,
  year_established INT,
  languages_spoken JSONB DEFAULT '["English","Hindi"]',
  check_in_time VARCHAR(10) DEFAULT '14:00',
  check_out_time VARCHAR(10) DEFAULT '11:00',

  -- Amenities (stored as JSON arrays)
  amenities JSONB DEFAULT '[]',
  room_amenities JSONB DEFAULT '[]',
  bathroom_amenities JSONB DEFAULT '[]',
  food_amenities JSONB DEFAULT '[]',
  activity_amenities JSONB DEFAULT '[]',

  -- Policies
  cancellation_policy TEXT,
  pet_policy TEXT DEFAULT 'No pets allowed',
  smoking_policy TEXT DEFAULT 'Non-smoking',
  alcohol_policy TEXT,
  couple_friendly BOOLEAN DEFAULT TRUE,
  id_required JSONB DEFAULT '["Aadhaar Card"]',
  child_policy TEXT,
  extra_bed_charge INT,

  -- Pricing
  price_min INT,
  price_max INT,
  tax_included BOOLEAN DEFAULT FALSE,
  accepts_online_payment BOOLEAN DEFAULT FALSE,

  -- Room Types (JSON array of room objects)
  rooms JSONB DEFAULT '[]',

  -- Images (JSON array)
  images JSONB DEFAULT '[]',

  -- Nearby & FAQs
  nearby_attractions JSONB DEFAULT '[]',
  faqs JSONB DEFAULT '[]',

  -- SEO
  meta_title VARCHAR(300),
  meta_description VARCHAR(500),

  -- Admin workflow
  admin_notes TEXT,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,

  -- Ratings
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ
);

CREATE INDEX idx_properties_owner ON properties(owner_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_destination ON properties(destination_slug);
CREATE INDEX idx_properties_type ON properties(type);
CREATE INDEX idx_properties_featured ON properties(featured) WHERE featured = TRUE;
CREATE INDEX idx_properties_published ON properties(status) WHERE status = 'published';

-- ===== PROPERTY IMAGES (optional separate table for more complex image management) =====
CREATE TABLE property_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  alt VARCHAR(300),
  category VARCHAR(50) DEFAULT 'other',
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== TAXI ROUTES (managed by admin only) =====
CREATE TABLE taxi_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_location VARCHAR(200) NOT NULL,
  to_location VARCHAR(200) NOT NULL,
  route_type VARCHAR(20) NOT NULL CHECK (route_type IN ('airport','local','outstation','sightseeing')),
  vehicle_category VARCHAR(20) CHECK (vehicle_category IN ('sedan','suv','innova','tempo','bus')),
  vehicle_name VARCHAR(100),
  max_passengers INT DEFAULT 4,
  price INT NOT NULL,
  price_type VARCHAR(10) DEFAULT 'fixed' CHECK (price_type IN ('fixed','per_km')),
  distance_km INT,
  duration VARCHAR(100),
  description TEXT,
  includes JSONB DEFAULT '[]',
  excludes JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== GUIDES (managed by admin) — must come before treks =====
CREATE TABLE guides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(200),
  photo VARCHAR(500),
  bio TEXT,
  experience_years INT DEFAULT 0,
  languages JSONB DEFAULT '["Hindi","English"]',
  specializations JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  price_per_day INT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== TREKS (managed by admin) =====
CREATE TABLE treks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(200) UNIQUE NOT NULL,
  name VARCHAR(300) NOT NULL,
  destination_slug VARCHAR(100),
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy','moderate','hard','expert')),
  duration VARCHAR(50),
  distance VARCHAR(50),
  max_altitude VARCHAR(50),
  best_season VARCHAR(200),
  price_per_person INT,
  group_discount VARCHAR(200),
  short_description TEXT,
  description TEXT,
  itinerary JSONB DEFAULT '[]',
  includes JSONB DEFAULT '[]',
  excludes JSONB DEFAULT '[]',
  things_to_carry JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  guide_id UUID REFERENCES guides(id),
  featured BOOLEAN DEFAULT FALSE,
  faqs JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  meta_title VARCHAR(300),
  meta_description VARCHAR(500),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== INQUIRIES =====
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('hotel','taxi','trek','general')),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(20) NOT NULL,
  message TEXT,
  check_in DATE,
  check_out DATE,
  guests INT,
  property_id UUID REFERENCES properties(id),
  trek_id UUID REFERENCES treks(id),
  pickup_location VARCHAR(200),
  drop_location VARCHAR(200),
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','contacted','converted','closed')),
  notes TEXT,
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_created ON inquiries(created_at DESC);

-- ===== BLOG POSTS =====
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(300) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT,
  content TEXT,
  category VARCHAR(100),
  tags JSONB DEFAULT '[]',
  author VARCHAR(200),
  published_at DATE,
  updated_at DATE,
  image VARCHAR(500),
  image_alt VARCHAR(300),
  read_time INT DEFAULT 5,
  featured BOOLEAN DEFAULT FALSE,
  meta_title VARCHAR(300),
  meta_description VARCHAR(500),
  related_slugs JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== TESTIMONIALS =====
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  location VARCHAR(200),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  property_id UUID REFERENCES properties(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== ACTIVITY LOG (for admin auditing) =====
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxi_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE treks ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read destinations" ON destinations FOR SELECT USING (true);
CREATE POLICY "Public read published properties" ON properties FOR SELECT USING (status = 'published');
CREATE POLICY "Public read active taxis" ON taxi_routes FOR SELECT USING (status = 'active');
CREATE POLICY "Public read published treks" ON treks FOR SELECT USING (status = 'published');
CREATE POLICY "Public read active guides" ON guides FOR SELECT USING (status = 'active');
CREATE POLICY "Public read published blogs" ON blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "Public read active testimonials" ON testimonials FOR SELECT USING (is_active = true);

-- Partner policies
CREATE POLICY "Partners can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Partners can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Partners can read own properties" ON properties FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Partners can insert properties" ON properties FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Partners can update own properties" ON properties FOR UPDATE USING (auth.uid() = owner_id AND status IN ('draft', 'changes_requested'));

-- Public insert
CREATE POLICY "Public insert inquiries" ON inquiries FOR INSERT WITH CHECK (true);

-- Insert profile on signup (via trigger)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role, full_name, phone, business_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'partner'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'business_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
