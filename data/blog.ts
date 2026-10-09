import { BlogPost } from '@/types';
import { placeImage } from '@/lib/place-images';
import { photoCredits } from './photo-credits';
import { blogPostsA } from './blog-posts-a';
import { blogPostsB } from './blog-posts-b';
import { blogPostsC } from './blog-posts-c';
import { blogPostsW1 } from './blog-posts-w1';
import { blogPostsW2 } from './blog-posts-w2';
import { blogPostsW3 } from './blog-posts-w3';
import { blogPostsW4 } from './blog-posts-w4';
import { blogPostsW5 } from './blog-posts-w5';
import { blogPostsW6 } from './blog-posts-w6';
import { blogPostsW7 } from './blog-posts-w7';
import { blogPostsW8 } from './blog-posts-w8';
import { blogPostsW9 } from './blog-posts-w9';
import { blogPostsE1 } from './blog-posts-e1';
import { coreOverrides } from './blog-core';

// Real photos of each place (see lib/place-images.ts).
const UI = {
  hotel1: placeImage('dharamshala-town'),
  mcleodganj: placeImage('mcleod-ganj'),
  trek1: placeImage('triund'),
  mountains: placeImage('kangra-valley'),
  cafe: placeImage('mcleod-cafe'),
  dharamshala: placeImage('dharamshala-town'),
  paragliding: placeImage('bir-paragliding'),
  taxi: placeImage('mountain-road'),
  dharamkot: placeImage('dharamkot'),
  naddi: placeImage('naddi'),
  bhagsu: placeImage('bhagsu-waterfall'),
};

