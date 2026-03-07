// ===== USER / AUTH =====
export type UserRole = 'partner' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone: string;
  business_name?: string;
  created_at: string;
}

// ===== PROPERTY (Hotel/Homestay/Hostel) =====
export type PropertyType = 'hotel' | 'homestay' | 'hostel' | 'guesthouse' | 'resort' | 'villa' | 'camp';
export type PropertyStatus = 'draft' | 'pending_review' | 'changes_requested' | 'approved' | 'published' | 'rejected' | 'suspended';
export type MealPlan = 'ep' | 'cp' | 'map' | 'ap'; // European, Continental, Modified American, American

export interface Property {
  id: string;
  owner_id: string;
  status: PropertyStatus;
  slug: string;
  featured: boolean;

  // Basic Info
  name: string;
  type: PropertyType;
  star_rating?: number;
  description: string;
  short_description: string;

  // Location
  destination_slug: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  landmark?: string;
  distance_from_bus_stand?: string;
  distance_from_airport?: string;

  // Contact
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_whatsapp?: string;

  // Property Details
  total_rooms: number;
  year_established?: number;
  languages_spoken: string[];
  check_in_time: string;
  check_out_time: string;

  // Amenities
  amenities: string[];
  room_amenities: string[];
  bathroom_amenities: string[];
  food_amenities: string[];
  activity_amenities: string[];

  // Policies
  cancellation_policy: string;
  pet_policy: string;
  smoking_policy: string;
  alcohol_policy: string;
  couple_friendly: boolean;
  id_required: string[];
  child_policy: string;
  extra_bed_charge?: number;

  // Pricing
  price_min: number;
  price_max: number;
  tax_included: boolean;
  accepts_online_payment: boolean;

  // Room Types
  rooms: RoomType[];

  // Images
  images: PropertyImage[];

  // Nearby
  nearby_attractions: string[];

  // FAQs
  faqs: FAQ[];

  // SEO
  meta_title?: string;
  meta_description?: string;

  // Admin
  admin_notes?: string;
  rejection_reason?: string;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface PropertyImage {
  id?: string;
  url: string;
  alt: string;
  category: 'exterior' | 'lobby' | 'room' | 'bathroom' | 'restaurant' | 'pool' | 'view' | 'amenity' | 'other';
  is_primary: boolean;
  sort_order: number;
}

export interface RoomType {
  id?: string;
  name: string;
  description: string;
  room_size?: string;
  bed_type: string;
  max_adults: number;
  max_children: number;
  max_occupancy: number;
  base_price: number;
  weekend_price?: number;
  peak_price?: number;
  meal_plan: MealPlan;
  amenities: string[];
  images: string[];
  total_inventory: number;
  is_active: boolean;
}

// ===== DESTINATION =====
export interface Destination {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  long_description: string;
  altitude: string;
  best_time: string;
  how_to_reach: string;
  things_to_do: string[];
  image: string;
  image_alt: string;
  hotel_count: number;
  faqs: FAQ[];
  meta_title: string;
  meta_description: string;
}

// ===== TAXI =====
export type TaxiStatus = 'active' | 'inactive';
export type TaxiType = 'airport' | 'local' | 'outstation' | 'sightseeing';
export type VehicleCategory = 'sedan' | 'suv' | 'innova' | 'tempo' | 'bus';

export interface TaxiRoute {
  id: string;
  from_location: string;
  to_location: string;
  route_type: TaxiType;
  vehicle_category: VehicleCategory;
  vehicle_name: string;
  max_passengers: number;
  price: number;
  price_type: 'fixed' | 'per_km';
  distance_km: number;
  duration: string;
  description?: string;
  includes: string[];
  excludes: string[];
  status: TaxiStatus;
  created_at: string;
  updated_at: string;
}

// ===== TREK =====
export type TrekStatus = 'draft' | 'published' | 'archived';
export type TrekDifficulty = 'easy' | 'moderate' | 'hard' | 'expert';

export interface Trek {
  id: string;
  slug: string;
  name: string;
  destination_slug: string;
  difficulty: TrekDifficulty;
  duration: string;
  distance: string;
  max_altitude: string;
  best_season: string;
  price_per_person: number;
  group_discount?: string;
  short_description: string;
  description: string;
  itinerary: TrekDay[];
  includes: string[];
  excludes: string[];
  things_to_carry: string[];
  images: string[];
  guide_id?: string;
  featured: boolean;
  faqs: FAQ[];
  status: TrekStatus;
  meta_title: string;
  meta_description: string;
  created_at: string;
  updated_at: string;
}

export interface TrekDay {
  day: number;
  title: string;
  description: string;
  distance?: string;
  altitude?: string;
}

// ===== GUIDE =====
export type GuideStatus = 'active' | 'inactive';

export interface Guide {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photo?: string;
  bio: string;
  experience_years: number;
  languages: string[];
  specializations: string[];
  certifications: string[];
  rating: number;
  review_count: number;
  price_per_day: number;
  status: GuideStatus;
  created_at: string;
  updated_at: string;
}

// ===== BLOG =====
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  published_at: string;
  updated_at: string;
  image: string;
  image_alt: string;
  read_time: number;
  featured: boolean;
  meta_title: string;
  meta_description: string;
  related_slugs: string[];
}

