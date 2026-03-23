import { NextRequest, NextResponse } from 'next/server';

const PROMPT = `You are extracting hotel data from an Indian OTA page (MakeMyTrip, Agoda, Booking.com, Goibibo, etc).

You are given:
- "text": All visible text from the fully rendered page (includes room names, prices, rate plans, amenities, everything a user sees)
- "images": All image URLs found on the page (property and room photos)
- "jsonLd": Any JSON-LD structured data embedded in the page
- "url": The page URL

EXTRACT EVERYTHING. Be extremely thorough. The text contains ALL the data.

For ROOMS:
- Find each room TYPE (e.g. "Deluxe Room", "Super Deluxe Room", "Premium Room")
- Under each room type, find ALL rate plan options. On MakeMyTrip these look like:
  * "Room With Free Cancellation" - cheapest, room only
  * "Room With Free Cancellation | Breakfast" - includes breakfast
  * "Room with Breakfast + Lunch/Dinner" - half board
  Each has a different price. EXTRACT ALL OF THEM.
- Room sizes, bed types, max occupancy, room-specific amenities

For IMAGES:
- The "images" array has ALL image URLs from the page
- Assign relevant room images to each room type
- Property-level photos (exterior, lobby, pool, restaurant) go in top-level images
- Room photos (showing beds, room interior) go in each room's images array
- Remove tiny images, icons, logos, and duplicates
- Use the highest quality version of each URL

Return ONLY valid JSON:
{
  "name": "Hotel Name",
  "type": "hotel|homestay|resort|guesthouse|villa|hostel|camp",
  "star_rating": 3,
  "description": "Detailed description from the page",
  "short_description": "One line for listings",
  "destination_slug": "dharamshala|mcleod-ganj|bhagsu|dharamkot|naddi",
  "address_line1": "Address",
  "city": "Dharamshala",
  "state": "Himachal Pradesh",
  "pincode": "",
  "latitude": null,
  "longitude": null,
  "landmark": "",
  "amenities": ["WiFi", "Parking", "Restaurant"],
  "room_amenities": [],
  "bathroom_amenities": [],
  "food_amenities": [],
  "check_in_time": "12:00",
  "check_out_time": "11:00",
  "cancellation_policy": "",
  "pet_policy": "No pets allowed",
  "smoking_policy": "Non-smoking",
  "couple_friendly": true,
  "rooms": [
    {
      "name": "Exact Room Type Name",
      "description": "Room description",
      "bed_type": "King|Queen|Double|Twin|Single",
      "room_size": "250 sq ft",
      "max_adults": 2,
      "max_children": 1,
      "max_occupancy": 3,
      "amenities": ["WiFi", "TV", "AC"],
      "images": ["https://room-photo-1.jpg", "https://room-photo-2.jpg"],
      "total_inventory": 1,
      "is_active": true,
      "rate_plans": [
        {"name": "Room Only - Free Cancellation", "meal_plan": "ep", "price": 2500, "cancellation": "Free cancellation", "includes": []},
        {"name": "Breakfast Included", "meal_plan": "cp", "price": 3200, "cancellation": "Free cancellation", "includes": ["Breakfast"]},
        {"name": "Breakfast + Dinner", "meal_plan": "map", "price": 4000, "cancellation": "Non-refundable", "includes": ["Breakfast", "Dinner"]}
      ],
      "base_price": 2500,
      "meal_plan": "ep"
    }
  ],
  "images": [
    {"url": "https://property-photo.jpg", "alt": "Hotel exterior", "category": "exterior", "is_primary": true, "sort_order": 0}
  ],
  "rating": 4.2,
  "review_count": 150,
  "nearby_attractions": [],
  "faqs": [{"question": "Q", "answer": "A"}],
  "meta_title": "SEO title with hotel name and area",
  "meta_description": "SEO description 150-160 chars"
}

RULES:
- base_price = lowest rate plan price
- Prices are NUMBERS only (no Rs, no commas). 2500 not "Rs. 2,500"
- meal_plan: ep=Room Only, cp=Breakfast, map=Breakfast+Dinner, ap=All Meals
- Extract EVERY room type and EVERY rate plan
- For images: categorize as exterior/room/bathroom/view/restaurant/lobby/pool/other
- Generate 6 relevant FAQs
- If price shows crossed-out and discounted, use discounted price`;


