/**
 * Taxi route pages: one SEO page per from -> to pair, generated from the
 * active routes in Supabase (/admin/taxis). Add a route there and its page,
 * sitemap entry and links appear automatically.
 */
import { getActiveTaxiRoutes } from './db';
import { taxiRouteSlug } from './taxi-slug';

export { taxiRouteSlug };

export interface TaxiRouteGroup {
  slug: string;
  from: string;
  to: string;
  routeType: string;
  distanceKm: number;
  duration: string;
  minPrice: number;
  updatedAt: string;
  vehicles: { name: string; category: string; maxPassengers: number; price: number; priceType: string; includes: string[]; excludes: string[] }[];
}

export async function getTaxiRouteGroups(): Promise<TaxiRouteGroup[]> {
  const routes = await getActiveTaxiRoutes();
  const groups = new Map<string, TaxiRouteGroup>();
  for (const r of routes as any[]) {
    if (!r.from_location || !r.to_location || !(r.price > 0)) continue;
    const slug = taxiRouteSlug(r.from_location, r.to_location);
    const g: TaxiRouteGroup = groups.get(slug) || {
      slug, from: r.from_location, to: r.to_location, routeType: r.route_type,
      distanceKm: r.distance_km || 0, duration: r.duration || '', minPrice: r.price,
      updatedAt: r.updated_at || r.created_at || '', vehicles: [],
    };
    g.minPrice = Math.min(g.minPrice, r.price);
    if ((r.updated_at || '') > g.updatedAt) g.updatedAt = r.updated_at;
    g.vehicles.push({
      name: r.vehicle_name || r.vehicle_category, category: r.vehicle_category,
      maxPassengers: r.max_passengers || 4, price: r.price, priceType: r.price_type || 'fixed',
      includes: r.includes || [], excludes: r.excludes || [],
    });
    groups.set(slug, g);
  }
  return Array.from(groups.values()).map((g) => ({ ...g, vehicles: g.vehicles.sort((a, b) => a.price - b.price) }));
}

export async function getTaxiRouteGroup(slug: string): Promise<TaxiRouteGroup | undefined> {
  return (await getTaxiRouteGroups()).find((g) => g.slug === slug);
}

/**
 * Hand-written local notes for common routes, matched on from/to keywords so
 * they apply however the route is named in the admin panel.
 */
