// Site-wide FAQ content for the /faq ("Questions & Answers") page.
// Time-sensitive facts (fees, flights, train/ropeway status, rules) were checked in October 2026.
// Re-verify before each season: Triund fees/camping rules, Gaggal flights, ropeway and toy train status.

export interface SiteFAQ {
  question: string;
  answer: string;
  link?: { href: string; label: string };
}

export interface FAQCategory {
  id: string;
  title: string;
  faqs: SiteFAQ[];
}

export const faqCategories: FAQCategory[] = [
  {
    id: 'planning-best-time',
    title: 'Planning & Best Time',
    faqs: [
      {
        question: 'What is the best time to visit Dharamshala?',
        answer:
          "March to June and late September to November are the most comfortable months to visit Dharamshala. Spring and early summer bring clear days of roughly 15-30°C, ideal for Triund and sightseeing, while October and November offer crisp mountain views and fewer crowds. December to February is cold with occasional snow in the upper villages, and July to mid-September is heavy monsoon, when trails get slippery and landslides can disrupt roads.",
        link: { href: '/blog/best-time-to-visit-dharamshala', label: 'Month-by-month guide' },
      },
      {
        question: 'How many days do I need for Dharamshala and McLeod Ganj?',
        answer:
          "Three to four days is enough to see the highlights. Spend one day in McLeod Ganj (Tsuglagkhang Complex, Bhagsu and the cafes), one day on the Triund trek, and one day on Norbulingka, lower Dharamshala or the Kangra Valley. Add two more days if you want Bir Billing paragliding, Palampur's tea gardens or a slow stay in Dharamkot or Naddi. Many yoga students and remote workers stay for weeks.",
        link: { href: '/blog/dharamshala-weekend-itinerary', label: 'Sample itinerary' },
      },
      {
        question: 'Is a weekend enough for Dharamshala?',
        answer:
          "Yes, a two-night weekend works if you focus on McLeod Ganj plus either Triund or a Bhagsu and Dharamkot walk. Arrive early on day one for the temple and market, hike on day two, and leave on day three after a morning at Norbulingka or St. John in the Wilderness. An overnight bus or a morning flight from Delhi makes this realistic, but allow extra travel time in monsoon and winter.",
        link: { href: '/blog/dharamshala-weekend-itinerary', label: '2-night weekend plan' },
      },
      {
        question: 'How much does a trip to Dharamshala cost?',
        answer:
          "A budget traveller can manage on roughly ₹1,500-2,500 per person per day using hostels, guesthouses, buses and shared taxis. Mid-range couples typically spend about ₹5,000-9,000 per day, including a ₹2,000-5,000 room, meals and a taxi for sightseeing. Costs rise in May-June, Diwali and the Christmas to New Year week, and drop in monsoon. Treks, paragliding and long taxi transfers are the biggest extras. All figures are approximate as of 2026.",
        link: { href: '/blog/dharamshala-trip-cost-budget', label: 'Full budget breakdown' },
      },
      {
        question: 'When is peak season, and how early should I book?',
        answer:
          "Peak demand runs from about mid-April to June, plus long weekends, Diwali and the Christmas to New Year week. In these periods the best mountain-view rooms in McLeod Ganj, Dharamkot and Naddi fill up and rates climb, so book two to three weeks ahead, and earlier for holiday weekends. Weekdays in March, October and November are usually easier to book and better value.",
        link: { href: '/hotels', label: 'Check hotel availability' },
      },
      {
        question: 'Is Dharamshala good for families with kids or elderly parents?',
        answer:
          "Yes, Dharamshala works well for families if you plan around the hills. Choose a hotel with road access rather than one reached by steep steps, and stay in lower Dharamshala or central McLeod Ganj for easy taxis. The Tsuglagkhang Complex, Norbulingka, the War Memorial, the cricket stadium and Kangra Fort are all gentle outings. Fit older children can manage Triund, while younger kids and elderly travellers may prefer the Naddi viewpoint or a short Bhagsu walk.",
        link: { href: '/destinations/dharamshala', label: 'Dharamshala guide' },
      },
      {
        question: 'Can I combine Dharamshala with Manali, Bir or Palampur?',
        answer:
          "Yes, Dharamshala pairs well with Palampur, Bir and Manali, as long as you do not cram the route. Dharamshala to Manali is roughly 230-250 km and usually takes 7-9 hours by road, so treat it as a full travel day. A comfortable circuit from Delhi takes about 7-9 days: Dharamshala and McLeod Ganj first, then Palampur and Bir, then on to Manali.",
        link: { href: '/blog/himachal-itinerary-delhi-dharamshala-manali', label: 'Delhi-Dharamshala-Manali itinerary' },
      },
    ],
  },
  {
    id: 'getting-there-around',
    title: 'Getting There & Around',
    faqs: [
      {
        question: 'How do I reach Dharamshala from Delhi?',
        answer:
          "You can fly, take an overnight bus or drive from Delhi to Dharamshala. Flights to Kangra (Gaggal) Airport take about 1 hour 15 minutes to 1 hour 30 minutes. HRTC and private Volvo buses leave Delhi (ISBT Kashmere Gate and Majnu Ka Tilla) in the evening and take roughly 10-13 hours. By road it is about 475-520 km depending on the route, a 9-11 hour drive. Trains run to Pathankot, about 85-90 km away, followed by a taxi or bus.",
        link: { href: '/blog/how-to-reach-dharamshala', label: 'How to reach Dharamshala' },
      },
      {
        question: 'Which is the nearest airport, and which airlines fly there?',
        answer:
          "Kangra Airport at Gaggal (code DHM) is the nearest, about 13-15 km from Dharamshala and roughly 18-20 km from McLeod Ganj. As of 2026 the main Delhi route is flown by IndiGo and SpiceJet on small turboprop aircraft, and some regional links such as Chandigarh and Shimla have operated seasonally. Flights are weather-sensitive and fares jump in peak season, so book early and avoid tight onward connections.",
        link: { href: '/taxi', label: 'Book an airport transfer' },
      },
      {
        question: 'What is the nearest railway station to Dharamshala?',
        answer:
          "Pathankot Junction, about 85-90 km away, is the nearest practical railway station, with direct broad-gauge trains from Delhi, Jammu and other cities. From Pathankot a taxi takes roughly 2.5-3 hours to Dharamshala, while buses are slower and cheaper. Kangra and Nagrota stations on the narrow-gauge Kangra Valley line are closer, but they serve only slow local trains and are not a realistic way to arrive from Delhi.",
        link: { href: '/taxi', label: 'Pathankot taxi rates' },
      },
      {
        question: 'Is the Kangra Valley toy train running?',
        answer:
          "Yes, the narrow-gauge Pathankot to Joginder Nagar line resumed services in June 2026 after the Chakki river bridge, damaged in the 2022 floods, was rebuilt. It is a slow, scenic ride through Kangra, Palampur and Baijnath, and tickets are usually bought at station counters rather than online. Timings and sections can change after landslides, especially in monsoon, so confirm locally before planning a day around it.",
        link: { href: '/blog/kangra-toy-train-guide', label: 'Kangra toy train guide' },
      },
      {
        question: 'How do I get from Dharamshala to McLeod Ganj?',
        answer:
          "McLeod Ganj is roughly 8-10 km by road above the Dharamshala bus stand, a 20-30 minute drive depending on traffic. Local buses and shared taxis run through the day, and private taxis are easy to find. The Dharamshala Skyway ropeway was suspended in August 2025 after a landslide near one of its pillars, so check locally whether it has reopened before counting on it.",
        link: { href: '/blog/dharamshala-vs-mcleod-ganj', label: 'Dharamshala vs McLeod Ganj' },
      },
      {
        question: 'How do I get around McLeod Ganj, Bhagsu and Dharamkot?',
        answer:
          "Mostly on foot, with taxis for longer hops. Bhagsu is about 2 km from McLeod Ganj's main square, and Dharamkot is a steep 2-3 km walk or a short taxi ride. Lanes are narrow and congested, so walking is often faster in peak season. Local taxis charge fixed point-to-point fares rather than meter rates, so agree the price before you get in. For airport runs, day sightseeing or Bir, a pre-booked cab is easiest.",
        link: { href: '/taxi', label: 'Local taxi service' },
      },
      {
        question: 'How much is a taxi from Gaggal Airport to McLeod Ganj?',
        answer:
          "Expect roughly ₹1,000-1,500 for a sedan from Gaggal Airport to Dharamshala or McLeod Ganj (approx., as of 2026), with higher fares for SUVs and late-night arrivals. The drive usually takes 40-60 minutes depending on traffic in Dharamshala town. There is a taxi stand at the airport, or you can pre-book a pickup so a driver is waiting even if your flight is delayed.",
        link: { href: '/taxi', label: 'Pre-book an airport pickup' },
      },
      {
        question: 'Can I drive my own car to Dharamshala? Is there an entry tax?',
        answer:
          "Yes, the roads via Pathankot or via Una and Kangra are paved all the way, though the last stretch is hilly and narrow. Cars registered outside Himachal Pradesh pay an entry tax at the state border barriers; rates were revised in 2026 and FASTag collection is being introduced, so keep FASTag topped up or cash ready. Parking in McLeod Ganj is scarce and paid, so pick a hotel with parking.",
        link: { href: '/blog/how-to-reach-dharamshala', label: 'Road routes explained' },
      },
    ],
  },
  {
    id: 'where-to-stay',
    title: 'Where to Stay',
    faqs: [
      {
        question: 'Should I stay in Dharamshala or McLeod Ganj?',
        answer:
          "Most first-time visitors are happier in McLeod Ganj, which has the Dalai Lama Temple, cafes, markets and walking access to Bhagsu, Dharamkot and the Triund trail. Lower Dharamshala suits travellers who want quieter hotels with easy road access, the cricket stadium, or quick trips toward Kangra, Palampur and the airport. Families with elderly members often prefer lower Dharamshala for its gentler terrain.",
        link: { href: '/blog/dharamshala-vs-mcleod-ganj', label: 'Compare the two areas' },
      },
      {
        question: 'Where should backpackers and long-stay travellers stay?',
        answer:
          "Bhagsu and Dharamkot are the favourite bases for backpackers, yoga students and long-stay visitors. Both have hostels, family-run guesthouses and relaxed cafes, and monthly rates are often negotiable outside peak season. Dharamkot is quieter and closer to the Triund trail, while Bhagsu is livelier and a short walk from McLeod Ganj. Expect steep paths and limited car access to many guesthouses.",
        link: { href: '/destinations/dharamkot', label: 'Dharamkot guide' },
      },
      {
        question: 'Which area is best for couples and mountain views?',
        answer:
          "Naddi and the upper parts of Dharamkot are best for big Dhauladhar views and a quieter, romantic stay. Naddi sits on a ridge about 3-4 km beyond McLeod Ganj, with view-facing hotels and a well-known sunrise viewpoint. You will need a taxi or a walk to reach McLeod Ganj's market and cafes, so a property with its own restaurant makes evenings easier.",
        link: { href: '/destinations/naddi', label: 'Naddi guide' },
      },
      {
        question: 'How much do hotels in Dharamshala cost?',
        answer:
          "Approximate 2026 rates: hostel dorm beds from about ₹400-700, simple guesthouse rooms from about ₹800-1,500, mid-range hotels around ₹2,000-5,000, and boutique or luxury stays from ₹5,000 to well above ₹10,000 per night. Prices rise in May-June and on holiday weekends and drop noticeably in monsoon. Always check whether breakfast, heating, taxes and parking are included in the quote.",
        link: { href: '/blog/best-hotels-in-dharamshala', label: 'Best hotels by budget' },
      },
      {
        question: 'Do hotels have heating and hot water in winter?',
        answer:
          "Most mid-range and better hotels provide hot water through geysers and offer room heaters, sometimes for an extra charge. Budget guesthouses vary a lot, and power cuts can happen during winter storms, so ask whether the hotel has power backup and whether heaters are included in the rate. Pack warm sleepwear anyway, because many older buildings in the hills are not well insulated.",
        link: { href: '/blog/dharamshala-in-winter-snowfall', label: 'Winter travel tips' },
      },
      {
        question: 'Is it worth staying in Bir or Palampur instead of Dharamshala?',
        answer:
          "Yes, if paragliding or tea gardens are the focus of your trip. Bir is about 65-70 km from Dharamshala, a 2-2.5 hour drive, so a night or two there saves a very early start and lets you enjoy its monasteries and cafes. Palampur, about 35-40 km away, is calmer and suits travellers who want tea estates, Andretta and Baijnath without the McLeod Ganj crowds.",
        link: { href: '/blog/palampur-travel-guide', label: 'Palampur travel guide' },
      },
    ],
  },
  {
    id: 'things-to-do-sightseeing',
    title: 'Things to Do & Sightseeing',
    faqs: [
      {
        question: 'What are the top places to visit in Dharamshala and McLeod Ganj?',
        answer:
          "The essentials are the Tsuglagkhang Complex (Dalai Lama Temple), Bhagsunag temple and waterfall, Dharamkot, the Naddi viewpoint, St. John in the Wilderness church, the War Memorial and Norbulingka Institute. Add the Triund trek if you are reasonably fit, and Kangra Fort, the Masroor rock-cut temples or Palampur if you have an extra day or two.",
        link: { href: '/blog/places-to-visit-in-dharamshala', label: 'Places to visit in Dharamshala' },
      },
      {
        question: 'Is there an entry fee for the Dalai Lama Temple?',
        answer:
          "No, the Tsuglagkhang Complex is free to enter. Visitors pass through a security check, and photography may be restricted inside prayer halls or during special events. The Tibet Museum is now separate, at the Central Tibetan Administration in Gangchen Kyishong (closed Saturdays). Dress modestly, walk clockwise around the temple and keep your voice low. The complex is generally open from early morning to evening, but timings can change on religious days and during teachings.",
        link: { href: '/blog/dalai-lama-temple-guide', label: 'Dalai Lama Temple guide' },
      },
      {
        question: 'Is Bhagsu waterfall worth visiting?',
        answer:
          "Yes, Bhagsu waterfall is an easy and rewarding outing. From McLeod Ganj it is about 2 km to Bhagsunag temple, then roughly a 15-20 minute walk on a paved path to the falls. It is most impressive during and just after the monsoon and can shrink to a trickle in late spring. Go early to beat the crowds, and take care on wet rocks near the pool.",
        link: { href: '/destinations/bhagsu', label: 'Bhagsu guide' },
      },
      {
        question: 'What can I do in Dharamshala on a rainy day?',
        answer:
          "There are plenty of indoor options in Dharamshala on a rainy day. Visit the Tsuglagkhang Complex and Tibet Museum, the Library of Tibetan Works and Archives, Norbulingka Institute or the Kangra Art Museum in Kotwali Bazaar. You can also take a Tibetan cooking class, join a meditation session or settle into one of McLeod Ganj's cafes. Avoid forest trails and waterfalls in heavy rain, when rocks are slippery and streams rise fast.",
        link: { href: '/blog/dharamshala-monsoon-travel-guide', label: 'Monsoon travel guide' },
      },
      {
        question: 'What food should I try in McLeod Ganj?',
        answer:
          "Start with Tibetan staples: momos, thukpa, thenthuk, laphing, and tingmo with a vegetable or meat curry, plus butter tea if you are curious. McLeod Ganj also has strong Italian, Israeli and Japanese-influenced menus thanks to its international crowd. Look out for Himachali dham at local eateries, and siddu, a steamed stuffed bread, around Kangra and Palampur.",
        link: { href: '/blog/tibetan-food-mcleod-ganj', label: 'Tibetan food guide' },
      },
      {
        question: 'Can I visit the HPCA Stadium, and what are the timings?',
        answer:
          "Yes. The HPCA Stadium in lower Dharamshala is open to visitors Monday to Saturday, 10 am to 4 pm, and closed on Sundays. You pay at the gate, usually Rs 50 to Rs 250 per person, and no advance booking is needed for a normal visit. On an open day it closes only for matches, VIP movement or maintenance, so call the stadium office on the morning you plan to go. For matches themselves, tickets are sold online through the official ticketing partner announced for that fixture.",
        link: { href: '/blog/hpca-cricket-stadium-guide', label: 'HPCA Stadium timings & tickets' },
      },
      {
        question: 'What are good day trips from Dharamshala?',
        answer:
          "Popular day trips include Kangra Fort with Brajeshwari Devi temple, the Masroor rock-cut temples, Chamunda Devi temple, Palampur's tea gardens with Andretta, Baijnath temple, and Bir for paragliding. Combining Palampur, Baijnath and Bir in one long day is possible but tiring, so most people split them. A private taxi is the most practical way to cover these spots in a day.",
        link: { href: '/blog/places-to-visit-in-kangra', label: 'Places to visit in Kangra' },
      },
      {
        question: 'Where can I learn yoga or meditation in Dharamshala?',
        answer:
          "Dharamkot and Bhagsu are the hubs for yoga classes, teacher trainings and retreats, ranging from drop-in sessions to month-long courses. Tushita Meditation Centre in Dharamkot runs Buddhist meditation courses, and Dhamma Sikhara nearby offers 10-day Vipassana courses. Both require advance registration and fill up quickly in season, so check their official schedules well before your trip.",
        link: { href: '/destinations/dharamkot', label: 'Dharamkot, the yoga village' },
      },
    ],
  },
  {
    id: 'treks-adventure',
    title: 'Treks & Adventure',
    faqs: [
      {
        question: 'How difficult is the Triund trek?',
        answer:
          "Triund is a moderate trek that most reasonably fit beginners can complete. From Gallu Devi temple above Dharamkot it is about 6-7 km to the top, or around 9 km from McLeod Ganj, climbing to roughly 2,850 m. The final switchbacks after Magic View Cafe are steep and rocky. Most people take 3-5 hours up and 2-3 hours down, with tea stalls along the way.",
        link: { href: '/treks/triund-trek', label: 'Guided Triund trek' },
      },
      {
        question: 'Is camping allowed at Triund?',
        answer:
          "Yes, overnight camping at Triund is currently permitted but regulated by the Forest Department. Reported rules cap the top at about 20 tents and 40 overnight campers, with a tent fee of ₹550 for two people that includes entry. Rules have changed several times since 2018, and the trail can be closed during heavy snow or weather alerts, so confirm the current status locally or book with a registered operator.",
        link: { href: '/blog/triund-trek-complete-guide', label: 'Triund trek complete guide' },
      },
      {
        question: 'What is the Triund trek entry fee?',
        answer:
          "Under the Forest Department's 2024 revision, the Triund entry fee is ₹100 per person per day, and overnight tenting costs ₹550 for two people including entry. Since 11 August 2026 there is also a refundable ₹500 waste deposit, returned when you bring your rubbish back down. Carry cash and photo ID for the checkpoint. Rules changed several times in 2026, so check locally.",
        link: { href: '/treks/triund-trek', label: 'Triund trek details' },
      },
      {
        question: 'Can I do Triund in one day?',
        answer:
          "Yes, Triund is commonly done as a day hike. Start from Gallu Devi or McLeod Ganj by 7-8 am, reach the top by late morning, and aim to be back before dark. In winter daylight is short and the upper trail can be icy, so start earlier and carry microspikes if there is snow. If you want sunset and sunrise over the Dhauladhar, choose an overnight trip with a registered operator.",
        link: { href: '/treks/triund-trek', label: 'Day or overnight Triund' },
      },
      {
        question: 'Can I go beyond Triund to Snowline and Indrahar Pass?',
        answer:
          "Yes, but only with a guide and proper preparation. Snowline Cafe and Laka Got lie roughly 2-2.5 km beyond Triund, while Indrahar Pass at about 4,300 m involves a long, exposed day with boulder scrambling. The Kangra administration has at times banned trekking above 3,000 m during snowfall, so check current orders and the forecast. This is a serious high-altitude trek, not a casual add-on.",
        link: { href: '/treks', label: 'All treks near Dharamshala' },
      },
      {
        question: 'How hard is the Kareri Lake trek?',
        answer:
          "Kareri Lake is a moderate 2-3 day trek to a high lake at about 2,934 m in the Dhauladhar range. The usual route starts near Ghera village, about 20-25 km by road from Dharamshala, and follows the Nyund stream through Kareri village, roughly 13-16 km one way depending on where you start walking. Expect stream crossings and rocky sections. May-June and late September-October are the best months.",
        link: { href: '/treks/kareri-lake-trek', label: 'Kareri Lake trek package' },
      },
      {
        question: 'Is paragliding at Bir Billing safe?',
        answer:
          "Tandem paragliding at Bir Billing has a good track record when flown with registered, experienced pilots in suitable weather, but it is an adventure sport with real risk, and accidents do occasionally happen. Fly only with operators registered with the Himachal tourism department, ask about pilot experience and insurance, wear the harness and helmet properly, and accept a cancellation if the wind is wrong. Avoid cheap unregistered offers.",
        link: { href: '/blog/bir-billing-paragliding-guide', label: 'Bir Billing paragliding guide' },
      },
      {
        question: 'When is paragliding season at Bir Billing, and how much does it cost?',
        answer:
          "Paragliding at Bir Billing usually runs from mid-September to mid-July, with a mandatory monsoon break from about 15 July to 15 September every year. October-November and March-May are the best months. As of 2026, tandem flights generally cost about ₹2,500-4,500 depending on flight length, with longer cross-country flights costing more and video often charged extra.",
        link: { href: '/paragliding', label: 'Paragliding packages' },
      },
      {
        question: 'How far is Bir Billing from Dharamshala?',
        answer:
          "Bir is about 65-70 km from Dharamshala by road, roughly 2-2.5 hours via Palampur. The take-off at Billing sits at about 2,400 m and the landing ground in Bir is at roughly 1,400-1,500 m, giving close to 1,000 m of height difference. Leave early, as flights typically run from late morning into the afternoon. Day trips are common, but a night in Bir is more relaxed.",
        link: { href: '/taxi', label: 'Taxi to Bir' },
      },
    ],
  },
  {
    id: 'weather-snow',
    title: 'Weather & Snow',
    faqs: [
      {
        question: 'Does it snow in Dharamshala?',
        answer:
          "Snow is common on the Dhauladhar peaks in winter but rare in lower Dharamshala town. McLeod Ganj, Naddi, Dharamkot and Triund get occasional snowfall, most likely from late December to February, with January usually the best bet. Snow is not guaranteed every year, and some winters see little or none, so keep your plans flexible if snow is the main reason for your trip.",
        link: { href: '/blog/dharamshala-in-winter-snowfall', label: 'Dharamshala in winter' },
      },
      {
        question: 'What is the weather like in Dharamshala in October?',
        answer:
          "October is one of the best months to visit Dharamshala. The monsoon has ended, skies are usually clear and the Dhauladhar range is sharp. Daytime temperatures are typically around 18-25°C in Dharamshala and a few degrees cooler in McLeod Ganj, with chilly nights. Triund is usually in good condition, and paragliding at Bir Billing is back in season after the monsoon break.",
        link: { href: '/blog/dharamshala-weather-what-to-pack', label: 'Weather and packing guide' },
      },
      {
        question: 'How cold is Dharamshala in December and January?',
        answer:
          "Dharamshala is cold in December and January, especially at night. Lower Dharamshala typically sees daytime highs of around 12-17°C and nights of about 3-6°C, while McLeod Ganj and Naddi are a few degrees colder and can approach freezing. Sunny days are pleasant, but rain or snow spells make it bitterly cold. Pack thermals, a heavy jacket, gloves and a woollen cap.",
        link: { href: '/blog/dharamshala-in-winter-snowfall', label: 'Winter and snowfall guide' },
      },
      {
        question: 'Is it safe to visit Dharamshala in monsoon?',
        answer:
          "Visiting Dharamshala in monsoon is possible but needs care. It is one of the wettest places in Himachal, receiving around 3,000 mm of rain a year, most of it from July to mid-September. Landslides can block roads, treks become slippery, and paragliding is stopped from mid-July to mid-September. If you go, keep plans flexible, follow weather alerts and choose refundable bookings.",
        link: { href: '/blog/dharamshala-monsoon-travel-guide', label: 'Monsoon travel guide' },
      },
      {
        question: 'What should I pack for Dharamshala?',
        answer:
          "Pack layers in every season. Even in summer, evenings in McLeod Ganj are cool, so bring a fleece or light jacket; in winter add thermals, a down jacket, gloves and a cap. Comfortable shoes with good grip are essential because of the steep lanes. A rain jacket or umbrella is useful year-round and essential in monsoon. Add sunscreen, a reusable water bottle and basic medicines.",
        link: { href: '/blog/dharamshala-weather-what-to-pack', label: 'Full packing list' },
      },
      {
        question: 'Do roads close because of snow or landslides?',
        answer:
          "Sometimes. In winter, snow can make the upper roads to Naddi and Dharamkot slippery and occasionally block them for a day or two, while main highways usually stay open. In monsoon, landslides are the bigger risk and can disrupt highways and village roads across Kangra. Check district administration and police updates before long drives, and keep a buffer day before an important flight or train.",
        link: { href: '/taxi', label: 'Taxis with local drivers' },
      },
    ],
  },
  {
    id: 'safety-health-practical',
    title: 'Safety, Health & Practical',
    faqs: [
      {
        question: 'Is Dharamshala safe for solo women travellers?',
        answer:
          "Dharamshala and McLeod Ganj are generally considered among the safer and more welcoming places in India for solo women travellers. Usual precautions apply: avoid isolated forest trails after dark, trek with others or a registered guide, use known taxis late at night, and share your plans with your accommodation. Dress is relaxed in town, but cover shoulders and knees at temples. Dial 112 in any emergency.",
        link: { href: '/destinations/mcleod-ganj', label: 'McLeod Ganj guide' },
      },
      {
        question: 'Do I need a permit to visit Dharamshala or McLeod Ganj?',
        answer:
          "No special permit is needed for Indian or foreign tourists to visit Dharamshala, McLeod Ganj, Bhagsu, Palampur or Bir. The permits you are likely to meet are trek fees, such as the Triund entry and camping fees, and permissions for higher Dhauladhar routes. Foreign nationals should carry their passport and visa, because hotels are required to register foreign guests.",
        link: { href: '/treks', label: 'Treks and permits' },
      },
      {
        question: 'Are there ATMs, and can I pay by card or UPI?',
        answer:
          "Yes, Dharamshala and McLeod Ganj have several bank ATMs, and UPI is accepted at most shops, cafes and taxis. ATMs can run short of cash on long weekends, and smaller villages such as Dharamkot and Naddi have few or none, so carry some cash. International cards work at larger hotels, but many small cafes and guesthouses prefer cash or UPI.",
        link: { href: '/destinations/mcleod-ganj', label: 'McLeod Ganj essentials' },
      },
      {
        question: 'How good is mobile network and internet in Dharamshala?',
        answer:
          "Jio and Airtel generally offer good 4G, and 5G in many areas, across Dharamshala and McLeod Ganj, with BSNL useful in some rural pockets. Signal weakens on forest trails and is patchy at Triund and beyond. Many hotels and cafes offer Wi-Fi, but speeds vary, so remote workers should ask about fibre broadband and power backup before booking a long stay.",
        link: { href: '/blog/dharamshala-for-digital-nomads', label: 'Guide for digital nomads' },
      },
      {
        question: 'Will I get altitude sickness in Dharamshala?',
        answer:
          "Altitude sickness is unlikely in Dharamshala and McLeod Ganj, which sit between roughly 1,400 m and 2,100 m. Triund at about 2,850 m is also usually fine for healthy people. Risk rises on higher treks such as Indrahar Pass at about 4,300 m, where you should acclimatise, climb gradually, drink plenty of water and turn back if you develop headache, nausea or breathlessness.",
        link: { href: '/treks', label: 'Choose the right trek' },
      },
      {
        question: 'Can I drink alcohol in McLeod Ganj?',
        answer:
          "Yes, alcohol is legally sold in licensed shops, bars and some restaurants, but drinking in public places is an offence under the Himachal Pradesh Excise Act and police do act on it. Drinking on trails, at the Triund campsite or near temples and monasteries is disrespectful and can attract fines. Dry days apply on certain holidays and election days, and some cafes do not serve alcohol.",
        link: { href: '/destinations/mcleod-ganj', label: 'McLeod Ganj guide' },
      },
      {
        question: 'Is plastic banned in Himachal Pradesh?',
        answer:
          "Yes, Himachal Pradesh banned polythene carry bags in 2009 and has since restricted many single-use plastic items, with fines for violations. Carry a cloth bag and a reusable water bottle, since many cafes and guesthouses offer refills. On treks such as Triund and Kareri, carry all your waste back down, because litter at popular campsites has been a long-standing problem.",
        link: { href: '/blog/triund-trek-complete-guide', label: 'Responsible trekking at Triund' },
      },
      {
        question: 'Are monkeys or wildlife a problem in McLeod Ganj?',
        answer:
          "Monkeys are common in McLeod Ganj, Bhagsu and Dharamkot and may snatch food or bags, so do not feed them, keep windows and balcony doors shut, and avoid carrying visible food. Stray dogs are mostly friendly but sometimes follow trekkers. Leopards and bears live in the surrounding forests, but encounters are rare; stick to trails and avoid walking alone in the forest after dark.",
        link: { href: '/destinations/bhagsu', label: 'Bhagsu guide' },
      },
    ],
  },
  {
    id: 'culture-etiquette',
    title: 'Culture & Etiquette',
    faqs: [
      {
        question: 'Can I see the Dalai Lama in Dharamshala?',
        answer:
          "Possibly, but not on demand. His Holiness the Dalai Lama lives in McLeod Ganj, but he also travels, and his public appearances are limited. Teachings and long-life prayer ceremonies at the Tsuglagkhang are announced on the official schedule at dalailama.com. Private audiences are rare. If an event is scheduled, foreign visitors usually need to register in advance with a passport and photos, and phones and bags are restricted.",
        link: { href: '/blog/dalai-lama-temple-guide', label: 'Dalai Lama Temple guide' },
      },
      {
        question: 'What is the etiquette at Tibetan monasteries and temples?',
        answer:
          "Dress modestly, remove shoes and hats where asked, and walk clockwise around temples, stupas and prayer wheels. Do not touch statues or point your feet at them, keep your voice low, and ask before photographing monks or prayer halls. Avoid sitting on cushions reserved for monks, and do not interrupt prayers. Small donations are welcome but never expected.",
        link: { href: '/blog/dalai-lama-temple-guide', label: 'Visiting the Tsuglagkhang' },
      },
      {
        question: 'Why is McLeod Ganj called Little Lhasa?',
        answer:
          "McLeod Ganj is called Little Lhasa because it became home to the Dalai Lama and the Tibetan government-in-exile after he fled Tibet in 1959, settling here in 1960. Thousands of Tibetan refugees followed, and the area now hosts the main temple, monasteries, schools, the Library of Tibetan Works and Archives and other Tibetan institutions. The community shapes the town's food, festivals and daily rhythm.",
        link: { href: '/destinations/mcleod-ganj', label: 'About McLeod Ganj' },
      },
      {
        question: 'What festivals take place in Dharamshala and McLeod Ganj?',
        answer:
          "The biggest Tibetan festival is Losar, the Tibetan New Year, usually in February or March. The Dalai Lama's birthday on 6 July is celebrated in McLeod Ganj, and Saga Dawa falls around May or June. Navratri draws large crowds to the Kangra Valley's Devi temples, and the Dharamshala International Film Festival has typically been held in autumn. Dates shift each year, so check before planning.",
        link: { href: '/blog/things-to-do-in-mcleod-ganj', label: 'Things to do in McLeod Ganj' },
      },
      {
        question: 'How should I dress in McLeod Ganj?',
        answer:
          "Casual clothing is fine around town, but modest dress is respectful at temples, monasteries and in villages. Cover your shoulders and knees when visiting the Tsuglagkhang Complex, Bhagsunag temple or the Devi temples in the valley, and remove shoes where required. Comfortable walking shoes with grip matter more than style, as the lanes are steep and can be slippery in rain.",
        link: { href: '/blog/dharamshala-weather-what-to-pack', label: 'What to pack' },
      },
      {
        question: 'How can I support the Tibetan community respectfully?',
        answer:
          "Buy crafts, books and food directly from Tibetan-run shops, restaurants and cooperatives, and visit institutions such as Norbulingka that sustain traditional arts. Some local NGOs run conversation sessions where visitors help Tibetans practise English, which is a meaningful way to connect. Be sensitive in political conversations, and avoid treating monks or refugees as photo subjects without asking.",
        link: { href: '/blog/things-to-do-in-mcleod-ganj', label: 'Meaningful things to do' },
      },
      {
        question: 'Can I visit Norbulingka Institute and Gyuto Monastery?',
        answer:
          "Yes, both are in the Sidhbari area below Dharamshala and are easy to visit together. Norbulingka is a centre for Tibetan arts with workshops, Japanese-style gardens, a temple and a cafe, and charges a modest entry fee. Gyuto Monastery, seat of the Gyuto tantric monastic college, is nearby with fine Dhauladhar views. Allow two to three hours, and check opening days before you go.",
        link: { href: '/blog/places-to-visit-in-dharamshala', label: 'Places to visit in Dharamshala' },
      },
    ],
  },
  {
    id: 'palampur-kangra-nearby',
    title: 'Palampur, Kangra & Nearby',
    faqs: [
      {
        question: 'How far is Palampur from Dharamshala, and is it worth visiting?',
        answer:
          "Palampur is about 35-40 km from Dharamshala, roughly 1-1.5 hours by road. It is worth a day or a night for its tea gardens, Neugal Khad, Saurabh Van Vihar and nearby Andretta and Baijnath. The town is calmer and greener than McLeod Ganj and makes a natural stop on the way to Bir Billing, so many travellers combine the two.",
        link: { href: '/blog/palampur-travel-guide', label: 'Palampur travel guide' },
      },
      {
        question: 'Can I visit tea gardens in the Kangra Valley?',
        answer:
          "Yes, Kangra tea, which carries a Geographical Indication tag, grows around Palampur and on the slopes below Dharamshala. Palampur has the most accessible estates, including a cooperative tea factory where visits have been possible, and you can walk through several gardens freely. Spring, from March to May, is a lovely time to see plucking. Check factory visiting hours locally before you go.",
        link: { href: '/blog/palampur-travel-guide', label: 'Tea gardens of Palampur' },
      },
      {
        question: 'What is Kangra Fort, and how do I visit it?',
        answer:
          "Kangra Fort is one of the oldest and largest forts in the Himalayas, the historic seat of the Katoch dynasty, about 20 km from Dharamshala near Kangra town. It has grand gateways, temple ruins and views over the confluence of the Banganga and Patal Ganga rivers, plus the adjoining Maharaja Sansar Chand Museum. Allow 1.5-2 hours, wear good shoes, and combine it with Brajeshwari Devi temple.",
        link: { href: '/blog/places-to-visit-in-kangra', label: 'Places to visit in Kangra' },
      },
      {
        question: 'What are the Masroor rock-cut temples?',
        answer:
          "Masroor is a group of monolithic temples carved from a single sandstone ridge around the 8th century, often compared to Ellora. It lies roughly 40-45 km from Dharamshala via Kangra and is protected by the Archaeological Survey of India. The site is partly ruined but striking, with a reflecting pool and Dhauladhar views on clear days. Combine it with Kangra Fort for a full-day trip.",
        link: { href: '/blog/places-to-visit-in-kangra', label: 'Kangra sightseeing guide' },
      },
      {
        question: 'Which famous temples are near Dharamshala?',
        answer:
          "The best-known temples near Dharamshala are Chamunda Devi (about 15 km), Brajeshwari Devi in Kangra (about 18-20 km), Baijnath Shiva temple (about 50 km), Jwalamukhi (about 55 km) and Bhagsunag near McLeod Ganj. Chamunda, Brajeshwari and Jwalamukhi are important Devi shrines and become very crowded during Navratri. Start early, dress modestly and expect security checks at the bigger temples.",
        link: { href: '/blog/kangra-devi-temples-guide', label: 'Kangra Devi temples guide' },
      },
      {
        question: 'What is Andretta known for?',
        answer:
          "Andretta is a small artists' village about 13 km from Palampur, founded as an art colony in the 1930s by Irish theatre pioneer Norah Richards. It is known for the Andretta Pottery and Craft Society, where visitors can watch potters at work and sometimes try the wheel, and for the Sobha Singh Art Gallery. Studios keep irregular hours, so check timings before you visit.",
        link: { href: '/blog/palampur-travel-guide', label: 'Palampur and Andretta' },
      },
      {
        question: 'Is Bir only for paragliding?',
        answer:
          "No, Bir is also a peaceful Tibetan settlement with several monasteries, including Palpung Sherab Ling and Chokling Gompa, plus relaxed cafes and walks through tea gardens. Many travellers spend two or three nights there for meditation courses, cycling and slow travel, even outside paragliding season. It makes a good, quieter contrast to the crowds of McLeod Ganj.",
        link: { href: '/blog/bir-billing-paragliding-guide', label: 'Bir Billing guide' },
      },
    ],
  },
  {
    id: 'booking-with-dharamshala-stay',
    title: 'Booking with Dharamshala Stay',
    faqs: [
      {
        question: 'How does booking with Dharamshala Stay work?',
        answer:
          "Browse our listings, choose a hotel, trek, taxi or paragliding option, and send an inquiry through the website or message us on WhatsApp. Our local team checks availability for your dates and shares the exact rate and what it includes. Nothing is confirmed until you accept the quote, after which we help finalise the booking with the property or operator.",
        link: { href: '/contact', label: 'Send an inquiry' },
      },
      {
        question: 'Do you charge a booking fee?',
        answer:
          "No. Our service is free for travellers and we do not add a booking fee to your quote. We earn a small commission from the properties and operators we work with. Before you confirm, we explain exactly what the rate includes, such as taxes, breakfast or transfers, so there are no surprises when you check in.",
        link: { href: '/hotels', label: 'Browse hotels' },
      },
      {
        question: 'Are the prices on the website final?',
        answer:
          "No, prices shown on our listings are indicative. Hotel rates change with dates, season and occupancy, so when you inquire we share the exact rate for your dates. Our quotes are often better than the big booking platforms because we deal with properties directly, but rates vary, so always compare the final quote against what you have seen elsewhere.",
        link: { href: '/hotels', label: 'See indicative rates' },
      },
      {
        question: 'Can you match a price I found on a booking site?',
        answer:
          "Often, yes. Send us the link or a screenshot along with your dates, and we will check with the property. Many hotels can offer an equal or better rate when booked directly, but we cannot guarantee a match on every date, especially for non-refundable deals, member-only prices or flash sales on large booking platforms.",
        link: { href: '/contact', label: 'Ask for a price check' },
      },
      {
        question: 'Are the properties you list verified?',
        answer:
          "We list properties our local team knows, and we check details such as location, access, room condition and views before adding them. Standards still vary by budget, so tell us what matters most to you, whether that is road access, heating or a quiet room, and we will suggest stays that fit. If something is not as described, contact us during your stay and we will help sort it out.",
        link: { href: '/hotels', label: 'Browse verified stays' },
      },
      {
        question: 'Can you plan my whole trip?',
        answer:
          "Yes. Send us your dates, group size, budget and interests on WhatsApp or through the contact form, and we can suggest a plan covering hotels, airport or intercity taxis, Triund or Kareri treks, Bir Billing paragliding and sightseeing. You can book just one part or the whole trip, and there is no charge for planning help.",
        link: { href: '/contact', label: 'Plan my trip' },
      },
      {
        question: 'How quickly will you reply to my inquiry?',
        answer:
          "We aim to reply on WhatsApp within a couple of hours during the day, and inquiries sent late at night are answered the next morning. In peak season, include your exact dates, number of guests, budget and preferred area in your first message, so we can share suitable options in one go rather than going back and forth.",
        link: { href: '/contact', label: 'Contact us' },
      },
      {
        question: 'What is the cancellation policy?',
        answer:
          "Cancellation terms depend on the hotel, operator and season, so we share the specific policy with every quote before you confirm. Many hotels allow free cancellation up to a set number of days before arrival, while peak-season and holiday bookings are often stricter. Treks and paragliding flights cancelled because of weather are usually rescheduled or refunded according to the operator's terms.",
        link: { href: '/contact', label: 'Ask about a booking' },
      },
    ],
  },
];
