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
 * Hand-written local notes, one per route. Each entry is matched on the exact
 * from AND to names (anchored), so no route shares a note with another and
 * inbound and outbound pairs read differently. Unknown routes get no note.
 */
type RouteNote = { from: RegExp; to: RegExp; notes: string[]; notesHi: string[] };

const DHARAMSHALA = /^dharamsh?ala$/i;

const ROUTE_NOTES: RouteNote[] = [
  {
    from: /^gaggal\s+airport$/i, to: /^mcleod\s+ganj$/i,
    notes: [
      'Kangra (Gaggal) Airport sits at about 770 m, so it is warmer here than up the hill. The drive climbs through Dharamshala town and on up the hill road to McLeod Ganj. Traffic around Kotwali Bazaar and the last stretch can be slow in May-June and October, so allow extra time.',
      'Many hotels in McLeod Ganj, Bhagsu and Dharamkot are on narrow lanes. Tell us your hotel when booking so the driver can get as close as the roads allow. Flight delays are common with small planes, so share your flight number. More in our [Kangra Airport guide](/blog/kangra-airport-gaggal-guide).',
    ],
    notesHi: [
      'कांगड़ा (गग्गल) एयरपोर्ट लगभग 770 मीटर पर है, इसलिए यहाँ पहाड़ के ऊपर से ज़्यादा गर्मी होती है। रास्ता धर्मशाला शहर से होकर पहाड़ी सड़क पर मैक्लोडगंज तक चढ़ता है। मई-जून और अक्टूबर में कोतवाली बाज़ार और आख़िरी हिस्से में ट्रैफ़िक धीमा हो सकता है, इसलिए समय ज़्यादा रखें।',
      'मैक्लोडगंज, भागसू और धर्मकोट के कई होटल संकरी गलियों में हैं। बुकिंग के समय होटल का नाम बताएं ताकि ड्राइवर जितना हो सके उतना पास पहुँचे। छोटे विमानों की उड़ानें अक्सर लेट होती हैं, इसलिए अपना फ़्लाइट नंबर शेयर करें। और जानकारी हमारी [कांगड़ा एयरपोर्ट गाइड](/blog/kangra-airport-gaggal-guide) में है।',
    ],
  },
  {
    from: /^gaggal\s+airport$/i, to: DHARAMSHALA,
    notes: [
      'This is the shortest airport transfer in the region, about 30-40 minutes. Gaggal is on the Pathankot-Mandi highway (NH 154) and the road runs up to Dharamshala town and your hotel there. The driver meets you after you land, so give us the flight number.',
      'Only small turboprop planes land at Kangra, and cloud or rain can delay or cancel flights. If you are going on to McLeod Ganj, book that route instead, as it adds the hill climb. See our [Kangra Airport guide](/blog/kangra-airport-gaggal-guide) for current flights.',
    ],
    notesHi: [
      'यह इलाके का सबसे छोटा एयरपोर्ट ट्रांसफ़र है, लगभग 30-40 मिनट। गग्गल पठानकोट-मंडी हाईवे (NH 154) पर है और सड़क धर्मशाला शहर और आपके होटल तक जाती है। उतरने के बाद ड्राइवर आपसे मिलेगा, इसलिए फ़्लाइट नंबर बताएं।',
      'कांगड़ा में सिर्फ़ छोटे टर्बोप्रॉप विमान उतरते हैं, और बादल या बारिश से उड़ान लेट या रद्द हो सकती है। अगर आपको मैक्लोडगंज जाना है तो वही रूट बुक करें, क्योंकि उसमें पहाड़ की चढ़ाई जुड़ती है। मौजूदा उड़ानों के लिए हमारी [कांगड़ा एयरपोर्ट गाइड](/blog/kangra-airport-gaggal-guide) देखें।',
    ],
  },
  {
    from: /^gaggal\s+airport$/i, to: /^bir\s+billing$/i,
    notes: [
      'This is a through-the-valley drive of about 65 km and 2-2.5 hours, with no need to stop in Dharamshala. The road follows the Kangra Valley, and Palampur and Baijnath come before Bir, so Palampur is a natural place for a short break.',
      'Tell the driver which part of Bir you need: the Tibetan colony with the cafes and landing field is not the same as the Billing take-off, which is 14 km above Bir. Paragliding is closed from 15 July to 15 September. Read our [Bir Billing paragliding guide](/blog/bir-billing-paragliding-guide) before you fly in.',
    ],
    notesHi: [
      'यह घाटी से होकर लगभग 65 किमी और 2-2.5 घंटे की ड्राइव है, धर्मशाला में रुकना ज़रूरी नहीं। सड़क कांगड़ा घाटी से चलती है और बीर से पहले पालमपुर और बैजनाथ पड़ते हैं, इसलिए पालमपुर में थोड़ा रुकना ठीक रहता है।',
      'ड्राइवर को बताएं कि बीर में कहाँ जाना है: कैफ़े और लैंडिंग मैदान वाली तिब्बती कॉलोनी और बिलिंग टेक-ऑफ़ अलग जगहें हैं, टेक-ऑफ़ बीर से 14 किमी ऊपर है। पैराग्लाइडिंग 15 जुलाई से 15 सितंबर तक बंद रहती है। आने से पहले हमारी [बीर बिलिंग पैराग्लाइडिंग गाइड](/blog/bir-billing-paragliding-guide) पढ़ें।',
    ],
  },
  {
    from: /^pathankot\s+railway\s+station$/i, to: /^mcleod\s+ganj$/i,
    notes: [
      'Plan on about 95 km and 3-3.5 hours. The road is the Kangra highway through Nurpur and Shahpur to Dharamshala, then about 9 km further up the hill to McLeod Ganj. The last stretch is the slowest part, especially in the evening and on weekends.',
      'Overnight trains from Delhi reach Pathankot early in the morning, so the driver waits at the station and tracks your train. Check whether your ticket says Pathankot Junction or Pathankot Cantt, and tell us which. See the [McLeod Ganj complete guide](/blog/mcleod-ganj-complete-guide) for where to stay once you arrive.',
    ],
    notesHi: [
      'लगभग 95 किमी और 3-3.5 घंटे का समय रखें। रास्ता नूरपुर और शाहपुर होते हुए कांगड़ा हाईवे से धर्मशाला जाता है, फिर करीब 9 किमी और ऊपर मैक्लोडगंज। आख़िरी हिस्सा सबसे धीमा होता है, ख़ासकर शाम को और वीकेंड पर।',
      'दिल्ली से रात की ट्रेनें सुबह-सुबह पठानकोट पहुँचती हैं, इसलिए ड्राइवर स्टेशन पर इंतज़ार करता है और आपकी ट्रेन ट्रैक करता है। अपने टिकट पर देखें कि पठानकोट जंक्शन लिखा है या पठानकोट कैंट, और हमें बताएं। पहुँचने के बाद कहाँ रुकें, यह जानने के लिए [मैक्लोडगंज की पूरी गाइड](/blog/mcleod-ganj-complete-guide) देखें।',
    ],
  },
  {
    from: /^pathankot\s+railway\s+station$/i, to: DHARAMSHALA,
    notes: [
      'Pathankot is the nearest big railhead, about 90 km and 2.5-3 hours from Dharamshala. The road follows the Kangra highway through Nurpur and Shahpur and is well paved. Pathankot Junction is in town and is where the narrow-gauge Kangra toy train starts.',
      'Overnight trains from Delhi stop here early in the morning, and a pre-booked taxi saves waiting for a bus. Give us your train number so the driver can track delays. For buses, the toy train and the two Pathankot stations, read [Pathankot to Dharamshala](/blog/pathankot-to-dharamshala).',
    ],
    notesHi: [
      'पठानकोट सबसे नज़दीकी बड़ा रेलवे स्टेशन है, धर्मशाला से लगभग 90 किमी और 2.5-3 घंटे। रास्ता नूरपुर और शाहपुर होते हुए कांगड़ा हाईवे पर है और अच्छा बना हुआ है। पठानकोट जंक्शन शहर में है और यहीं से नैरो-गेज कांगड़ा टॉय ट्रेन शुरू होती है।',
      'दिल्ली से रात की ट्रेनें सुबह-सुबह यहाँ रुकती हैं, और पहले से बुक टैक्सी से बस का इंतज़ार नहीं करना पड़ता। अपनी ट्रेन का नंबर दें ताकि ड्राइवर देरी ट्रैक कर सके। बस, टॉय ट्रेन और पठानकोट के दो स्टेशनों के बारे में [पठानकोट से धर्मशाला](/blog/pathankot-to-dharamshala) पढ़ें।',
    ],
  },
  {
    from: /^chakki\s+bank\s+railway\s+station$/i, to: DHARAMSHALA,
    notes: [
      'Chakki Bank is the old name of Pathankot Cantt station, about 3 km from Pathankot Junction. Many long-distance trains on the Delhi-Jammu line stop only here, sometimes for just a few minutes, so be ready at the door with your bags.',
      'The drive to Dharamshala is about 88 km and 2.5-3 hours on the Kangra highway. Tell us the station code on your ticket so the driver goes to the right station. If you want the toy train, it starts at the Junction, so you would need a short ride across town first. Details in [Pathankot to Dharamshala](/blog/pathankot-to-dharamshala).',
    ],
    notesHi: [
      'चक्की बैंक पठानकोट कैंट स्टेशन का पुराना नाम है, जो पठानकोट जंक्शन से लगभग 3 किमी दूर है। दिल्ली-जम्मू लाइन की कई लंबी दूरी की ट्रेनें सिर्फ़ यहीं रुकती हैं, कभी-कभी बस कुछ मिनट, इसलिए सामान के साथ दरवाज़े पर तैयार रहें।',
      'धर्मशाला तक कांगड़ा हाईवे पर लगभग 88 किमी और 2.5-3 घंटे की ड्राइव है। टिकट पर लिखा स्टेशन कोड हमें बताएं ताकि ड्राइवर सही स्टेशन पर पहुँचे। टॉय ट्रेन लेनी हो तो वह जंक्शन से चलती है, इसलिए पहले शहर के पार थोड़ा जाना पड़ेगा। पूरी जानकारी [पठानकोट से धर्मशाला](/blog/pathankot-to-dharamshala) में है।',
    ],
  },
  {
    from: /^amb\s+andaura\s+railway\s+station$/i, to: DHARAMSHALA,
    notes: [
      'Amb Andaura is in Una district, about 105 km and 3-3.5 hours from Dharamshala via Kangra. It is the stop for the New Delhi-Amb Andaura Vande Bharat Express, which also stops at Chandigarh and Una, and gets you from Delhi to Una district by late morning.',
      'Only a few trains stop here, so a taxi waiting at the station is far easier than hunting for one outside. Give us your train number and the driver will track it. Most of the road after Kangra is the same valley highway used from Chandigarh, covered in [Chandigarh to Dharamshala](/blog/chandigarh-to-dharamshala).',
    ],
    notesHi: [
      'अंब अंदौरा ऊना ज़िले में है, कांगड़ा होते हुए धर्मशाला से लगभग 105 किमी और 3-3.5 घंटे। यह नई दिल्ली-अंब अंदौरा वंदे भारत एक्सप्रेस का स्टॉप है, जो चंडीगढ़ और ऊना पर भी रुकती है और दिल्ली से ऊना ज़िले तक सुबह के आख़िर तक पहुँचा देती है।',
      'यहाँ गिनी-चुनी ट्रेनें रुकती हैं, इसलिए स्टेशन पर टैक्सी तैयार मिलना बाहर ढूँढने से कहीं आसान है। अपनी ट्रेन का नंबर दें, ड्राइवर उसे ट्रैक करेगा। कांगड़ा के बाद का ज़्यादातर रास्ता वही घाटी वाला हाईवे है जो चंडीगढ़ से आते समय लिया जाता है, जिसकी जानकारी [चंडीगढ़ से धर्मशाला](/blog/chandigarh-to-dharamshala) में है।',
    ],
  },
  {
    from: /^kangra\s+railway\s+station$/i, to: DHARAMSHALA,
    notes: [
      'There is no railway station in Dharamshala, so the Kangra toy train gets you as far as Kangra (or Kangra Mandir), about 20 km and 40 minutes below town. A taxi here saves waiting for a local bus with luggage.',
      'The toy train runs slowly and can be late, and the line has stopped at short notice after rain. Check the live status on the NTES app or call 139 on the morning you travel, then tell us your arrival time. Timetable and fares are in our [Kangra toy train guide](/blog/kangra-toy-train-guide).',
    ],
    notesHi: [
      'धर्मशाला में रेलवे स्टेशन नहीं है, इसलिए कांगड़ा टॉय ट्रेन आपको कांगड़ा (या कांगड़ा मंदिर) तक पहुँचाती है, जो शहर से लगभग 20 किमी और 40 मिनट नीचे है। सामान के साथ लोकल बस का इंतज़ार करने से बेहतर है यहाँ से टैक्सी।',
      'टॉय ट्रेन धीमी चलती है और लेट हो सकती है, और बारिश के बाद यह लाइन अचानक बंद भी हुई है। सफ़र वाली सुबह NTES ऐप पर लाइव स्टेटस देखें या 139 पर कॉल करें, फिर हमें अपने पहुँचने का समय बताएं। टाइमटेबल और किराया हमारी [कांगड़ा टॉय ट्रेन गाइड](/blog/kangra-toy-train-guide) में है।',
    ],
  },
  {
    from: /^amritsar$/i, to: DHARAMSHALA,
    notes: [
      'Amritsar to Dharamshala is about 200 km and 5-6 hours, mostly on the national highway to Pathankot (NH-44) and then NH-154 through Nurpur and Kangra. Pathankot is the usual lunch stop, and the last part climbs and narrows after Nurpur.',
      'Many travellers land at Amritsar airport or visit the Golden Temple first, so tell us if your pickup is the airport, the railway station or a hotel, and your arrival time. The driver then meets you there. The full comparison of routes is in [Amritsar to Dharamshala](/blog/amritsar-to-dharamshala).',
    ],
    notesHi: [
      'अमृतसर से धर्मशाला लगभग 200 किमी और 5-6 घंटे है, ज़्यादातर रास्ता पठानकोट तक राष्ट्रीय राजमार्ग (NH-44) और फिर नूरपुर और कांगड़ा से होकर NH-154 पर है। पठानकोट आम तौर पर लंच का स्टॉप है, और नूरपुर के बाद सड़क संकरी होकर चढ़ने लगती है।',
      'कई यात्री पहले अमृतसर एयरपोर्ट पर उतरते हैं या स्वर्ण मंदिर जाते हैं, इसलिए बताएं कि पिकअप एयरपोर्ट, रेलवे स्टेशन या होटल में से कहाँ है और कब पहुँचेंगे। ड्राइवर आपको वहीं मिलेगा। रूटों की पूरी तुलना [अमृतसर से धर्मशाला](/blog/amritsar-to-dharamshala) में है।',
    ],
  },
  {
    from: /^chandigarh$/i, to: DHARAMSHALA,
    notes: [
      'The usual road from Chandigarh runs through Ropar, Anandpur Sahib, Nangal, Una, Amb and Kangra to Dharamshala, about 240 km. Expect good highway as far as Una, then a two-lane hill and valley road, with 5-6.5 hours of driving including a break or two.',
      'Leaving Chandigarh by 6-7 am means you arrive by early afternoon. Tell us whether the pickup is the airport, ISBT Sector 43 or your hotel. For the bus, train and flight options side by side, see [Chandigarh to Dharamshala](/blog/chandigarh-to-dharamshala).',
    ],
    notesHi: [
      'चंडीगढ़ से आम रास्ता रोपड़, आनंदपुर साहिब, नंगल, ऊना, अंब और कांगड़ा होते हुए धर्मशाला पहुँचता है, लगभग 240 किमी। ऊना तक अच्छा हाईवे है, फिर दो लेन की पहाड़ी और घाटी वाली सड़क, और एक-दो ब्रेक के साथ 5-6.5 घंटे की ड्राइव।',
      'चंडीगढ़ से सुबह 6-7 बजे निकलें तो दोपहर की शुरुआत तक पहुँच जाएंगे। बताएं कि पिकअप एयरपोर्ट, ISBT सेक्टर 43 या होटल में से कहाँ है। बस, ट्रेन और फ़्लाइट के विकल्प साथ-साथ देखने के लिए [चंडीगढ़ से धर्मशाला](/blog/chandigarh-to-dharamshala) पढ़ें।',
    ],
  },
  {
    from: /^delhi$/i, to: DHARAMSHALA,
    notes: [
      'Delhi to Dharamshala is about 480 km and 10-12 hours by car, a long day even with a driver. Drivers take either the Chandigarh, Una and Kangra route or the Jalandhar and Pathankot route on NH44, depending on traffic and your stops. Tolls are usually extra.',
      'Start early so you reach the hills before dark, and plan a proper meal break. Tell us where in Delhi the pickup is. If you would rather sleep through the journey, the overnight Volvo takes 10-13 hours: see [Delhi to Dharamshala by bus](/blog/delhi-to-dharamshala-by-bus).',
    ],
    notesHi: [
      'दिल्ली से धर्मशाला कार से लगभग 480 किमी और 10-12 घंटे है, ड्राइवर साथ हो तब भी लंबा दिन। ट्रैफ़िक और आपके स्टॉप के हिसाब से ड्राइवर चंडीगढ़, ऊना और कांगड़ा वाला रूट या NH44 पर जालंधर और पठानकोट वाला रूट लेते हैं। टोल आम तौर पर अलग से लगता है।',
      'जल्दी निकलें ताकि अँधेरा होने से पहले पहाड़ों में पहुँच जाएं, और खाने का ठीक से ब्रेक रखें। बताएं कि दिल्ली में पिकअप कहाँ है। अगर आप सफ़र में सोना चाहते हैं तो रात की वॉल्वो 10-13 घंटे लेती है: [बस से दिल्ली से धर्मशाला](/blog/delhi-to-dharamshala-by-bus) देखें।',
    ],
  },
  {
    from: DHARAMSHALA, to: /^amritsar$/i,
    notes: [
      'Heading down to Amritsar, the road descends via Kangra and Pathankot into the Punjab plains, about 200 km and 5-6 hours. Leave after an early breakfast and add a buffer if you have a train or a flight to catch from Amritsar.',
      'Many travellers time the arrival for the evening at the Golden Temple or the Wagah-Attari border ceremony. Amritsar airport is Sri Guru Ram Dass Jee International Airport; tell us if the drop is the airport, the station or a hotel. Route details are in [Amritsar to Dharamshala](/blog/amritsar-to-dharamshala).',
    ],
    notesHi: [
      'अमृतसर की ओर सड़क कांगड़ा और पठानकोट होते हुए पंजाब के मैदानों में उतरती है, लगभग 200 किमी और 5-6 घंटे। सुबह नाश्ते के बाद निकलें, और अमृतसर से ट्रेन या फ़्लाइट पकड़नी हो तो थोड़ा अतिरिक्त समय रखें।',
      'कई यात्री शाम को स्वर्ण मंदिर या वाघा-अटारी बॉर्डर सेरेमनी के हिसाब से पहुँचते हैं। अमृतसर का एयरपोर्ट श्री गुरु राम दास जी अंतरराष्ट्रीय हवाई अड्डा है; बताएं कि ड्रॉप एयरपोर्ट, स्टेशन या होटल में से कहाँ है। रूट की जानकारी [अमृतसर से धर्मशाला](/blog/amritsar-to-dharamshala) में है।',
    ],
  },
  {
    from: DHARAMSHALA, to: /^chandigarh$/i,
    notes: [
      'Going down to Chandigarh, the usual road runs from Kangra via Una or Anandpur Sahib and out of the hills into Punjab, about 240 km and 5-6.5 hours. The hill and valley part comes first, then good highway.',
      'If you have a train or flight in Chandigarh, leave with a comfortable buffer, since the first part is a two-lane hill and valley road. Tell us whether the drop is the airport, the station or a hotel. Bus, taxi, train and flight options are compared in [Chandigarh to Dharamshala](/blog/chandigarh-to-dharamshala).',
    ],
    notesHi: [
      'चंडीगढ़ की ओर आम रास्ता कांगड़ा से ऊना या आनंदपुर साहिब होते हुए पहाड़ों से निकलकर पंजाब में जाता है, लगभग 240 किमी और 5-6.5 घंटे। पहले पहाड़ी और घाटी वाला हिस्सा आता है, फिर अच्छा हाईवे।',
      'चंडीगढ़ में ट्रेन या फ़्लाइट हो तो आराम से बफ़र रखकर निकलें, क्योंकि पहला हिस्सा दो लेन की पहाड़ी और घाटी वाली सड़क है। बताएं कि ड्रॉप एयरपोर्ट, स्टेशन या होटल में से कहाँ है। बस, टैक्सी, ट्रेन और फ़्लाइट की तुलना [चंडीगढ़ से धर्मशाला](/blog/chandigarh-to-dharamshala) में है।',
    ],
  },
  {
    from: DHARAMSHALA, to: /^delhi$/i,
    notes: [
      'Drivers take either the Pathankot-Jalandhar route (NH44) or the Una-Chandigarh route, depending on traffic and your stops. Expect a long day of about 480 km and 10-12 hours with meal breaks.',
      'A morning departure around 5-6 am, after checking out, gets you to Delhi by mid-afternoon and avoids the evening traffic entering the city. Tolls are usually extra, and in monsoon check road conditions first. Routes and stops are in our [Dharamshala to Delhi taxi guide](/blog/dharamshala-to-delhi-taxi-guide).',
    ],
    notesHi: [
      'ड्राइवर ट्रैफ़िक और आपके स्टॉप के हिसाब से या तो पठानकोट-जालंधर रूट (NH44) या ऊना-चंडीगढ़ रूट लेते हैं। खाने के ब्रेक के साथ लगभग 480 किमी और 10-12 घंटे का लंबा दिन मानकर चलें।',
      'चेक-आउट के बाद सुबह 5-6 बजे के आसपास निकलें तो दोपहर बाद तक दिल्ली पहुँच जाएंगे और शाम को शहर में घुसते समय के ट्रैफ़िक से बचेंगे। टोल आम तौर पर अलग से लगता है, और मॉनसून में पहले सड़क का हाल पूछ लें। रूट और स्टॉप हमारी [धर्मशाला से दिल्ली टैक्सी गाइड](/blog/dharamshala-to-delhi-taxi-guide) में हैं।',
    ],
  },
  {
    from: DHARAMSHALA, to: /^manali$/i,
    notes: [
      'The usual route runs via Palampur, Baijnath, Joginder Nagar and Mandi before following the Beas valley to Kullu and Manali, about 235 km and 7-8 hours. Many travellers stop at Bir Billing or Palampur on the way.',
      'This is a full-day mountain drive. Start early, especially in monsoon (July-September) when landslides can slow the Mandi-Kullu stretch. Our [Dharamshala to Manali guide](/blog/dharamshala-to-manali) covers the road, the stops and the bus option.',
    ],
    notesHi: [
      'आम रास्ता पालमपुर, बैजनाथ, जोगिंदरनगर और मंडी होते हुए ब्यास घाटी के साथ कुल्लू और मनाली तक जाता है, लगभग 235 किमी और 7-8 घंटे। कई यात्री रास्ते में बीर बिलिंग या पालमपुर रुकते हैं।',
      'यह पूरे दिन की पहाड़ी ड्राइव है। जल्दी निकलें, ख़ासकर मॉनसून (जुलाई-सितंबर) में, जब भूस्खलन से मंडी-कुल्लू वाला हिस्सा धीमा हो सकता है। सड़क, स्टॉप और बस के विकल्प हमारी [धर्मशाला से मनाली गाइड](/blog/dharamshala-to-manali) में हैं।',
    ],
  },
  {
    from: DHARAMSHALA, to: /^bir\s+billing$/i,
    notes: [
      'Bir is about 70 km and 2-2.5 hours from Dharamshala, via Palampur and Baijnath on a good, winding two-lane highway. From McLeod Ganj add about 9 km and 30 minutes. Leave a little earlier than you think, because Kotwali Bazaar and Palampur market can slow busy mornings.',
      'Bir is spread out, so tell the driver whether you want the Tibetan colony (cafes, guesthouses, landing field) or the road up to the Billing take-off, 14 km above Bir. Paragliding is closed from 15 July to 15 September. Read [Dharamshala to Bir Billing](/blog/dharamshala-to-bir) for stops on the way.',
    ],
    notesHi: [
      'बीर धर्मशाला से लगभग 70 किमी और 2-2.5 घंटे है, पालमपुर और बैजनाथ होते हुए अच्छे घुमावदार दो लेन हाईवे पर। मैक्लोडगंज से लगभग 9 किमी और 30 मिनट जोड़ें। जितना सोचें उससे थोड़ा पहले निकलें, क्योंकि व्यस्त सुबहों में कोतवाली बाज़ार और पालमपुर बाज़ार में धीमापन हो सकता है।',
      'बीर फैला हुआ है, इसलिए ड्राइवर को बताएं कि तिब्बती कॉलोनी (कैफ़े, गेस्टहाउस, लैंडिंग मैदान) जाना है या बीर से 14 किमी ऊपर बिलिंग टेक-ऑफ़ की सड़क। पैराग्लाइडिंग 15 जुलाई से 15 सितंबर तक बंद रहती है। रास्ते के स्टॉप के लिए [धर्मशाला से बीर बिलिंग](/blog/dharamshala-to-bir) पढ़ें।',
    ],
  },
  {
    from: DHARAMSHALA, to: /^dalhousie$/i,
    notes: [
      'Dalhousie is about 125 km and 4-5 hours away, via Gaggal, Shahpur, Nurpur and Banikhet. The first part is wide highway; after Nurpur the road climbs, and the last 8 km from Banikhet is short, steep and busy in season.',
      'Khajjiar is another 22-24 km beyond Dalhousie. A same-day return is a long, tiring day, so we suggest at least one night, and in winter check road and snow conditions before leaving. Tell us if you want to continue to Chamba. See [Dalhousie and Khajjiar from Dharamshala](/blog/dalhousie-khajjiar-from-dharamshala).',
    ],
    notesHi: [
      'डलहौज़ी लगभग 125 किमी और 4-5 घंटे दूर है, गग्गल, शाहपुर, नूरपुर और बनीखेत होते हुए। शुरुआत में चौड़ा हाईवे है; नूरपुर के बाद सड़क चढ़ने लगती है, और बनीखेत से आख़िरी 8 किमी छोटे, तीखे और सीज़न में भीड़ वाले हैं।',
      'खज्जियार डलहौज़ी से 22-24 किमी आगे है। उसी दिन लौटना लंबा और थकाने वाला होता है, इसलिए कम से कम एक रात रुकने की सलाह है, और सर्दियों में निकलने से पहले सड़क और बर्फ़ का हाल देख लें। चंबा तक जाना हो तो बताएं। [धर्मशाला से डलहौज़ी और खज्जियार](/blog/dalhousie-khajjiar-from-dharamshala) देखें।',
    ],
  },
  {
    from: DHARAMSHALA, to: /^palampur$/i,
    notes: [
      'Palampur is about 38 km and 1-1.5 hours from Dharamshala on the Kangra Valley road, and a calm, green town at around 1,470 m. A drop-off suits a stay among the tea gardens, and a return trip suits a long day out.',
      'Near Palampur are the tea estates and the Palampur Co-operative Tea Factory, Neugal Khad and Bundla, the artists village of Andretta (about 12 km) and Baijnath temple (16 km). Tell the driver your plan if you want stops. Read our [Palampur travel guide](/blog/palampur-travel-guide).',
    ],
    notesHi: [
      'पालमपुर कांगड़ा घाटी की सड़क पर धर्मशाला से लगभग 38 किमी और 1-1.5 घंटे है, और लगभग 1,470 मीटर पर एक शांत, हरा-भरा शहर है। चाय बागानों के बीच रुकना हो तो ड्रॉप ठीक है, और पूरे दिन घूमकर लौटना हो तो राउंड ट्रिप।',
      'पालमपुर के पास चाय बागान और पालमपुर को-ऑपरेटिव टी फ़ैक्टरी, न्यूगल खड्ड और बुंदला, कलाकारों का गाँव अंद्रेटा (लगभग 12 किमी) और बैजनाथ मंदिर (16 किमी) हैं। रास्ते में रुकना हो तो ड्राइवर को अपना प्लान बताएं। हमारी [पालमपुर यात्रा गाइड](/blog/palampur-travel-guide) पढ़ें।',
    ],
  },
  {
    from: DHARAMSHALA, to: /^four\s+devi\s+temples/i,
    notes: [
      'This is a full day of about 220 km and 10-11 hours, covering Devi temples in the Kangra area plus Kangra Fort. Start early: there are several stops, and the fort alone needs 1.5-2 hours.',
      'The fare covers the car, driver, fuel, tolls and parking, with pickup and drop at your hotel. Kangra Fort entry, temple offerings and meals are extra. Dress modestly for the temples. Distances, timings and rules are in the [Kangra Devi temples guide](/blog/kangra-devi-temples-guide).',
    ],
    notesHi: [
      'यह लगभग 220 किमी और 10-11 घंटे का पूरे दिन का टूर है, जिसमें कांगड़ा इलाके के देवी मंदिर और कांगड़ा किला शामिल हैं। जल्दी शुरू करें: कई स्टॉप हैं, और अकेले किले के लिए 1.5-2 घंटे चाहिए।',
      'किराये में गाड़ी, ड्राइवर, ईंधन, टोल और पार्किंग शामिल है, और पिकअप-ड्रॉप आपके होटल से होता है। कांगड़ा किले का प्रवेश टिकट, मंदिर का चढ़ावा और खाना अलग है। मंदिरों के लिए सादे कपड़े पहनें। दूरी, समय और नियम [कांगड़ा देवी मंदिर गाइड](/blog/kangra-devi-temples-guide) में हैं।',
    ],
  },
  {
    from: DHARAMSHALA, to: /^full[\s-]day\s+sightseeing/i,
    notes: [
      'This full-day tour of about 8-9 hours covers the Tsuglagkhang (Dalai Lama Temple), St. John in the Wilderness church, Bhagsunag temple and waterfall, Dal Lake and Naddi viewpoint, with the HPCA cricket stadium and the War Memorial on the way down.',
      'It stays around Dharamshala and McLeod Ganj, so it is far less driving than the Kangra tours. Entry tickets and meals are extra. The Tibet Museum is closed on Saturdays, and Sundays are busiest for traffic. Tell the driver your priorities. Our [places to visit in Dharamshala](/blog/places-to-visit-in-dharamshala) guide helps you choose.',
    ],
    notesHi: [
      'लगभग 8-9 घंटे के इस पूरे दिन के टूर में त्सुगलागखांग (दलाई लामा मंदिर), सेंट जॉन इन द वाइल्डरनेस चर्च, भागसूनाग मंदिर और झरना, डल झील और नड्डी व्यू पॉइंट शामिल हैं, और नीचे आते समय HPCA क्रिकेट स्टेडियम और वॉर मेमोरियल।',
      'यह धर्मशाला और मैक्लोडगंज के आसपास ही रहता है, इसलिए कांगड़ा वाले टूर से बहुत कम ड्राइविंग है। प्रवेश टिकट और खाना अलग है। तिब्बत संग्रहालय शनिवार को बंद रहता है, और रविवार को ट्रैफ़िक सबसे ज़्यादा होता है। ड्राइवर को अपनी प्राथमिकताएँ बताएं। चुनने में हमारी [धर्मशाला में घूमने की जगहें](/blog/places-to-visit-in-dharamshala) गाइड मदद करेगी।',
    ],
  },
  {
    from: DHARAMSHALA, to: /^kangra\s+valley\s+day\s+tour$/i,
    notes: [
      'This 8-9 hour day, about 90 km, takes in Kangra Fort, Brajeshwari Devi temple, the Masroor rock-cut temples and Chamunda Devi. Kangra Fort is about 20 km from Dharamshala and needs 1.5-2 hours on its own, so the driver usually plans the order around where you start.',
      'The fare includes an AC car and an experienced driver; entry tickets and meals are extra. If you also want Palampur or Baijnath, say so when booking, as that changes the plan. Use our [places to visit in Kangra](/blog/places-to-visit-in-kangra) guide to pick your stops.',
    ],
    notesHi: [
      'लगभग 90 किमी के इस 8-9 घंटे के दिन में कांगड़ा किला, ब्रजेश्वरी देवी मंदिर, मसरूर रॉक-कट मंदिर और चामुंडा देवी शामिल हैं। कांगड़ा किला धर्मशाला से लगभग 20 किमी है और अकेले उसके लिए 1.5-2 घंटे चाहिए, इसलिए ड्राइवर आम तौर पर आपके शुरू करने की जगह के हिसाब से क्रम बनाता है।',
      'किराये में एसी गाड़ी और अनुभवी ड्राइवर शामिल है; प्रवेश टिकट और खाना अलग है। पालमपुर या बैजनाथ भी देखना हो तो बुकिंग के समय बताएं, क्योंकि इससे प्लान बदल जाता है। स्टॉप चुनने के लिए हमारी [कांगड़ा में घूमने की जगहें](/blog/places-to-visit-in-kangra) गाइड देखें।',
    ],
  },
  {
    from: DHARAMSHALA, to: /^local\s+sightseeing/i,
    notes: [
      'This half-day trip of about 4-5 hours and 35 km is for a short stay or a gap between travel. It is not enough for every spot, so pick three or four: for example the Dalai Lama Temple and kora, a Tibetan lunch and one viewpoint.',
      'The driver starts and ends at your hotel and will plan around traffic, which is heaviest around Kotwali Bazaar and McLeod Ganj on weekends and in season. Entry tickets and meals are extra. If you have a full day, the 10-point tour covers more. See the [one day in Dharamshala itinerary](/blog/one-day-in-dharamshala).',
    ],
    notesHi: [
      'लगभग 4-5 घंटे और 35 किमी की यह आधे दिन की ट्रिप छोटे ठहराव या सफ़र के बीच के खाली समय के लिए है। इसमें हर जगह नहीं देख सकते, इसलिए तीन-चार चुनें: जैसे दलाई लामा मंदिर और कोरा, तिब्बती लंच और एक व्यू पॉइंट।',
      'ड्राइवर आपके होटल से शुरू और वहीं ख़त्म करता है और ट्रैफ़िक के हिसाब से प्लान बनाता है, जो वीकेंड और सीज़न में कोतवाली बाज़ार और मैक्लोडगंज के आसपास सबसे ज़्यादा होता है। प्रवेश टिकट और खाना अलग है। पूरा दिन हो तो 10 पॉइंट वाला टूर ज़्यादा जगहें कवर करता है। [धर्मशाला में एक दिन की योजना](/blog/one-day-in-dharamshala) देखें।',
    ],
  },
];