const ROUTE_NOTES: { from: RegExp; to: RegExp; notes: string[]; notesHi?: string[] }[] = [
  {
    from: /gaggal|kangra airport|airport/i, to: /mcleod/i,
    notes: [
      'The drive climbs from Kangra (Gaggal) Airport through Dharamshala town and up the hill road to McLeod Ganj. Traffic around Kotwali Bazaar and the last stretch into McLeod Ganj can be slow in peak season, so allow extra time in May-June and October.',
      'Most hotels in McLeod Ganj, Bhagsu and Dharamkot are on narrow lanes. Tell us your hotel when booking so the driver can get as close as the roads allow.',
    ],
    notesHi: [
      'कांगड़ा (गग्गल) एयरपोर्ट से रास्ता धर्मशाला शहर से होते हुए पहाड़ी सड़क से मैक्लोडगंज तक चढ़ता है। मई-जून और अक्टूबर के पीक सीज़न में कोतवाली बाज़ार और मैक्लोडगंज के आख़िरी हिस्से में ट्रैफ़िक धीमा हो सकता है, इसलिए थोड़ा अतिरिक्त समय रखें।',
      'मैक्लोडगंज, भागसू और धर्मकोट के ज़्यादातर होटल संकरी गलियों में हैं। बुकिंग के समय अपने होटल का नाम बताएं ताकि ड्राइवर जितना संभव हो उतना पास तक पहुँचा सके।',
    ],
  },
  {
    from: /gaggal|kangra airport|airport/i, to: /dharamshala|dharamsala/i,
    notes: [
      'Kangra (Gaggal) Airport is the nearest airport to Dharamshala. The road runs through the valley on the main Pathankot-Mandi highway and then up to Dharamshala town -- one of the easiest transfers in the region.',
      'Flights into Gaggal are small turboprops and delays are common in bad weather. Share your flight number and the driver will track the arrival.',
    ],
    notesHi: [
      'कांगड़ा (गग्गल) एयरपोर्ट धर्मशाला का सबसे नज़दीकी एयरपोर्ट है। सड़क घाटी में पठानकोट-मंडी हाईवे से होकर धर्मशाला शहर तक जाती है -- यह इलाके के सबसे आसान ट्रांसफ़र में से एक है।',
      'गग्गल में छोटे टर्बोप्रॉप विमान आते हैं और ख़राब मौसम में देरी आम है। अपना फ़्लाइट नंबर शेयर करें, ड्राइवर आगमन ट्रैक करता रहेगा।',
    ],
  },
  {
    from: /pathankot|chakki/i, to: /.*/,
    notes: [
      'Pathankot Junction and Chakki Bank are the nearest broad-gauge railway stations to Dharamshala. The road follows the Kangra highway through Nurpur and Shahpur; it is a well-paved route of roughly 2.5-3 hours.',
      'Overnight trains from Delhi reach Pathankot early in the morning, so a pre-booked taxi saves waiting for buses.',
    ],
    notesHi: [
      'पठानकोट जंक्शन और चक्की बैंक धर्मशाला के सबसे नज़दीकी ब्रॉड-गेज रेलवे स्टेशन हैं। सड़क नूरपुर और शाहपुर होते हुए कांगड़ा हाईवे पर चलती है; यह अच्छी पक्की सड़क है और लगभग 2.5-3 घंटे लगते हैं।',
      'दिल्ली से रात की ट्रेनें सुबह-सुबह पठानकोट पहुँचती हैं, इसलिए पहले से बुक की गई टैक्सी से बसों का इंतज़ार नहीं करना पड़ता।',
    ],
  },
  {
    from: /.*/, to: /manali/i,
    notes: [
      'The usual route runs via Palampur, Baijnath, Joginder Nagar and Mandi before following the Beas valley to Kullu and Manali. Many travellers stop at Bir Billing or Palampur on the way.',
      'This is a full-day mountain drive. Start early, especially in monsoon (July-September) when landslides can slow the Mandi-Kullu stretch.',
    ],
    notesHi: [
      'आम रास्ता पालमपुर, बैजनाथ, जोगिंदरनगर और मंडी होते हुए ब्यास घाटी के साथ कुल्लू और मनाली तक जाता है। कई यात्री रास्ते में बीर बिलिंग या पालमपुर रुकते हैं।',
      'यह पूरे दिन की पहाड़ी ड्राइव है। जल्दी निकलें, ख़ासकर मॉनसून (जुलाई-सितंबर) में, जब भूस्खलन से मंडी-कुल्लू वाला हिस्सा धीमा हो सकता है।',
    ],
  },
  {
    from: /.*/, to: /delhi/i,
    notes: [
      'Drivers take either the Pathankot-Jalandhar route (NH44) or the Una-Chandigarh route, depending on traffic and your stops. Expect a long day of 9-12 hours with meal breaks.',
      'An early start avoids the evening traffic entering Delhi. Read our [Dharamshala to Delhi taxi guide](/blog/dharamshala-to-delhi-taxi-guide) for routes and stops.',
    ],
    notesHi: [
      'ड्राइवर ट्रैफ़िक और आपके स्टॉप के हिसाब से या तो पठानकोट-जालंधर रूट (NH44) या ऊना-चंडीगढ़ रूट लेते हैं। खाने के ब्रेक के साथ 9-12 घंटे का लंबा दिन मानकर चलें।',
      'जल्दी निकलने से शाम को दिल्ली में घुसते समय के ट्रैफ़िक से बचा जा सकता है। रूट और स्टॉप के लिए हमारी [धर्मशाला से दिल्ली टैक्सी गाइड](/blog/dharamshala-to-delhi-taxi-guide) पढ़ें।',
    ],
  },
  {
    from: /.*/, to: /amritsar/i,
    notes: [
      'The route descends via Kangra and Pathankot into the Punjab plains. Many travellers time arrival in Amritsar for the evening at the Golden Temple or the Wagah-Attari border ceremony.',
    ],
    notesHi: [
      'रास्ता कांगड़ा और पठानकोट होते हुए पंजाब के मैदानों में उतरता है। कई यात्री शाम को स्वर्ण मंदिर या वाघा-अटारी बॉर्डर सेरेमनी के हिसाब से अमृतसर पहुँचते हैं।',
    ],
  },
  {
    from: /.*/, to: /sightseeing|local/i,
    notes: [
      'A typical local tour covers the Tsuglagkhang (Dalai Lama Temple), St. John in the Wilderness church, Bhagsunag temple and waterfall, Dal Lake and Naddi viewpoint, with the HPCA cricket stadium and the War Memorial on the way down. Tell the driver your priorities and they will plan around traffic.',
    ],
    notesHi: [
      'आम लोकल टूर में त्सुगलागखांग (दलाई लामा मंदिर), सेंट जॉन इन द वाइल्डरनेस चर्च, भागसूनाग मंदिर और झरना, डल झील और नड्डी व्यू पॉइंट शामिल होते हैं, और नीचे आते समय HPCA क्रिकेट स्टेडियम और वॉर मेमोरियल। ड्राइवर को अपनी प्राथमिकताएँ बताएं, वह ट्रैफ़िक के हिसाब से प्लान बना देगा।',
    ],
  },
  {
    from: /.*/, to: /kangra|valley|palampur/i,
    notes: [
      'A Kangra Valley day can include Kangra Fort, Brajeshwari Devi temple, the Masroor rock-cut temples or the Palampur tea gardens and Baijnath. See our [places to visit in Kangra](/blog/places-to-visit-in-kangra) guide to plan stops.',
    ],
    notesHi: [
      'कांगड़ा घाटी के एक दिन में कांगड़ा किला, ब्रजेश्वरी देवी मंदिर, मसरूर रॉक-कट मंदिर या पालमपुर के चाय बागान और बैजनाथ शामिल हो सकते हैं। स्टॉप प्लान करने के लिए हमारी [कांगड़ा घूमने की जगह](/blog/places-to-visit-in-kangra) गाइड देखें।',
    ],
  },
];

export function getRouteNotes(from: string, to: string, lang: 'en' | 'hi' = 'en'): string[] {
  const hit = ROUTE_NOTES.find((n) => n.from.test(from) && n.to.test(to));
  if (!hit) return [];
  return lang === 'hi' && hit.notesHi ? hit.notesHi : hit.notes;
}
