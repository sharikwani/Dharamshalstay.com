# Dharamshala Stay v2.0

**Full-Stack Travel Marketplace** for Dharamshala, McLeod Ganj & Kangra Valley tourism.

Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Supabase** — deployable to **Vercel**.

---

## What's Included

### Public Website (MMT-style design)
- **Homepage** — hero with search bar, destination cards, featured hotels, treks, taxi CTA, testimonials, blog previews, FAQs
- **Hotels** — filterable listing + detailed pages with image gallery, room types, pricing, amenities, policies, inquiry form, WhatsApp CTA
- **Destinations** — Dharamshala, McLeod Ganj, Bhagsu, Dharamkot, Naddi — each with description, things to do, hotels in area, FAQs
- **Treks** — Triund, Kareri Lake — with itinerary, includes/excludes, pricing, guide info
- **Taxi** — Airport/local/outstation routes table with pricing, inquiry form
- **Blog** — Travel guides with related posts
- **About / Contact / Legal pages**
- **Full SEO** — meta tags, Open Graph, JSON-LD schemas (Hotel, Article, FAQ, Organization, BreadcrumbList), sitemap.xml, robots.txt

### Partner Portal (for hoteliers)
Hoteliers can self-register and submit their property for review.

| Route | Purpose |
|---|---|
| `/partner/register` | Create partner account (name, business, phone, email, password) |
| `/partner/login` | Sign in |
| `/partner/dashboard` | View all their properties with status badges (draft, pending, published, changes requested, rejected) |
| `/partner/properties/new` | **6-step property submission form** (see below) |
| `/partner/properties/[id]/edit` | Edit draft or resubmit after admin requests changes |

**Property Submission Form — 6 Steps (like MakeMyTrip):**

1. **Basic Info** — name, type (hotel/homestay/hostel/guesthouse/resort/villa/camp), star rating, descriptions, total rooms, year, contact details (name, phone, email, WhatsApp)
2. **Location** — destination dropdown, full address, pincode, landmark, distance from bus stand/airport, latitude/longitude
3. **Rooms & Pricing** — multiple room types with name, bed type, description, size, max adults/children/occupancy, inventory count, base/weekend/peak price, meal plan (EP/CP/MAP/AP), check-in/out times, tax included toggle, online payment toggle
4. **Amenities** — checkboxes for 34 property amenities, 24 room amenities, 11 bathroom amenities, 15 food options
5. **Photos** — add image URLs with alt text, category (exterior/room/bathroom/view/etc), primary flag
6. **Policies** — cancellation, pet, smoking, alcohol, couple-friendly, child policy, extra bed charge, accepted ID types

Partners can **save as draft** at any step or **submit for review** from the final step.

### Admin / Approval Portal
Full admin control over the entire platform.

| Route | Purpose |
|---|---|
| `/admin/login` | Admin-only login (role-checked against Supabase profile) |
| `/admin/dashboard` | Stats overview (total properties, pending, published, inquiries) + quick action cards + pending submissions list + recent inquiries |
| `/admin/approvals` | Filter by status (pending/changes requested/published/rejected/all). Click any property to review. |
| `/admin/approvals/[id]` | **Full property review page** — view all submitted details, inline-edit any field, then: Approve & Publish / Request Changes (with note) / Reject (with reason). Edits save directly to DB. |
| `/admin/properties` | All properties table — toggle featured, suspend/restore, filter by status |
| `/admin/taxis` | **CRUD for taxi routes** — add/edit/delete routes (from, to, type, vehicle, price, distance, duration, status toggle). Taxi drivers can't self-register — admin enters everything. |
| `/admin/treks` | **CRUD for treks** — add/edit/delete treks (name, destination, difficulty, duration, altitude, price, description, itinerary, status) |
| `/admin/guides` | **CRUD for guides** — add/edit/delete guides (name, phone, email, photo, bio, experience, languages, specializations, certifications, price/day, status) |
| `/admin/inquiries` | View all inquiries, filter by status (new/contacted/converted/closed), update status with one click |

### Approval Workflow

```
Hotelier registers → Fills 6-step form → Submits for review
                                              ↓
                                      Status: pending_review
                                              ↓
                              Admin reviews at /admin/approvals/[id]
                              Can inline-edit any field
                                    ↓           ↓           ↓
                              APPROVE    REQUEST CHANGES    REJECT
                                ↓              ↓               ↓
                         Status: published   Status: changes_requested   Status: rejected
                         Property goes live   Partner sees admin notes    Partner sees reason
                                              Partner edits & resubmits
```

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (MMT-inspired blue/orange design system)
- **Fonts:** Poppins (headings) + Inter (body)
- **Database:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Images:** Unsplash (Dharamshala/mountain photos) via Next.js Image
- **Deployment:** Vercel