export async function POST(req: NextRequest) {
  try {
    const rawKey = process.env.OPENAI_API_KEY || '';
    const openaiKey = rawKey.trim().replace(/^["']|["']$/g, '');
    if (!openaiKey || !openaiKey.startsWith('sk-')) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured.' }, { status: 500 });
    }

    const body = await req.json();
    const { rawContent } = body;
    if (!rawContent || rawContent.trim().length < 100) {
      return NextResponse.json({ error: 'Content too short.' }, { status: 400 });
    }

    // Parse the structured data from the bookmarklet
    let extracted: any = {};
    try {
      extracted = JSON.parse(rawContent);
    } catch {
      // If not JSON, treat as raw text
      extracted = { text: rawContent, images: [], jsonLd: [] };
    }

    // Build content for GPT-4o
    let contentForAI = '';

    if (extracted.text) {
      // Trim text to 40K chars
      contentForAI += 'VISIBLE PAGE TEXT:\n' + extracted.text.substring(0, 40000) + '\n\n';
    }

    if (extracted.images && extracted.images.length > 0) {
      contentForAI += 'ALL IMAGE URLS FOUND ON PAGE (' + extracted.images.length + '):\n';
      extracted.images.forEach((url: string, i: number) => {
        contentForAI += (i + 1) + '. ' + url + '\n';
      });
      contentForAI += '\n';
    }

    if (extracted.jsonLd && extracted.jsonLd.length > 0) {
      contentForAI += 'JSON-LD STRUCTURED DATA:\n';
      extracted.jsonLd.forEach((ld: string) => {
        if (ld && ld.trim()) contentForAI += ld.substring(0, 5000) + '\n';
      });
      contentForAI += '\n';
    }

    if (extracted.url) {
      contentForAI += 'PAGE URL: ' + extracted.url + '\n';
    }

    console.log('[Import] Content for AI: ' + contentForAI.length + ' chars, ' + (extracted.images?.length || 0) + ' images');

    const requestBody = {
      model: 'gpt-4o',
      max_tokens: 12000,
      temperature: 0.1,
      response_format: { type: 'json_object' as const },
      messages: [
        { role: 'system' as const, content: 'You extract hotel data with perfect accuracy. Always return valid JSON.' },
        { role: 'user' as const, content: PROMPT + '\n\n---\n\n' + contentForAI },
      ],
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + openaiKey },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      let err = '';
      try { const ej = await res.json(); err = ej?.error?.message || JSON.stringify(ej); } catch { err = 'Unknown'; }
      console.error('[Import] OpenAI ' + res.status + ':', err);
      return NextResponse.json({ error: 'OpenAI error (' + res.status + '): ' + err }, { status: 500 });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) return NextResponse.json({ error: 'Empty response.' }, { status: 422 });

    let prop;
    try { prop = JSON.parse(text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()); }
    catch { return NextResponse.json({ error: 'Invalid format. Try again.', raw: text.substring(0, 1000) }, { status: 422 }); }

    // Normalize
    const n: any = {
      name: prop.name || '', type: prop.type || 'hotel', star_rating: prop.star_rating || null,
      description: prop.description || '', short_description: prop.short_description || '',
      destination_slug: prop.destination_slug || 'dharamshala',
      address_line1: prop.address_line1 || '', city: prop.city || 'Dharamshala',
      state: prop.state || 'Himachal Pradesh', pincode: prop.pincode || '',
      latitude: prop.latitude || null, longitude: prop.longitude || null, landmark: prop.landmark || '',
      amenities: Array.isArray(prop.amenities) ? prop.amenities : [],
      room_amenities: Array.isArray(prop.room_amenities) ? prop.room_amenities : [],
      bathroom_amenities: Array.isArray(prop.bathroom_amenities) ? prop.bathroom_amenities : [],
      food_amenities: Array.isArray(prop.food_amenities) ? prop.food_amenities : [],
      check_in_time: prop.check_in_time || '12:00', check_out_time: prop.check_out_time || '11:00',
      cancellation_policy: prop.cancellation_policy || '',
      pet_policy: prop.pet_policy || 'No pets allowed', smoking_policy: prop.smoking_policy || 'Non-smoking',
      couple_friendly: prop.couple_friendly ?? true,
      rooms: Array.isArray(prop.rooms) ? prop.rooms.map((r: any, i: number) => {
        const rps = Array.isArray(r.rate_plans) ? r.rate_plans.map((rp: any) => ({
          name: rp.name || '', meal_plan: rp.meal_plan || 'ep',
          price: Number(rp.price) || 0, cancellation: rp.cancellation || '',
          includes: Array.isArray(rp.includes) ? rp.includes : [],
        })) : [];
        const rpPrices = rps.map((rp: any) => rp.price).filter((p: number) => p > 0);
        return {
          name: r.name || 'Room ' + (i + 1), description: r.description || '',
          bed_type: r.bed_type || 'Double', room_size: r.room_size || '',
          max_adults: r.max_adults || 2, max_children: r.max_children || 1, max_occupancy: r.max_occupancy || 3,
          base_price: rpPrices.length ? Math.min(...rpPrices) : (Number(r.base_price) || 0),
          weekend_price: 0, peak_price: 0, meal_plan: r.meal_plan || 'ep',
          amenities: Array.isArray(r.amenities) ? r.amenities : [],
          images: Array.isArray(r.images) ? r.images.filter((img: any) => img) : [],
          total_inventory: r.total_inventory || 1, is_active: true, rate_plans: rps,
        };
      }) : [],
      images: Array.isArray(prop.images) ? prop.images.map((img: any, i: number) => ({
        url: typeof img === 'string' ? img : (img.url || ''),
        alt: typeof img === 'string' ? '' : (img.alt || ''),
        category: typeof img === 'string' ? 'exterior' : (img.category || 'exterior'),
        is_primary: i === 0, sort_order: i,
      })).filter((img: any) => img.url) : [],
      rating: prop.rating || 0, review_count: prop.review_count || 0,
      nearby_attractions: Array.isArray(prop.nearby_attractions) ? prop.nearby_attractions : [],
      faqs: Array.isArray(prop.faqs) ? prop.faqs : [],
      meta_title: prop.meta_title || '', meta_description: prop.meta_description || '',
      price_min: 0, price_max: 0,
      languages_spoken: ['English', 'Hindi'], id_required: ['Aadhaar Card', 'Passport', 'Driving License'],
      tax_included: false, accepts_online_payment: false,
    };

    const allPrices: number[] = [];
    n.rooms.forEach((r: any) => {
      if (r.base_price > 0) allPrices.push(r.base_price);
      (r.rate_plans || []).forEach((rp: any) => { if (rp.price > 0) allPrices.push(rp.price); });
    });
    if (allPrices.length) { n.price_min = Math.min(...allPrices); n.price_max = Math.max(...allPrices); }

    const totalRPs = n.rooms.reduce((s: number, r: any) => s + (r.rate_plans?.length || 0), 0);
    const totalRoomImgs = n.rooms.reduce((s: number, r: any) => s + (r.images?.length || 0), 0);

    return NextResponse.json({
      success: true, property: n,
      roomCount: n.rooms.length, ratePlanCount: totalRPs,
      imageCount: n.images.length, roomImageCount: totalRoomImgs,
    });
  } catch (err: any) {
    console.error('[Import] Error:', err);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}