const corePosts: BlogPost[] = [
  {
    id: 'blog-1', slug: 'best-hotels-in-dharamshala',
    title: 'Best Hotels in Dharamshala for Every Budget (2026)',
    excerpt: 'From luxury resorts to cosy homestays -- our top hotel picks in Dharamshala, curated by locals who know every property personally.',
    content: `## Why Trust Our Hotel Recommendations?

We are a local team based in Dharamshala. Every hotel on this list has been personally visited and verified by our team. We check the rooms, the views, the water pressure, and the WiFi speed -- the things that actually matter. Read [how we built our platform](/blog/how-we-built-dharamshala-stay) to understand our approach.

## Budget Hotels in Dharamshala (Under Rs.2,000/night)

For budget travellers, Dharamshala offers surprisingly good value. Clean rooms with hot water, mountain views, and home-cooked meals can be found for as little as Rs.800 per night. Areas like lower Dharamshala and Dari village offer the best deals.

Many budget guesthouses are family-run, which means authentic Himachali hospitality. If you are visiting during [monsoon season](/blog/dharamshala-monsoon-travel-guide), prices drop even further -- 30-50% off peak rates.

## Mid-Range Hotels (Rs.2,000 - Rs.5,000/night)

This is the sweet spot for most travellers. You get private balconies with Dhauladhar views, attached bathrooms with 24-hour hot water, room heaters in winter, and often breakfast included. If you prefer staying in [McLeod Ganj specifically](/blog/best-hotels-in-mcleod-ganj), that area has the densest concentration of mid-range options.

## Luxury and Boutique Stays (Rs.5,000+/night)

The Naddi and upper Dharamshala areas have the best luxury properties with dramatic valley views. Several boutique homestays in Dharamkot also offer a unique upscale experience -- perfect if you are planning a [digital nomad workation](/blog/dharamshala-for-digital-nomads).

## How to Book at the Best Price

Booking through [our hotels page](/hotels) is often cheaper than the big booking sites because we deal with property owners directly. Send us your dates and compare.

## When to Visit for Best Rates

Timing matters hugely for hotel pricing. Check our [month-by-month guide](/blog/best-time-to-visit-dharamshala) to find the sweet spot of good weather and reasonable prices. October-November is our top recommendation for value seekers.

## Planning Your Stay

For a quick trip, our [weekend itinerary guide](/blog/dharamshala-weekend-itinerary) helps you make the most of 2-3 days. [Browse all hotels](/hotels) or [contact us](/contact) for personalized recommendations.`,
    category: 'Hotels', tags: ['hotels', 'dharamshala', 'budget travel', 'luxury hotels', 'accommodation'],
    author: 'Dharamshala Stay Team', published_at: '2026-01-15', updated_at: '2026-10-01',
    image: UI.hotel1, image_alt: 'Dharamshala town spread across the Kangra Valley hillside',
    read_time: 8, featured: true,
    meta_title: 'Best Hotels in Dharamshala 2026 - Budget to Luxury | Local Guide',
    meta_description: 'Discover the best hotels in Dharamshala for every budget. Locally verified picks from Rs.800 to Rs.15,000/night. Up to Rs.500 off when you book with us.',
    related_slugs: ['best-hotels-in-mcleod-ganj', 'best-time-to-visit-dharamshala'],
  },
  {
    id: 'blog-2', slug: 'best-hotels-in-mcleod-ganj',
    title: 'Best Hotels in McLeod Ganj - Where to Stay (2026)',
    excerpt: 'McLeod Ganj offers everything from backpacker hostels to boutique retreats. Here are our top picks by area and budget.',
    content: `## McLeod Ganj: The Heart of Little Lhasa

McLeod Ganj is the most popular destination in the Dharamshala region. It is the home of the Dalai Lama, a hub of Tibetan culture, and the starting point for the famous [Triund trek](/blog/triund-trek-complete-guide). Choosing the right hotel depends on what experience you want.

## By Area: Where Should You Stay?

**Main Market Area** -- Walking distance to temples, restaurants, and [the best cafes](/blog/top-cafes-in-mcleod-ganj). Can be noisy on weekends. Best for short stays.

**Jogiwara Road** -- Popular with solo travellers and [digital nomads](/blog/dharamshala-for-digital-nomads). Good WiFi cafes nearby.

**Temple Road** -- Close to the Tsuglagkhang Complex. Peaceful, spiritual vibe with premium pricing.

**Naddi and Upper McLeod Ganj** -- Best panoramic views of the Kangra Valley. Quieter, more spacious properties.

## Budget Recommendations

For backpackers, dorm beds start at Rs.400/night. Private rooms in clean guesthouses start around Rs.800-1,200. For more budget options across the region, see our [Dharamshala hotels guide](/blog/best-hotels-in-dharamshala).

## Booking Tips

Book 2-3 weeks in advance during peak season (April-June, October-November). Check our [best time to visit guide](/blog/best-time-to-visit-dharamshala) for crowd levels by month. For the best rates, [book directly through us](/hotels) rather than OTAs.

## Combine Your Stay

Many guests combine McLeod Ganj with a [Bir Billing paragliding day trip](/blog/bir-billing-paragliding-guide) or a [weekend itinerary](/blog/dharamshala-weekend-itinerary) covering the highlights. We can arrange everything including [airport and intercity taxis](/blog/dharamshala-to-delhi-taxi-guide).`,
    category: 'Hotels', tags: ['hotels', 'mcleod-ganj', 'accommodation', 'where to stay'],
    author: 'Dharamshala Stay Team', published_at: '2026-01-20', updated_at: '2026-10-01',
    image: UI.mcleodganj, image_alt: 'McLeod Ganj town, the Little Lhasa above Dharamshala',
    read_time: 7, featured: true,
    meta_title: 'Best Hotels in McLeod Ganj 2026 - Area Guide | Dharamshala Stay',
    meta_description: 'Find the best hotels in McLeod Ganj by area and budget. Temple Road, Jogiwara, Naddi - our local team picks the top stays.',
    related_slugs: ['best-hotels-in-dharamshala', 'top-cafes-in-mcleod-ganj'],
  },
  {
    id: 'blog-3', slug: 'triund-trek-complete-guide',
    title: 'Triund Trek: The Complete Guide for 2026',
    excerpt: 'Everything you need for Triund -- route details, permits, camping tips, packing list, and insider advice from local guides.',
    content: `## Why Triund Is One of Himachal's Most Popular Treks

Triund is about 9 km from McLeod Ganj (6-7 km from Gallu Devi temple above Dharamkot) to a stunning ridge at roughly 2,850 metres with panoramic views of the Dhauladhar range. It is doable in a single day or an overnight camping trip. Most visitors make it the highlight of their [Dharamshala weekend itinerary](/blog/dharamshala-weekend-itinerary).

## Route and Distance

The standard route starts from Gallu Devi temple above Dharamkot. From there the trail is about 6-7 km one way -- 4-5 hours up, 2-3 hours down. The first half is gentle through oak forests. The second half gets steep with rocky patches.

## Permits and Fees

Forest Department entry fee: Rs.100 per person per day. Overnight tent fee: about Rs.550 for two people (includes entry). Overnight stays at the top are capped (about 20 tents / 40 people), so book camping through a registered operator. Fees were last revised in 2024 -- check locally before you go.

**2026 updates:** since 11 August 2026 trekkers on the Triund route also pay a **refundable Rs.500 waste deposit** at the forest checkpost and get a garbage bag -- bring your non-biodegradable waste back down to get the deposit back. In January 2026 the Kangra District Disaster Management Authority also restricted trekking above 3,000 m and routed permission for Triund and Kareri through the SP Kangra office during bad-weather spells. Rules have been changing through 2026, so confirm the current position at the Gallu checkpost or with us before you set out. See our [Triund camping guide](/blog/triund-camping-guide) for overnight rules.

## Best Time to Trek

March to June and September to November are ideal. Check our [month-by-month weather guide](/blog/best-time-to-visit-dharamshala) for detailed conditions. During [monsoon](/blog/dharamshala-monsoon-travel-guide), the trail is slippery, and in monsoon or after heavy snowfall the district administration sometimes closes Triund and higher treks -- check current orders before you go.

## What to Pack

Carry 2 litres of water, energy snacks, rain jacket, sunscreen, headlamp if camping, warm layers (even summer evenings drop to 5-10 degrees at the summit).

## Where to Stay Before/After

We recommend staying in [McLeod Ganj](/blog/best-hotels-in-mcleod-ganj) the night before your trek. Many [budget hotels in Dharamshala](/blog/best-hotels-in-dharamshala) are also within 30 minutes of the trailhead.

## Want More Adventure?

If Triund gives you the trekking bug, consider a [Bir Billing paragliding trip](/blog/bir-billing-paragliding-guide) for a completely different adrenaline rush. [Browse our trek packages](/treks) or [contact us](/contact) for guided trips.`,
    category: 'Treks', tags: ['triund', 'trekking', 'dharamshala', 'hiking', 'camping'],
    author: 'Dharamshala Stay Team', published_at: '2026-02-01', updated_at: '2026-10-01',
    image: UI.trek1, image_alt: 'Triund summit with Dhauladhar mountain view',
    read_time: 10, featured: true,
    meta_title: 'Triund Trek Guide 2026 - Route, Permits, Camping | Dharamshala Stay',
    meta_description: 'Complete Triund trek guide: 9 km trail from McLeod Ganj, entry fees, camping rules, best months. Book guided treks with local experts.',
    related_slugs: ['best-time-to-visit-dharamshala', 'dharamshala-weekend-itinerary'],
  },
  {
    id: 'blog-4', slug: 'best-time-to-visit-dharamshala',
    title: 'Best Time to Visit Dharamshala: Month-by-Month Guide (2026)',
    excerpt: 'Season-by-season breakdown of weather, crowds, pricing, and the best activities for each time of year.',
    content: `## Dharamshala Weather Overview

Dharamshala sits at 1,457 metres in the Kangra Valley. The climate varies dramatically -- warm springs to freezing winters. Understanding this helps you find the [best hotel deals](/blog/best-hotels-in-dharamshala) and plan the right activities.

## March to June: Peak Season

Temperatures 15-30 degrees, clear skies, Dhauladhar range visible. [Triund trek](/blog/triund-trek-complete-guide) is in prime condition. [Paragliding at Bir Billing](/blog/bir-billing-paragliding-guide) has the best thermals. Hotels are at peak pricing so book early through [our platform](/hotels).

## July to September: Monsoon

Heavy rainfall, possible landslides. But lush green landscapes and 30-50% hotel discounts. Read our complete [monsoon travel guide](/blog/dharamshala-monsoon-travel-guide) if you are considering a rainy season visit.

## October to November: Autumn Golden Period

The best kept secret. Clear skies, 10-25 degrees, golden autumn colours, fewer tourists. [Cafes in McLeod Ganj](/blog/top-cafes-in-mcleod-ganj) are less crowded. Hotel rates are moderate. Triund is in excellent condition.

## December to February: Winter

Cold but beautiful. McLeod Ganj, Naddi and Dharamkot get occasional snowfall, most likely between late December and February, but snow is not guaranteed every year; lower Dharamshala rarely sees it. Carry heavy woolens and check road conditions. If you need a [taxi from Delhi](/blog/dharamshala-to-delhi-taxi-guide), allow extra time for mountain roads.

## Our Recommendation

Visit in October or early November. Best weather, uncrowded trails, reasonable rates. If you only have a weekend, follow our [2-night itinerary](/blog/dharamshala-weekend-itinerary) for the perfect short trip. [Digital nomads](/blog/dharamshala-for-digital-nomads) often prefer March-May for the longest pleasant season.`,
    category: 'Travel Tips', tags: ['dharamshala', 'weather', 'travel planning', 'seasons', 'when to visit'],
    author: 'Dharamshala Stay Team', published_at: '2026-02-10', updated_at: '2026-10-01',
    image: UI.mountains, image_alt: 'Kangra Valley and the Dhauladhar range on a clear day',
    read_time: 7, featured: false,
    meta_title: 'Best Time to Visit Dharamshala 2026 - Month-by-Month Guide',
    meta_description: 'When to visit Dharamshala? March-June for trekking, Oct-Nov for fewer crowds, Dec-Feb for snow. Complete season guide with prices.',
    related_slugs: ['triund-trek-complete-guide', 'dharamshala-monsoon-travel-guide'],
  },
  {
    id: 'blog-5', slug: 'top-cafes-in-mcleod-ganj',
    title: 'Top 12 Cafes in McLeod Ganj You Must Visit (2026)',
    excerpt: 'From Tibetan butter tea to artisan espresso -- the cafes our team visits every week, with honest reviews.',
    content: `## Why McLeod Ganj Has One of India's Best Cafe Scenes

McLeod Ganj packs an unusually dense mix of great cafes into a few walkable streets. The combination of Tibetan culinary influence, backpacker culture, and stunning views has created a cafe scene unlike anywhere else. It is one reason [digital nomads love this town](/blog/dharamshala-for-digital-nomads).

## Our Top Picks

**1. Jimmy's Italian Kitchen** -- Jogiwara Road. Wood-fired pizzas and handmade pasta. Great mountain views from the terrace.

**2. Illiterati Books and Coffee** -- A bookshop-cafe with possibly the best view in McLeod Ganj. The coffee is good, the cake is better.

**3. Moonpeak Espresso** -- Serious about coffee. They source and roast their own beans. Small space, big flavour.

**4. Common Ground Cafe** -- A favourite with remote workers. Reliable WiFi, good coffee, relaxed atmosphere.

**5. Lung Ta Japanese Kitchen** -- Unique matcha and Japanese snacks in the Himalayas.

**6-12.** Tibet Kitchen (best momos), Nick's Italian Kitchen (great pasta), Clay Oven (rooftop), Carpe Diem (traveller vibes), Woeser Bakery (Tibetan pastries), Peace Cafe (quiet courtyard), Crepe Pancake Hut (sweet and savoury crepes).

## Tips for Cafe Hopping

Most cafes close by 9 PM. Weekends get crowded during [peak season](/blog/best-time-to-visit-dharamshala). Many do not accept cards -- carry cash.

## Where to Stay Nearby

For the best cafe access, stay in the [McLeod Ganj main market area](/blog/best-hotels-in-mcleod-ganj). If you are here for a [weekend trip](/blog/dharamshala-weekend-itinerary), day 1 is perfect for cafe hopping before your [Triund trek](/blog/triund-trek-complete-guide) on day 2. [Browse McLeod Ganj hotels](/hotels) for stays within walking distance.`,
    category: 'Food', tags: ['cafes', 'mcleod-ganj', 'food', 'restaurants', 'coffee'],
    author: 'Dharamshala Stay Team', published_at: '2026-02-15', updated_at: '2026-10-01',
    image: UI.cafe, image_alt: 'Cafe street scene in McLeod Ganj',
    read_time: 6, featured: false,
    meta_title: 'Top 12 Cafes in McLeod Ganj 2026 - Local Picks | Dharamshala Stay',
    meta_description: 'Best cafes in McLeod Ganj: Illiterati, Moonpeak Espresso, Jimmy\'s Italian + 9 more. Honest reviews by locals.',
    related_slugs: ['best-hotels-in-mcleod-ganj', 'dharamshala-for-digital-nomads'],
  },
  {
    id: 'blog-6', slug: 'how-we-built-dharamshala-stay',
    title: 'How We Built Our Travel Business: Tools and Services We Rely On',
    excerpt: 'A behind-the-scenes look at how Dharamshala Stay was built from scratch -- the technology, the team decisions, and the experts who helped us launch.',
    content: `## From Local Knowledge to a Live Travel Platform

We started Dharamshala Stay with one clear advantage: we live here. We know every hotel owner by name, every [trek trail](/blog/triund-trek-complete-guide) by heart, and every taxi driver by reputation. But turning that into a platform that competes with MakeMyTrip? That was a different challenge.

## The Technology Stack

We chose Next.js for server-side rendering (critical for SEO -- we need Google to rank our [hotel pages](/hotels)), Supabase for our database, and Vercel for hosting. This lets us ship updates multiple times a week.

## Getting Expert Help

The biggest unlock was finding the right consulting partner. We worked with <a href="https://helpbyexperts.com" target="_blank" rel="dofollow">HelpByExperts</a> early in our journey for technical strategy and business consulting. They helped us think through the platform architecture, SEO strategy, and competitive positioning against the big OTAs.

If you are building a travel business or any online platform, we genuinely recommend <a href="https://helpbyexperts.com" target="_blank" rel="dofollow">helpbyexperts.com</a>. They understand the intersection of technology and business strategy.

## SEO: Our Growth Engine

Every hotel page has structured schema markup, auto-generated meta titles targeting local keywords, and fast loading. We also write content targeting long-tail searches -- our [Triund trek guide](/blog/triund-trek-complete-guide), [McLeod Ganj hotels guide](/blog/best-hotels-in-mcleod-ganj), and [seasonal travel guide](/blog/best-time-to-visit-dharamshala) bring in consistent organic traffic.

## Our Content Strategy

We write about what real travellers search for: [best cafes](/blog/top-cafes-in-mcleod-ganj), [weekend itineraries](/blog/dharamshala-weekend-itinerary), [monsoon travel tips](/blog/dharamshala-monsoon-travel-guide), [digital nomad guides](/blog/dharamshala-for-digital-nomads), and [taxi routes](/blog/dharamshala-to-delhi-taxi-guide). Each post links to our service pages and other guides, building topical authority.

## Key Takeaways

Build with SEO from day one. Use local knowledge as your moat. Find experts who have been there before. And pick a stack that lets you iterate fast. [Reach out](/contact) if you want to chat about building something similar.`,
    category: 'Behind the Scenes', tags: ['startup', 'travel tech', 'business', 'tools', 'seo'],
    author: 'Dharamshala Stay Team', published_at: '2026-03-15', updated_at: '2026-10-01',
    image: UI.dharamshala, image_alt: 'Dharamshala valley view - behind the scenes of building a travel startup',
    read_time: 9, featured: true,
    meta_title: 'How We Built Dharamshala Stay - Tools, Tech & Expert Services',
    meta_description: 'Behind the scenes of building a travel booking platform. Our tech stack, SEO strategy, AI tools, and the consulting experts who helped us launch.',
    related_slugs: ['best-hotels-in-dharamshala', 'dharamshala-to-delhi-taxi-guide'],
  },
  {
    id: 'blog-7', slug: 'bir-billing-paragliding-guide',
    title: 'Bir Billing Paragliding from Dharamshala: Complete Guide (2026)',
    excerpt: 'Everything about paragliding at Bir Billing -- costs, best season, what to expect, safety tips, and how to book from Dharamshala.',
    content: `## Bir Billing: The Paragliding Capital of India

Bir Billing, about 70 km from Dharamshala, is India's best-known paragliding site and hosted the 2015 Paragliding World Cup. The roughly 1,000-metre height difference between Billing (about 2,400 m) and Bir gives standard tandem flights of about 15-30 minutes over the Kangra Valley. Many guests combine it with their [Dharamshala weekend trip](/blog/dharamshala-weekend-itinerary).

## How to Get There from Dharamshala

Bir is 2-2.5 hours from McLeod Ganj. [Hire a taxi](/taxi) (approximately Rs.2,500 one way) or take a local bus (Rs.150, 3 hours). We offer packages including pickup from your [Dharamshala hotel](/blog/best-hotels-in-dharamshala), the flight, HD video, and drop-back. [Check our paragliding page](/paragliding).

## Types of Flights

**Tandem Flight** -- Fly with a certified pilot. No experience needed. 15-30 minutes. Cost: approx. Rs.2,500-4,500 for the flight (as of 2026), depending on duration; transport from Dharamshala extra or as part of a package. Flying is banned every year from 15 July to 15 September.

**Solo Flying** -- For licensed pilots (P2+). Gear rental available in Bir.

**Courses** -- P1 and P2 courses take roughly 5-14 days in total; contact registered schools in Bir for current fees.

## Best Season

March to June for strongest thermals. October-November for clear skies. See our [seasonal guide](/blog/best-time-to-visit-dharamshala) for month-by-month details. [Monsoon](/blog/dharamshala-monsoon-travel-guide) shuts down most operators.

## Where to Stay

If you want to stay overnight in Bir, there are charming cafes and guesthouses. Otherwise, stay in [McLeod Ganj](/blog/best-hotels-in-mcleod-ganj) and do Bir as a day trip. After landing, the cafes in Bir's Tibetan colony are great for a post-flight celebratory coffee.

## Is It Worth It?

Absolutely. Most guests say it was the highlight of their trip. Combine it with a [Triund trek](/blog/triund-trek-complete-guide) for the ultimate adventure weekend. [Book your paragliding trip](/paragliding).`,
    category: 'Activities', tags: ['paragliding', 'bir billing', 'adventure', 'dharamshala', 'activities'],
    author: 'Dharamshala Stay Team', published_at: '2026-03-01', updated_at: '2026-10-01',
    image: UI.paragliding, image_alt: 'Paragliding over Bir Billing Kangra Valley',
    read_time: 8, featured: false,
    meta_title: 'Bir Billing Paragliding from Dharamshala 2026 - Costs, Season, Safety',
    meta_description: 'Complete Bir Billing paragliding guide. Tandem flights from Rs.2,500, best season March-June. Book from Dharamshala with taxi included.',
    related_slugs: ['triund-trek-complete-guide', 'dharamshala-weekend-itinerary'],
  },
  {
    id: 'blog-8', slug: 'dharamshala-to-delhi-taxi-guide',
    title: 'Dharamshala to Delhi by Taxi: Routes, Costs, and Tips (2026)',
    excerpt: 'Complete guide to hiring a taxi from Dharamshala to Delhi -- best routes, current rates, overnight vs day journey, and booking tips.',
    content: `## Getting from Dharamshala to Delhi

The journey is approximately 480 km, 9-11 hours by road. A private taxi offers the most comfortable journey, especially if you are coming from [one of the hotels](/blog/best-hotels-in-dharamshala) and have luggage.

## Routes

**Via Chandigarh, Una and Kangra** -- about 480-520 km, 10-11 hours. Most common. Good highway after Chandigarh.

**Via Jalandhar and Pathankot (NH44)** -- about 480-500 km, 9-10 hours. Slightly shorter. Good roads throughout.

## Current Rates (2026)

Sedan (Dzire/Etios): Rs.7,500-8,000. SUV (Innova/Ertiga): Rs.9,000-9,500. Luxury (Crysta): Rs.11,000-12,000. Toll charges (Rs.500-700) usually extra.

## Day Journey vs Overnight

Morning departure (5-6 AM) reaching Delhi by 3-5 PM is safest. This works perfectly after checkout from your [McLeod Ganj hotel](/blog/best-hotels-in-mcleod-ganj).

## Local Taxis Too

We also arrange airport transfers, sightseeing trips, and [Bir Billing paragliding transport](/blog/bir-billing-paragliding-guide). For a complete [weekend itinerary](/blog/dharamshala-weekend-itinerary), we can handle all transport. During [monsoon](/blog/dharamshala-monsoon-travel-guide), always check road conditions before departing.

## Booking

[Check our taxi rates](/taxi) or WhatsApp us. We use verified local drivers who know the mountain roads well. Book 24 hours in advance, especially during [peak season](/blog/best-time-to-visit-dharamshala).`,
    category: 'Transport', tags: ['taxi', 'delhi', 'dharamshala', 'transport', 'travel tips'],
    author: 'Dharamshala Stay Team', published_at: '2026-03-05', updated_at: '2026-10-01',
    image: UI.taxi, image_alt: 'Mountain road through the Kangra hills near Dharamshala',
    read_time: 7, featured: false,
    meta_title: 'Dharamshala to Delhi Taxi 2026 - Routes, Rates Rs.7,500+ | Book Now',
    meta_description: 'Dharamshala to Delhi taxi guide. Sedan Rs.7,500, SUV Rs.9,000. 9-11 hours via Chandigarh or Pathankot. Book reliable local drivers.',
    related_slugs: ['best-time-to-visit-dharamshala', 'dharamshala-weekend-itinerary'],
  },
  {
    id: 'blog-9', slug: 'dharamshala-weekend-itinerary',
    title: 'Perfect Dharamshala Weekend Itinerary: 2 Nights, 3 Days (2026)',
    excerpt: 'Make the most of a short trip with our day-by-day itinerary covering temples, treks, cafes, and hidden local spots.',
    content: `## Day 1: Arrive and Explore McLeod Ganj

**Morning:** Arrive in Dharamshala. Check into your [McLeod Ganj hotel](/blog/best-hotels-in-mcleod-ganj). Grab breakfast at a [local cafe](/blog/top-cafes-in-mcleod-ganj).

**Late Morning:** Visit the Tsuglagkhang Complex and the [Tibet Museum](/blog/dalai-lama-temple-guide). The temple is free to enter.

**Afternoon:** Walk the McLeod Ganj market. Momos at Tibet Kitchen.

**Evening:** Sunset Point for golden hour views. Dinner at Jimmy's Italian Kitchen or Illiterati.

## Day 2: Triund Trek or Bhagsu Day

**Option A: [Triund Trek](/blog/triund-trek-complete-guide)** -- Start 7 AM. Drive to Gallu Devi temple. Trek about 6-7 km to the top. Return by evening.

**Option B: Bhagsu + Dharamkot** -- Walk to Bhagsu village, visit the waterfall, continue to Dharamkot for panoramic views and hilltop cafes.

## Day 3: Culture and Departure

**Morning:** Norbulingka Institute (about 12 km, 30-40 min by taxi from McLeod Ganj; small entry fee). Beautiful Tibetan arts centre. Great gardens and cafe.

**Before Departure:** Pick up souvenirs. If heading to Delhi, our [taxi service](/blog/dharamshala-to-delhi-taxi-guide) can pick you up from the hotel. For your next visit, consider adding [Bir Billing paragliding](/blog/bir-billing-paragliding-guide).

## Budget Estimate

Rs.8,000-15,000 for two people including [hotel (2 nights)](/hotels), meals, activities, and local transport. [Best time to visit](/blog/best-time-to-visit-dharamshala): October-November for weather and value. [Digital nomads](/blog/dharamshala-for-digital-nomads) often extend this into a week-long workation.

## Book Your Weekend

[Browse hotels](/hotels) or [WhatsApp us](/contact) for a custom package.`,
    category: 'Travel Tips', tags: ['itinerary', 'weekend trip', 'dharamshala', 'mcleod ganj', 'travel planning'],
    author: 'Dharamshala Stay Team', published_at: '2026-03-10', updated_at: '2026-10-01',
    image: UI.dharamkot, image_alt: 'Panoramic view from Dharamkot near McLeod Ganj',
    read_time: 8, featured: true,
    meta_title: 'Dharamshala Weekend Itinerary 2026 - 2N/3D Perfect Plan | Local Guide',
    meta_description: 'Plan the perfect Dharamshala weekend: Day 1 temples & cafes, Day 2 Triund trek, Day 3 Norbulingka. Budget Rs.8,000-15,000 for two.',
    related_slugs: ['best-hotels-in-mcleod-ganj', 'triund-trek-complete-guide'],
  },
  {
    id: 'blog-10', slug: 'dharamshala-for-digital-nomads',
    title: 'Dharamshala for Digital Nomads: WiFi, Coworking, and Living Guide (2026)',
    excerpt: 'Can you work remotely from Dharamshala? Yes. Here is everything about internet, coworking, accommodation, and costs.',
    content: `## Why Digital Nomads Are Choosing Dharamshala

High-speed internet, affordable living, mountain scenery, and a welcoming international community. Dharamshala is one of India's most popular mountain bases for remote work. Learn [how we built our own platform](/blog/how-we-built-dharamshala-stay) while working from here.

## Internet and Connectivity

Jio and Airtel offer 4G and, in many areas, 5G; speeds vary by location. Many [hotels and cafes](/blog/top-cafes-in-mcleod-ganj) offer WiFi. For long stays, look for accommodation with fibre broadband (50-100 Mbps).

## Work-Friendly Cafes

Common Ground Cafe (Temple Road) -- reliable WiFi. Illiterati -- beautiful but crowded. Moonpeak Espresso -- excellent coffee, small space. See our full [cafe guide](/blog/top-cafes-in-mcleod-ganj) for more options.

## Cost of Living

Accommodation Rs.12,000-20,000/month, food Rs.8,000-12,000, coworking Rs.5,000-8,000, transport Rs.2,000-3,000. Total: Rs.30,000-50,000/month. Much cheaper than [Delhi](/blog/dharamshala-to-delhi-taxi-guide).

## Best Areas to Stay

[McLeod Ganj](/blog/best-hotels-in-mcleod-ganj) for convenience. Dharamkot for peace and views. Naddi for the most dramatic scenery. See our [Dharamshala hotel guide](/blog/best-hotels-in-dharamshala) for verified options with WiFi.

## When to Come

March-May and October-November offer the best weather for outdoor breaks. Avoid [monsoon](/blog/dharamshala-monsoon-travel-guide) unless you enjoy the rain. Check our [seasonal guide](/blog/best-time-to-visit-dharamshala) for details.

## Weekend Adventures

Break up your work weeks with a [Triund trek](/blog/triund-trek-complete-guide) or [Bir Billing paragliding](/blog/bir-billing-paragliding-guide). Follow our [weekend itinerary](/blog/dharamshala-weekend-itinerary) for the perfect 2-day reset. [Contact us](/contact) for nomad-friendly accommodation.`,
    category: 'Travel Tips', tags: ['digital nomad', 'remote work', 'dharamshala', 'coworking', 'wifi'],
    author: 'Dharamshala Stay Team', published_at: '2026-03-18', updated_at: '2026-10-01',
    image: UI.naddi, image_alt: 'Mountain view from Naddi - ideal for digital nomads',
    read_time: 8, featured: false,
    meta_title: 'Dharamshala Digital Nomad Guide 2026 - WiFi, Coworking, Costs',
    meta_description: 'Work remotely from Dharamshala. WiFi, 4G/5G, living cost Rs.30,000-50,000/month, coworking spaces, best areas for nomads.',
    related_slugs: ['top-cafes-in-mcleod-ganj', 'best-hotels-in-dharamshala'],
  },
  {
    id: 'blog-11', slug: 'dharamshala-monsoon-travel-guide',
    title: 'Visiting Dharamshala in Monsoon: What to Expect (July-September 2026)',
    excerpt: 'Is monsoon a good time to visit? The honest answer, plus tips for making the most of a rainy season trip.',
    content: `## The Honest Truth About Monsoon in Dharamshala

Dharamshala receives 3,000+ mm of rainfall annually, mostly in July-August. Roads can get blocked, [Triund trek](/blog/triund-trek-complete-guide) is unsafe, and [paragliding at Bir](/blog/bir-billing-paragliding-guide) shuts down. But there is another side to the story.

## The Downsides

Landslides can block roads (keep this in mind if you need a [taxi to Delhi](/blog/dharamshala-to-delhi-taxi-guide)). Leeches on forest trails. Many mountain-view properties have zero visibility.

## The Upsides

Waterfalls everywhere, lush green hills, 15-22 degree temperatures. And the biggest draw: [hotel prices crash 30-50%](/blog/best-hotels-in-dharamshala). A Rs.4,000 room for Rs.2,000.

## Best Activities During Monsoon

Tsuglagkhang Complex and Tibet Museum. Norbulingka Institute. Tibetan cooking classes. Meditation sessions. The [cafe scene](/blog/top-cafes-in-mcleod-ganj) thrives as people spend more time indoors. Tea Gardens in Kangra. [Digital nomads](/blog/dharamshala-for-digital-nomads) love the quiet monsoon vibe.

## Tips for Monsoon Travel

Waterproof shoes and rain jacket essential. Check road conditions daily. Book refundable [hotels](/hotels). Travel insurance recommended.

## September: The Smart Month

Reduced rainfall, lush green landscape, low prices, sun appearing. Arguably the most underrated month. See our [seasonal overview](/blog/best-time-to-visit-dharamshala) for comparison. If you have a weekend free, our [2-night itinerary](/blog/dharamshala-weekend-itinerary) works in September with minor rain adjustments.

## Where to Stay in Monsoon

[McLeod Ganj hotels](/blog/best-hotels-in-mcleod-ganj) are most convenient when it rains -- everything walkable, no taxi needed. [Book monsoon-rate hotels](/hotels).`,
    category: 'Travel Tips', tags: ['monsoon', 'dharamshala', 'rainy season', 'budget travel', 'weather'],
    author: 'Dharamshala Stay Team', published_at: '2026-03-22', updated_at: '2026-10-01',
    image: UI.bhagsu, image_alt: 'Bhagsu waterfall near McLeod Ganj',
    read_time: 7, featured: false,
    meta_title: 'Dharamshala in Monsoon 2026 - Is It Worth Visiting? Honest Guide',
    meta_description: 'Should you visit Dharamshala in monsoon? Hotels 30-50% cheaper, waterfalls at peak, but road risks. Complete July-September guide.',
    related_slugs: ['best-time-to-visit-dharamshala', 'best-hotels-in-dharamshala'],
  },
];