---

## File Structure (65 files)

```
dharamshala-stay/
├── app/
│   ├── layout.tsx, page.tsx, globals.css, loading.tsx, not-found.tsx
│   ├── robots.ts, sitemap.ts
│   ├── hotels/           (listing + [slug] detail)
│   ├── destinations/     (listing + [slug] detail)
│   ├── treks/            (listing + [slug] detail)
│   ├── taxi/             (routes + inquiry)
│   ├── blog/             (listing + [slug] detail)
│   ├── about/, contact/, privacy/, terms/, cancellation-policy/, disclaimer/
│   ├── sitemap-html/
│   ├── api/inquiries/    (POST endpoint)
│   ├── partner/
│   │   ├── register/, login/, dashboard/
│   │   └── properties/new/, properties/[id]/edit/
│   └── admin/
│       ├── login/, dashboard/
│       ├── approvals/, approvals/[id]/
│       ├── properties/, taxis/, treks/, guides/, inquiries/
├── components/
│   ├── layout/ (Header, Footer, WhatsAppButton)
│   ├── ui/     (Cards — HotelCard, DestinationCard, TrekCard, BlogCard, etc.)
│   ├── forms/  (InquiryForm)
│   └── seo/    (JsonLd)
├── data/       (hotels, destinations, treks, taxi, blog, testimonials)
├── lib/        (config, supabase, seo, utils)
├── types/      (comprehensive TypeScript types + constants)
├── supabase/   (schema.sql — 12 tables, RLS policies, triggers)
└── public/     (favicon)
```

---

## Setup

### 1. Local Development

```bash
cd dharamshala-stay
npm install
cp .env.example .env.local
# Fill in your Supabase credentials
npm run dev
```

### 2. Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → paste contents of `supabase/schema.sql` → Run
3. Copy your Project URL, Anon Key, Service Role Key into `.env.local`
4. Enable Email Auth in Authentication → Providers

**Create Admin Account:**
```sql
-- After signing up via the partner register page:
UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
```

### 3. Deploy to Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your domain)
   - `NEXT_PUBLIC_WHATSAPP_NUMBER`
   - `NEXT_PUBLIC_PHONE`
   - `NEXT_PUBLIC_EMAIL`
4. Deploy

---

## Supabase Tables

| Table | Purpose |
|---|---|
| `profiles` | User accounts (partner/admin) — auto-created via trigger on signup |
| `properties` | Hotels/homestays/hostels — full property data with status workflow |
| `property_images` | Optional separate image storage |
| `destinations` | Dharamshala, McLeod Ganj, etc. |
| `taxi_routes` | Admin-managed taxi routes |
| `guides` | Admin-managed trek guides |
| `treks` | Admin-managed treks |
| `inquiries` | Visitor inquiries from forms |
| `blog_posts` | Blog content |
| `testimonials` | Reviews |
| `activity_log` | Admin audit trail |

---

## Images

All images use Unsplash URLs for Dharamshala/McLeod Ganj/mountain content. To replace:
1. Upload your images to Supabase Storage or CDN
2. Update URLs in `data/hotels.ts`, `data/destinations.ts`, `data/treks.ts`
3. Or update property images through the Partner Portal

---

## How to Add Content

| Content | Method |
|---|---|
| **Hotels** | Partner registers → submits via 6-step form → Admin approves at `/admin/approvals` |
| **Taxis** | Admin adds/edits at `/admin/taxis` (drivers can't self-register) |
| **Treks** | Admin adds/edits at `/admin/treks` |
| **Guides** | Admin adds/edits at `/admin/guides` |
| **Blog** | Currently in `data/blog.ts` — future: admin CMS |
| **Inquiries** | Auto-collected via forms → managed at `/admin/inquiries` |

---

## Design System

- **Colors:** Brand blue (#1e3a5f primary, #2563eb accent), Orange (#ee5a24 CTA), Green (#00b894 ratings/WhatsApp)
- **Typography:** Poppins 600–800 headings, Inter 400–500 body
- **Components:** Rounded-xl cards, soft shadows, generous spacing, sticky headers
- **Mobile-first** responsive throughout
- **MMT-inspired:** Tab-based search, green rating badges, structured hotel cards, sticky inquiry sidebar

---

## Roadmap

**Phase 1 (Done):** Public site + Partner Portal + Admin Portal + Approval workflow
**Phase 2:** Email notifications on submission/approval, Supabase Storage image uploads, blog CMS in admin
**Phase 3:** Razorpay integration, online booking, availability calendar
**Phase 4:** User reviews, mobile app, multi-language (Hindi)