export function getRouteNotes(from: string, to: string, lang: 'en' | 'hi' = 'en'): string[] {
  const f = (from || '').trim();
  const t = (to || '').trim();
  const hit = ROUTE_NOTES.find((n) => n.from.test(f) && n.to.test(t));
  if (!hit) return [];
  return lang === 'hi' ? hit.notesHi : hit.notes;
}

/** Our travel guides for either end of a route; the taxi page links them so each fare page sits inside its topic. */
const ROUTE_GUIDES: { place: RegExp; slugs: string[] }[] = [
  { place: /gaggal|airport/i, slugs: ['kangra-airport-gaggal-guide'] },
  { place: /pathankot|chakki/i, slugs: ['pathankot-to-dharamshala', 'kangra-toy-train-guide'] },
  { place: /kangra railway|amb andaura/i, slugs: ['kangra-toy-train-guide', 'how-to-reach-dharamshala'] },
  { place: /amritsar/i, slugs: ['amritsar-to-dharamshala'] },
  { place: /chandigarh/i, slugs: ['chandigarh-to-dharamshala'] },
  { place: /delhi/i, slugs: ['dharamshala-to-delhi-taxi-guide', 'delhi-to-dharamshala-by-bus'] },
  { place: /manali/i, slugs: ['dharamshala-to-manali', 'manali-in-december-january'] },
  { place: /dalhousie|khajjiar/i, slugs: ['dalhousie-khajjiar-from-dharamshala'] },
  { place: /\bbir\b/i, slugs: ['dharamshala-to-bir', 'bir-billing-paragliding-guide'] },
  { place: /palampur/i, slugs: ['palampur-travel-guide', 'baijnath-temple-guide'] },
  { place: /devi|kangra fort/i, slugs: ['kangra-devi-temples-guide', 'masroor-rock-cut-temple-guide'] },
  { place: /sightseeing|local/i, slugs: ['places-to-visit-in-dharamshala', 'one-day-in-dharamshala'] },
  { place: /shimla/i, slugs: ['shimla-to-dharamshala'] },
  { place: /mcleod/i, slugs: ['mcleod-ganj-complete-guide'] },
];

export function getRouteGuideSlugs(from: string, to: string): string[] {
  const slugs = [from, to].flatMap((p) => ROUTE_GUIDES.filter((r) => r.place.test(p)).flatMap((r) => r.slugs));
  return Array.from(new Set(slugs)).slice(0, 4);
}