/** Alt text must describe the actual photo, so take it from the verified photo manifest. */
function withPhotoAlt(post: BlogPost): BlogPost {
  const key = post.image.match(/\/images\/places\/([a-z0-9-]+)\.jpg$/)?.[1];
  const credit = key ? photoCredits[key] : undefined;
  return credit ? { ...post, image_alt: credit.alt } : post;
}

/** All guides, newest first. */
export const blogPosts: BlogPost[] = [...blogPostsA, ...blogPostsB, ...blogPostsC, ...blogPostsW1, ...blogPostsW2, ...blogPostsW3, ...blogPostsW4, ...blogPostsW5, ...blogPostsW6, ...blogPostsW7, ...blogPostsW8, ...blogPostsW9, ...blogPostsE1, ...corePosts]
  .map((p) => (coreOverrides[p.slug] ? { ...p, ...coreOverrides[p.slug] } : p))
  .map(withPhotoAlt)
  .sort((a, b) => b.published_at.localeCompare(a.published_at));

export function getBlogBySlug(slug: string) { return blogPosts.find((b) => b.slug === slug); }
export function getAllBlogSlugs() { return blogPosts.map((b) => b.slug); }
export function getFeaturedBlogPosts(limit = 6) { return blogPosts.filter((b) => b.featured).slice(0, limit); }
export function getBlogCategories() { return Array.from(new Set(blogPosts.map((b) => b.category))); }

/** Explicit related_slugs first, then posts sharing the most tags/category. */
export function getRelatedPosts(post: BlogPost, limit = 4): BlogPost[] {
  const picked = post.related_slugs
    .map((s) => blogPosts.find((b) => b.slug === s))
    .filter((b): b is BlogPost => !!b);
  const score = (b: BlogPost) =>
    b.tags.filter((t) => post.tags.includes(t)).length * 2 + (b.category === post.category ? 1 : 0);
  const rest = blogPosts
    .filter((b) => b.slug !== post.slug && !picked.includes(b))
    .sort((a, b) => score(b) - score(a));
  return [...picked, ...rest].slice(0, limit);
}