// ===== INQUIRY =====
export interface InquiryFormData {
  type: 'hotel' | 'taxi' | 'trek' | 'general';
  name: string;
  email: string;
  phone: string;
  message: string;
  check_in?: string;
  check_out?: string;
  guests?: number;
  property_id?: string;
  trek_id?: string;
  pickup_location?: string;
  drop_location?: string;
}

// ===== COMMON =====
export interface FAQ {
  question: string;
  answer: string;
}

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  date: string;
}

// ===== CONSTANTS =====
export const PROPERTY_AMENITIES = [
  'WiFi', 'Parking', 'Restaurant', 'Room Service', '24/7 Front Desk', 'Elevator/Lift',
  'Power Backup', 'CCTV', 'Fire Safety', 'First Aid', 'Wheelchair Accessible',
  'Luggage Storage', 'Concierge', 'Travel Desk', 'Currency Exchange', 'Laundry Service',
  'Dry Cleaning', 'Doctor on Call', 'Swimming Pool', 'Spa', 'Gym/Fitness Center',
  'Conference Room', 'Banquet Hall', 'Garden', 'Terrace', 'Bonfire Area',
  'Library', 'Game Room', 'Kids Play Area', 'Yoga Space', 'Meditation Room',
  'Cafe/Coffee Shop', 'Bar/Lounge', 'Barbecue Area', 'Picnic Area',
] as const;

export const ROOM_AMENITIES = [
  'Air Conditioning', 'Heater/Blower', 'Ceiling Fan', 'Hot Water (24/7)', 'Geyser',
  'TV (LED/LCD)', 'Cable/DTH', 'WiFi in Room', 'Mini Fridge', 'Electric Kettle',
  'Tea/Coffee Maker', 'Iron & Board', 'Hair Dryer', 'Safe/Locker', 'Wardrobe',
  'Writing Desk', 'Seating Area', 'Balcony/Patio', 'Mountain View', 'Valley View',
  'Garden View', 'Intercom', 'Wake-up Service', 'Blackout Curtains',
] as const;

export const BATHROOM_AMENITIES = [
  'Attached Bathroom', 'Western Toilet', 'Indian Toilet', 'Shower', 'Bathtub',
  'Hot/Cold Water', 'Toiletries', 'Towels', 'Dental Kit', 'Shaving Kit', 'Slippers',
] as const;

export const FOOD_OPTIONS = [
  'Breakfast Available', 'Lunch Available', 'Dinner Available', 'Room Service',
  'Multi-Cuisine Restaurant', 'Pure Veg Only', 'Non-Veg Available', 'Tibetan Food',
  'Continental Food', 'Chinese Food', 'Himachali Thali', 'Jain Food Available',
  'Kitchen Access (Self-Cooking)', 'Packed Lunch Available', 'Special Diet on Request',
] as const;

export const ID_TYPES = [
  'Aadhaar Card', 'PAN Card', 'Driving License', 'Voter ID',
  'Passport', 'Government ID',
] as const;

export const UNSPLASH_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1920&q=80',
  dharamshala: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80',
  mcleodganj: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80',
  bhagsu: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80',
  dharamkot: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  naddi: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
  triund: 'https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?w=800&q=80',
  mountains: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&q=80',
  hotel1: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  hotel2: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
  hotel3: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
  hotel4: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80',
  hotel5: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  hotel6: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
  room1: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80',
  room2: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
  cafe: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&q=80',
  taxi: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80',
  trek1: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80',
  trek2: 'https://images.unsplash.com/photo-1486911278844-a81c5267e227?w=800&q=80',
  monastery: 'https://images.unsplash.com/photo-1567591370504-80e1efea0e5c?w=800&q=80',
  prayer_flags: 'https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?w=600&q=80',
  paragliding: 'https://images.unsplash.com/photo-1503264116251-35a269479413?w=800&q=80',
} as const;

