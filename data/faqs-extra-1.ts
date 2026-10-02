// Additional Q&As for the /faq page (batch 1). Merged into faqCategories by category id.
// Written October 2026. Prices are approximate; re-verify fees, rules and seasonal closures each season.
import type { FAQCategory } from './faqs';

export const faqsExtra1: FAQCategory[] = [
  {
    id: 'planning-best-time',
    title: 'Planning & Best Time',
    faqs: [
      {
        question: 'Is Dharamshala worth visiting?',
        answer:
          "Yes, Dharamshala is worth visiting if you enjoy mountain views, Tibetan culture, easy treks and a slower pace. Few hill towns combine the Dalai Lama's temple, monasteries, Triund, waterfalls, tea gardens and Kangra's forts and temples within an hour or two. It is less about shopping malls or nightlife and more about walks, cafes and culture. Avoid peak weekends in May-June if you dislike traffic and crowds.",
        link: { href: '/blog/dharamshala-complete-travel-guide', label: 'Complete Dharamshala travel guide' },
      },
      {
        question: 'Which is better, Dharamshala or Manali?',
        answer:
          "It depends on what you want. Dharamshala and McLeod Ganj are better for Tibetan culture, monasteries, yoga, cafes and moderate treks like Triund, and they are usually a little cheaper and calmer. Manali is better for snow activities, river rafting, the Atal Tunnel and high-altitude trips to Sissu and beyond. Many travellers do both on one trip, allowing a full day for the roughly 7-9 hour drive between them.",
        link: { href: '/blog/himachal-itinerary-delhi-dharamshala-manali', label: 'Dharamshala and Manali itinerary' },
      },
    ],
  },
  {
    id: 'getting-there-around',
    title: 'Getting There & Around',
    faqs: [
      {
        question: 'Do Uber and Ola work in Dharamshala?',
        answer:
          "Not reliably. App-based cabs are rare in Dharamshala and McLeod Ganj, and local taxis, which work through taxi unions, handle most trips at fixed point-to-point fares. You may occasionally find an app cab for a drop from outside, but do not count on one for a pickup. For airport, station or day-trip transfers, book a local taxi in advance or ask your hotel to arrange one.",
        link: { href: '/blog/local-transport-dharamshala', label: 'Local transport guide' },
      },
      {
        question: 'Can I rent a scooter or bike in McLeod Ganj?',
        answer:
          "Yes, scooter and motorbike rentals are available in McLeod Ganj and lower Dharamshala, usually by the day, with your original driving licence and an ID required. Wear a helmet, as police do check, and be ready for steep, narrow and congested roads with tight hairpins. Parking is scarce in McLeod Ganj. Inspect the brakes and tyres and photograph any damage before you ride away. Rates vary by season, so compare a couple of shops.",
        link: { href: '/blog/local-transport-dharamshala', label: 'Getting around Dharamshala' },
      },
      {
        question: 'How do I get from Dharamshala to Amritsar?',
        answer:
          "The easiest way is a taxi, which covers the roughly 200 km in about 5-6 hours via Pathankot. Buses run between Dharamshala and Pathankot, and from Pathankot there are frequent buses and trains to Amritsar, which is cheaper but slower. Leave early if you want to reach the Golden Temple or the Attari-Wagah border ceremony the same day, as the ceremony is held in the late afternoon.",
        link: { href: '/taxi', label: 'Outstation taxi rates' },
      },
    ],
  },
  {
    id: 'where-to-stay',
    title: 'Where to Stay',
    faqs: [
      {
        question: 'Are there homestays in Dharamshala and McLeod Ganj?',
        answer:
          "Yes, homestays are common in Dharamkot, Bhagsu, Naddi, Sidhbari and the villages around Dharamshala, usually run by Himachali or Tibetan families. They often include home-cooked meals and are good value for longer stays. Ask about road access, heating in winter and hot water before you book, since many are reached by footpaths or steps. Registered homestays should give you a proper bill and record ID for foreign guests.",
        link: { href: '/hotels', label: 'Browse stays' },
      },
    ],
  },
  {
    id: 'things-to-do-sightseeing',
    title: 'Things to Do & Sightseeing',
    faqs: [
      {
        question: 'What should I buy in McLeod Ganj?',
        answer:
          "Good buys in McLeod Ganj include Tibetan handicrafts, singing bowls, thangka paintings, prayer flags, woollen shawls and socks, Kangra tea and books on Buddhism. Norbulingka's shop sells high-quality crafts made on site. Temple Road and Jogiwara Road have most of the stalls. Bargaining politely is normal at street stalls but not in fixed-price shops, and many bowls and 'antiques' are new, so buy what you like rather than paying for claimed age.",
        link: { href: '/blog/shopping-in-mcleod-ganj', label: 'Shopping in McLeod Ganj' },
      },
      {
        question: 'Where are the best sunset points in Dharamshala?',
        answer:
          "The best-known sunset spots are the Naddi viewpoint, Triund ridge, the slopes above Dharamkot, and the War Memorial area and HPCA Stadium in lower Dharamshala for warm light on the Dhauladhar. Clear evenings from October to March give the sharpest colours. In monsoon, clouds often hide the range entirely. Carry a warm layer, because temperatures drop quickly once the sun sets, especially at Naddi and Triund.",
        link: { href: '/blog/photography-spots-sunset-points-dharamshala', label: 'Photography and sunset spots' },
      },
    ],
  },
  {
    id: 'safety-health-practical',
    title: 'Safety, Health & Practical',
    faqs: [
      {
        question: 'Is McLeod Ganj safe at night?',
        answer:
          "Yes, central McLeod Ganj is generally safe in the evening, with people around until about 10 pm. Later, streets empty quickly and lighting on the paths to Dharamkot, Bhagsu and Naddi is poor, so carry a torch or take a taxi. Avoid forest shortcuts after dark because of stray dogs, slippery steps and occasional wildlife. Keep your hotel's number handy, and dial 112 in any emergency.",
        link: { href: '/blog/solo-female-travel-dharamshala', label: 'Safety tips for solo travellers' },
      },
      {
        question: 'What emergency numbers should I save for Dharamshala?',
        answer:
          "Save 112, India's single emergency number, which connects to police, fire and ambulance services and works from any phone. 108 is the ambulance service in Himachal Pradesh. Also save your hotel's number, your trek operator's number and, if you are a foreign national, your embassy's emergency line. Mobile signal is weak on forest trails, so tell someone your route before you trek.",
        link: { href: '/blog/health-medical-help-dharamshala', label: 'Health and medical help' },
      },
      {
        question: 'Can I fly a drone in Dharamshala?',
        answer:
          "Only within India's drone rules, and generally not near sensitive sites. Drones must be registered and flown according to the Digital Sky airspace map, and the area around Kangra Airport at Gaggal is restricted. Flying over the Tsuglagkhang Complex, monasteries and crowds is not permitted, and security around the Dalai Lama's residence is tight. Foreign visitors face extra restrictions on bringing and flying drones, so check the current rules before travelling.",
        link: { href: '/blog/rules-permits-dos-donts-dharamshala', label: 'Rules and permits' },
      },
    ],
  },
  {
    id: 'culture-etiquette',
    title: 'Culture & Etiquette',
    faqs: [
      {
        question: 'Can I volunteer in McLeod Ganj?',
        answer:
          "Yes, volunteering is popular in McLeod Ganj, especially English conversation sessions with Tibetan refugees and short teaching or support roles with community organisations. Drop-in conversation classes need no long commitment, while longer placements usually require advance applications and a minimum stay. Foreign nationals should note that tourist visas restrict formal work, so stick to genuine volunteering and avoid programmes that charge high fees for little real contribution.",
        link: { href: '/blog/volunteering-in-mcleod-ganj', label: 'Volunteering in McLeod Ganj' },
      },
    ],
  },
  {
    id: 'palampur-kangra-nearby',
    title: 'Palampur, Kangra & Nearby',
    faqs: [
      {
        question: 'Can I visit Dalhousie and Khajjiar from Dharamshala?',
        answer:
          "Yes, but it is a long trip. Dalhousie is roughly 115-125 km from Dharamshala, about 4-5 hours by road, and Khajjiar is a further 22-24 km. A same-day return is possible but exhausting, so most travellers stay one or two nights in Dalhousie. Winter snow can close the Dalhousie-Khajjiar road for short periods, and monsoon landslides affect the route, so check conditions first.",
        link: { href: '/blog/dalhousie-khajjiar-from-dharamshala', label: 'Dalhousie and Khajjiar trip' },
      },
      {
        question: 'Is Pong Dam worth visiting from Dharamshala?',
        answer:
          "Yes, especially for birdwatchers in winter. Pong Dam's reservoir, Maharana Pratap Sagar, is a protected wetland roughly 60-70 km from Dharamshala, and from about November to March it hosts large flocks of migratory waterbirds such as bar-headed geese. Go early in the morning and bring binoculars. Outside the migration season it is a pleasant lakeside drive rather than a must-see.",
        link: { href: '/blog/pong-dam-bird-sanctuary-guide', label: 'Pong Dam bird sanctuary guide' },
      },
    ],
  },
  {
    id: 'money-costs',
    title: 'Money, Costs & Payments',
    faqs: [
      {
        question: 'Can foreign tourists use UPI in Dharamshala?',
        answer:
          "Usually not directly, because UPI needs an Indian bank account and mobile number. Some issuers offer prepaid UPI wallets for foreign visitors, such as UPI One World, but availability is limited. In practice, foreign travellers should carry rupees in cash for cafes, taxis and small shops, and use international cards at larger hotels and some restaurants. Withdraw cash in McLeod Ganj or lower Dharamshala before heading to the villages.",
        link: { href: '/blog/atm-mobile-network-internet-dharamshala', label: 'ATMs, money and internet' },
      },
      {
        question: 'Where can I exchange foreign currency in McLeod Ganj?',
        answer:
          "Authorised money changers operate in McLeod Ganj's main market, and some banks in Dharamshala handle foreign exchange, though rates and opening hours vary. Bring your passport, as it is needed for exchange. Withdrawing rupees from a bank ATM with an international card is often simpler, but check your bank's foreign transaction fees and keep a backup card. Avoid unofficial street exchanges.",
        link: { href: '/blog/atm-mobile-network-internet-dharamshala', label: 'Money and ATMs guide' },
      },
      {
        question: 'Do I need to tip in Dharamshala?',
        answer:
          "Tipping is appreciated but not compulsory. In cafes and restaurants, around 5-10 percent is common if no service charge has been added, and rounding up is fine at small eateries. For trek guides and porters, a tip of a few hundred rupees per day is a kind gesture if they did a good job. Taxi drivers on day tours also appreciate a small tip. Hotel staff who carry bags up steep steps deserve a little extra.",
        link: { href: '/blog/first-time-visitor-tips-mistakes', label: 'First-time visitor tips' },
      },
      {
        question: 'How much is a taxi between McLeod Ganj, Bhagsu, Dharamkot and Naddi?',
        answer:
          "Short local hops between McLeod Ganj, Bhagsu, Dharamkot and Naddi typically cost a few hundred rupees, roughly ₹200-500 depending on distance, season and time of day (approx., as of 2026). Taxi unions set fixed point-to-point fares rather than using meters, and rates are usually displayed at taxi stands. Confirm the fare before getting in, and expect higher prices late at night or during peak holiday weeks.",
        link: { href: '/taxi', label: 'Local taxi fares' },
      },
      {
        question: 'How much does a full-day sightseeing taxi in Dharamshala cost?',
        answer:
          "A half-day local sightseeing tour in a sedan costs roughly ₹1,800-2,500, and a full-day Kangra Valley tour in an SUV costs about ₹3,500-4,500 (approx., as of 2026). Fares depend on the vehicle, distance and season. Entry tickets, parking and meals are usually extra. Agree the exact list of stops and the finishing time in advance, since extra stops or long waits may be charged.",
        link: { href: '/taxi', label: 'Sightseeing taxi packages' },
      },
      {
        question: 'Is bargaining normal in McLeod Ganj?',
        answer:
          "Yes, polite bargaining is normal at street stalls and handicraft shops in McLeod Ganj, where first prices can be well above what sellers expect. Settling 10-30 percent lower is common, but keep it friendly and walk away if the price does not suit you. Do not bargain at fixed-price shops, cafes, Norbulingka or cooperatives. Taxi fares are fixed by unions, and room rates are best negotiated for long stays or in the off season.",
        link: { href: '/blog/shopping-in-mcleod-ganj', label: 'Shopping in McLeod Ganj' },
      },
      {
        question: 'How much does the Triund trek cost in total?',
        answer:
          "Done independently as a day hike, Triund can cost under ₹1,000 per person: the ₹100 Forest Department entry fee, a taxi to Gallu Devi or Dharamkot, and snacks from trail stalls, which get pricier as you climb. Overnight, add about ₹550 for a two-person tent fee, or book a guided package from about ₹1,500 per person including tent, meals and permits. Prices are approximate as of 2026.",
        link: { href: '/treks/triund-trek', label: 'Guided Triund trek' },
      },
      {
        question: 'How much does food cost per day in McLeod Ganj?',
        answer:
          "Budget travellers can eat well for about ₹500-800 a day on momos, thukpa and thalis, while mid-range cafe meals bring daily food costs to roughly ₹1,200-2,000 per person (approx., as of 2026). A plate of momos usually costs ₹100-200, a main course at a popular cafe ₹250-500, and coffee ₹100-250. Prices rise at viewpoint cafes and on trails, where supplies are carried up by hand or mule.",
        link: { href: '/blog/dharamshala-trip-cost-budget', label: 'Trip cost breakdown' },
      },
      {
        question: 'Do hotels in Dharamshala add GST to room rates?',
        answer:
          "Usually, yes. Under the GST revision that took effect in September 2025, rooms up to ₹7,500 per night attract 5 percent GST and rooms above that 18 percent, while very cheap rooms around ₹1,000 or less are generally exempt. Some quotes include tax and some do not, so ask whether the rate is inclusive. Always ask for a proper invoice if you need one for work.",
        link: { href: '/hotels', label: 'Compare hotel rates' },
      },
      {
        question: 'How much does a local bus cost in Dharamshala?',
        answer:
          "Local HRTC and private buses are very cheap, usually a few tens of rupees for short hops such as lower Dharamshala to McLeod Ganj (approx., as of 2026). Buses also run to Kangra, Palampur, Chamunda and Pathankot at low fares. They are crowded at peak times and stop running fairly early in the evening, so check the last bus before relying on one. Keep small change, as conductors may not accept UPI.",
        link: { href: '/blog/local-transport-dharamshala', label: 'Local transport guide' },
      },
      {
        question: 'Is Dharamshala cheaper than Shimla or Manali?',
        answer:
          "Generally Dharamshala is a little cheaper than Shimla and Manali for comparable rooms and food, especially in Bhagsu and Dharamkot, where guesthouses and long-stay rates are plentiful. Premium properties in Naddi and McLeod Ganj can be just as expensive, and peak weekends push prices up everywhere. Travelling in March, early November, monsoon or January to February usually gives the best value.",
        link: { href: '/blog/dharamshala-trip-cost-budget', label: 'Budget guide' },
      },
      {
        question: 'Should I carry cash on treks near Dharamshala?',
        answer:
          "Yes, carry enough cash for treks. The Triund entry fee, trailside tea stalls, camping fees and porter tips are mostly paid in cash, and mobile signal for UPI is unreliable on the trails. Small notes help, because stall owners often lack change. There are no ATMs beyond McLeod Ganj and Dharamkot, so withdraw what you need before setting off, especially for multi-day treks such as Kareri Lake.",
        link: { href: '/treks', label: 'Treks near Dharamshala' },
      },
    ],
  },
  {
    id: 'food-drink',
    title: 'Food & Drink',
    faqs: [
      {
        question: 'Is it easy to find vegetarian food in Dharamshala?',
        answer:
          "Yes, vegetarian food is very easy to find. Almost every cafe and restaurant in McLeod Ganj, Bhagsu and Dharamkot has a strong vegetarian menu, including veg momos, thukpa, thalis, pasta and salads, and many places are fully vegetarian. Himachali dham is traditionally vegetarian too. If you want pure-veg kitchens that do not cook meat or eggs at all, ask, as most Tibetan restaurants serve both.",
        link: { href: '/blog/tibetan-food-mcleod-ganj', label: 'Tibetan food guide' },
      },
      {
        question: 'Can I get Jain food in Dharamshala?',
        answer:
          "Jain food is available but needs asking. Some Indian restaurants and hotel kitchens in lower Dharamshala and McLeod Ganj will prepare dishes without onion, garlic or root vegetables on request, and larger hotels can usually arrange Jain meals if told in advance. Tibetan dishes such as momos and thukpa normally contain onion and garlic, so they are not suitable. Mention Jain requirements when you book your hotel.",
        link: { href: '/hotels', label: 'Find a hotel with a kitchen' },
      },
      {
        question: 'Are there vegan options in McLeod Ganj?',
        answer:
          "Yes, McLeod Ganj is one of the easier places in the Himalaya to eat vegan. Many cafes list vegan dishes, plant milks and tofu, and several Tibetan dishes such as vegetable momos, thenthuk and laphing are naturally vegan when made without butter, ghee or egg. Ask staff to confirm, as dough and sauces sometimes include dairy or egg. Indian thalis often contain ghee or paneer, so check there too.",
        link: { href: '/blog/top-cafes-in-mcleod-ganj', label: 'Top cafes in McLeod Ganj' },
      },
      {
        question: 'Is tap water safe to drink in Dharamshala?',
        answer:
          "No, do not drink tap water untreated in Dharamshala or McLeod Ganj. Use filtered or boiled water, and refill a reusable bottle at cafes, hotels and refill stations rather than buying plastic bottles, which helps reduce litter in the hills. Avoid stream water on treks unless you filter or purify it. In monsoon, take extra care with water and raw salads, as contamination risk rises.",
        link: { href: '/blog/health-medical-help-dharamshala', label: 'Health tips' },
      },
      {
        question: 'Is street food in McLeod Ganj safe to eat?',
        answer:
          "Generally yes, if you choose busy stalls with fast turnover. McLeod Ganj's street favourites include momos, laphing, tingmo, roasted corn and Tibetan bread. Pick food that is freshly cooked and hot, avoid items that have been sitting out for hours, and be careful with raw chutneys and cut fruit if you have a sensitive stomach. Carry hand sanitiser, and go easy on your first day.",
        link: { href: '/blog/tibetan-food-mcleod-ganj', label: 'What to eat in McLeod Ganj' },
      },
      {
        question: 'What is laphing, and where can I try it?',
        answer:
          "Laphing is a cold, spicy Tibetan noodle dish made from mung bean or wheat starch, rolled or sliced and served with chilli oil, garlic, soy and vinegar. It is a popular street snack in McLeod Ganj, sold at small stalls and Tibetan eateries around the main square and Temple Road, usually for well under ₹100 a plate. It can be very hot, so ask for less chilli if needed.",
        link: { href: '/blog/tibetan-food-mcleod-ganj', label: 'Tibetan food guide' },
      },
      {
        question: 'What is Himachali dham, and where can I eat it?',
        answer:
          "Dham is a traditional Himachali feast served at weddings and festivals, cooked by hereditary cooks called botis and eaten from leaf plates. The Kangri version usually includes rice, madra (chickpeas or beans in yoghurt gravy), maash dal, khatta and a sweet dish. It is cooked without onion and garlic. Outside celebrations, some local restaurants in Dharamshala and Kangra serve dham, often only at lunchtime or on certain days.",
        link: { href: '/blog/himachali-food-guide', label: 'Himachali food guide' },
      },
      {
        question: 'What time do restaurants and cafes close in McLeod Ganj?',
        answer:
          "Most cafes and restaurants in McLeod Ganj serve until about 9.30-10.30 pm, and kitchens may close earlier in winter and monsoon. Many cafes open around 8-9 am for breakfast. Village cafes in Dharamkot and Bhagsu often close earlier, and some shut for a few weeks in the coldest months. McLeod Ganj is not a late-night town, so plan dinner in good time.",
        link: { href: '/blog/top-cafes-in-mcleod-ganj', label: 'Top cafes in McLeod Ganj' },
      },
      {
        question: 'Is there nightlife in McLeod Ganj?',
        answer:
          "McLeod Ganj has a relaxed evening scene rather than real nightlife. A handful of licensed bars and restaurants serve drinks, some cafes host live music or open-mic nights in season, and Bhagsu has a few livelier spots. Most places wind down by around 10.30-11 pm. Drinking in public is illegal and is policed, and loud parties are frowned upon near monasteries and residential lanes.",
        link: { href: '/blog/nightlife-bars-mcleod-ganj', label: 'Nightlife and bars' },
      },
      {
        question: 'Are there dry days in Dharamshala?',
        answer:
          "Yes, liquor sales are banned on national dry days such as Republic Day (26 January), Independence Day (15 August) and Gandhi Jayanti (2 October), and during polling periods for elections. The state government can declare additional dry days, for example around counting days or local events. On these days liquor shops and bars close, though hotels may serve food as normal. Check locally if your trip coincides with an election or holiday.",
        link: { href: '/blog/rules-permits-dos-donts-dharamshala', label: 'Local rules explained' },
      },
      {
        question: 'Is Tibetan food spicy?',
        answer:
          "Not usually. Tibetan dishes such as momos, thukpa and thenthuk are mild in themselves, and the heat comes from the chilli sauce served on the side, so you control the spice. Laphing and some chilli dishes are the exceptions and can be very hot. Indian food in Dharamshala is moderately spiced, and most cafes will make dishes milder on request, which is helpful for children.",
        link: { href: '/blog/tibetan-food-mcleod-ganj', label: 'Tibetan food guide' },
      },
      {
        question: 'What should I drink in Dharamshala besides coffee?',
        answer:
          "Try Kangra tea, grown around Palampur and Dharamshala, which comes as delicate green and black teas, and Tibetan butter tea, salty and rich, served in Tibetan eateries and sometimes at ceremonies. Sweet milky Indian chai is sold everywhere, including trail stalls on the way to Triund. Fresh seasonal juices and lassi are common in cafes. Buy loose Kangra tea from factories or reputable shops rather than tourist stalls.",
        link: { href: '/blog/palampur-travel-guide', label: 'Kangra tea and Palampur' },
      },
    ],
  },
  {
    id: 'families-kids-seniors',
    title: 'Families, Kids, Seniors & Accessibility',
    faqs: [
      {
        question: 'Can children do the Triund trek?',
        answer:
          "Yes, active children of around 8 or older often complete Triund, especially with an early start and plenty of breaks. The final stretch after Magic View Cafe is steep and rocky, so younger kids may need to be carried or turned back. Avoid wet or snowy conditions, carry snacks and warm layers, and keep children away from ridge edges. A local guide makes the day easier for families.",
        link: { href: '/treks/triund-trek', label: 'Family-friendly guided Triund' },
      },
      {
        question: 'What are the best things to do in Dharamshala with kids?',
        answer:
          "Kids usually enjoy Bhagsu waterfall, spinning prayer wheels at the Tsuglagkhang Complex, the Norbulingka gardens and workshops, Dal Lake and Naddi, the HPCA Stadium and the ramparts of Kangra Fort. A momo-making class is a fun rainy-day option. Older children may enjoy short hikes to Gallu Devi or Triund, and teenagers often love tandem paragliding at Bir. Keep days short, as hill roads tire children quickly.",
        link: { href: '/blog/dharamshala-with-kids-family-guide', label: 'Dharamshala with kids' },
      },
      {
        question: 'Is McLeod Ganj suitable for strollers and wheelchairs?',
        answer:
          "Not very. McLeod Ganj's lanes are steep, narrow and crowded, with broken pavements, steps and no proper footpaths in many places, so a baby carrier works better than a stroller. Wheelchair users will find lower Dharamshala, Norbulingka and parts of the Tsuglagkhang Complex more manageable than Bhagsu or Dharamkot. Choose a hotel with road access, a lift or ground-floor rooms, and use taxis for short distances.",
        link: { href: '/blog/dharamshala-for-senior-citizens', label: 'Dharamshala for seniors' },
      },
      {
        question: 'Is Dharamshala good for senior citizens?',
        answer:
          "Yes, with some planning. Lower Dharamshala and central McLeod Ganj suit seniors best because taxis can reach most hotels. Gentle highlights include the Tsuglagkhang Complex, Norbulingka, St. John in the Wilderness, the War Memorial, Chamunda Devi and Kangra Fort, though the fort involves slopes and steps. Avoid peak-season traffic, take breaks on steep lanes and carry regular medicines, as the altitude here is moderate and usually well tolerated.",
        link: { href: '/blog/dharamshala-for-senior-citizens', label: 'Guide for senior citizens' },
      },
      {
        question: 'Which hospitals are near Dharamshala and McLeod Ganj?',
        answer:
          "Lower Dharamshala has the government Zonal Hospital, and Delek Hospital, run by the Tibetan community, is between Dharamshala and McLeod Ganj. For serious emergencies, Dr. Rajendra Prasad Government Medical College at Tanda, near Kangra, is the main referral hospital, roughly 30-40 minutes away. Pharmacies are available in McLeod Ganj and Kotwali Bazaar. Dial 112 or 108 for an ambulance.",
        link: { href: '/blog/health-medical-help-dharamshala', label: 'Medical help in Dharamshala' },
      },
      {
        question: 'Is Dharamshala safe for babies and toddlers?',
        answer:
          "Yes, Dharamshala is fine for babies and toddlers if you plan for the cold and the hills. Pack warm clothes, a carrier rather than a pram, and any specific formula or medicines, though basic baby supplies are available in Kotwali Bazaar and McLeod Ganj. Use filtered water, keep windows closed against monkeys, and choose a hotel with heating in winter and road access for taxis.",
        link: { href: '/blog/dharamshala-with-kids-family-guide', label: 'Family travel guide' },
      },
      {
        question: 'Can children and older adults go paragliding at Bir Billing?',
        answer:
          "Often yes, but it is up to the operator and pilot. Tandem operators typically accept children with parental consent and healthy adults within weight limits, and may decline people with heart, back or joint conditions or very young children. Seniors should consult a doctor first. The landing can involve running a few steps. Always fly with a registered operator and ask about age and weight rules before booking.",
        link: { href: '/paragliding', label: 'Paragliding packages' },
      },
      {
        question: 'How do I avoid motion sickness on the hill roads to Dharamshala?',
        answer:
          "Sit in the front seat or near the front of a bus, look at the horizon, and avoid reading or screens on winding stretches. Eat light before travel, keep the window slightly open, and ask the driver for short breaks. Ginger, lemon or a motion-sickness tablet recommended by your doctor can help. The roads to McLeod Ganj, Naddi and Dalhousie have the most hairpin bends.",
        link: { href: '/taxi', label: 'Book a comfortable taxi' },
      },
      {
        question: 'Can I travel to Dharamshala with my dog?',
        answer:
          "Yes, Dharamshala is fairly pet-friendly, but only a minority of hotels accept pets, so confirm in writing before booking. Driving is easiest, since taking pets on small regional flights and buses is restricted. Keep your dog on a leash, because stray dogs, monkeys and leopards in the forest edges can be a risk, and carry vaccination records. Pets are not allowed inside temples and monasteries.",
        link: { href: '/blog/travelling-with-pets-dharamshala', label: 'Travelling with pets' },
      },
      {
        question: 'When is the best time for a family holiday in Dharamshala?',
        answer:
          "March to April and October to November are the best times for families, with pleasant weather and fewer crowds. May and June school holidays bring heavy traffic and higher prices in McLeod Ganj, so book early and stay somewhere with easy road access. Winter suits families who want a chance of snow and can handle the cold, while monsoon is best avoided with young children.",
        link: { href: '/blog/best-time-to-visit-dharamshala', label: 'Best time to visit' },
      },
      {
        question: 'Which kind of hotel suits elderly travellers in Dharamshala?',
        answer:
          "Look for a hotel with direct road access, parking, a lift or ground-floor rooms, good heating and a restaurant on site, so evenings do not involve steep walks. Lower Dharamshala and the main road in McLeod Ganj are the easiest areas. Avoid properties reached by long flights of steps in Bhagsu, Dharamkot or Naddi. Ask the hotel how far the car can come before you book.",
        link: { href: '/hotels', label: 'Hotels with road access' },
      },
    ],
  },
  {
    id: 'month-by-month',
    title: 'Month by Month',
    faqs: [
      {
        question: 'Is Dharamshala good to visit in January?',
        answer:
          "Yes, if you like cold, clear weather and quiet streets. January is the coldest month, with days around 16°C in lower Dharamshala and nights near freezing in McLeod Ganj (approx.). It has the best odds of snow in McLeod Ganj, Naddi and Dharamkot, though snow is not guaranteed. Hotel rates are low after the New Year rush. Triund is often snowbound, and some cafes close for a few weeks.",
        link: { href: '/blog/dharamshala-in-winter-snowfall', label: 'Dharamshala in winter' },
      },
      {
        question: 'Is Dharamshala good to visit in February?',
        answer:
          "Yes, February is cold but increasingly sunny, with days around 18°C in Dharamshala and 13-15°C in McLeod Ganj (approx.). Snow is still possible early in the month and often lingers at Triund. Losar, the Tibetan New Year, frequently falls in February or early March and brings ceremonies to McLeod Ganj. Crowds are thin and rooms are good value. Pack warm layers for chilly nights.",
        link: { href: '/blog/losar-tibetan-festivals-guide', label: 'Losar and Tibetan festivals' },
      },
      {
        question: 'Is Dharamshala good to visit in March?',
        answer:
          "Yes, March is one of the best value months. Days warm to around 22°C in Dharamshala and 17-19°C in McLeod Ganj (approx.), rhododendrons start to bloom and crowds are still light. Triund may still have snow near the top early in the month. Paragliding at Bir is in season. Tibetan Uprising Day on 10 March is marked with a commemoration in McLeod Ganj. Occasional rain and hail are possible.",
        link: { href: '/blog/best-time-to-visit-dharamshala', label: 'Best time to visit' },
      },
      {
        question: 'Is Dharamshala good to visit in April?',
        answer:
          "Yes, April is excellent, with pleasant days around 27°C in Dharamshala and the low 20s in McLeod Ganj (approx.), cool evenings and generally clear views. Triund and most day hikes are in good condition, and spring is a lovely time for Palampur's tea gardens. Crowds and hotel prices begin climbing in the second half of the month. Afternoon thunderstorms can occur, so start hikes early.",
        link: { href: '/treks/triund-trek', label: 'Triund in spring' },
      },
      {
        question: 'Is Dharamshala good to visit in May?',
        answer:
          "Yes, May is a popular escape from the plains heat, with days around 30°C in lower Dharamshala and 25-27°C in McLeod Ganj (approx.). It is peak season, so expect traffic jams, crowded viewpoints and higher hotel rates, especially on weekends. Treks, including Kareri Lake, are in good shape, and paragliding continues. Book rooms two to three weeks ahead and visit popular sights early in the day.",
        link: { href: '/blog/dharamshala-in-summer', label: 'Dharamshala in summer' },
      },
      {
        question: 'Is Dharamshala good to visit in June?',
        answer:
          "June starts warm and busy and ends wet. The first half is peak holiday season, with days around 31°C in Dharamshala and the mid-20s in McLeod Ganj (approx.). Pre-monsoon showers usually increase in the second half, and the monsoon typically arrives in late June. Treks are fine early in the month. Saga Dawa may fall in May or June. Book early and keep later-June plans flexible.",
        link: { href: '/blog/dharamshala-in-summer', label: 'Summer travel guide' },
      },
      {
        question: 'Is Dharamshala good to visit in July?',
        answer:
          "Only if you are comfortable with heavy rain. July is one of the wettest months, with frequent downpours, cloud hiding the mountains, slippery trails and landslide risk on roads. Paragliding at Bir stops from about 15 July. On the plus side, hotels are cheaper, waterfalls are at their best and the hills are very green. The Dalai Lama's birthday on 6 July is celebrated in McLeod Ganj.",
        link: { href: '/blog/dharamshala-monsoon-travel-guide', label: 'Monsoon travel guide' },
      },
      {
        question: 'Is Dharamshala good to visit in August?',
        answer:
          "August is peak monsoon and the most challenging month for travel. Rainfall is very heavy, roads can be blocked by landslides, flights at Gaggal may be delayed by cloud, and treks such as Triund and Kareri are best avoided. If you go, base yourself somewhere with easy road access, plan indoor activities like monasteries, museums and cafes, keep buffer days and choose refundable bookings.",
        link: { href: '/blog/dharamshala-monsoon-travel-guide', label: 'Monsoon travel tips' },
      },
      {
        question: 'Is Dharamshala good to visit in September?',
        answer:
          "Late September is good, early September less so. The first half is often still rainy, while the monsoon usually retreats in the second half, leaving fresh green hills and clearing skies. Days are around 27°C in Dharamshala and the low 20s in McLeod Ganj (approx.). Paragliding at Bir typically resumes from about 15 September, and treks reopen as trails dry. Crowds are light and prices moderate.",
        link: { href: '/blog/best-time-to-visit-dharamshala', label: 'Month-by-month guide' },
      },
      {
        question: 'Is Dharamshala good to visit in October?',
        answer:
          "Yes, October is one of the best months of the year. Skies are clear after the monsoon, days are around 25°C in Dharamshala and 20-22°C in McLeod Ganj (approx.), and Dhauladhar views are at their sharpest. Treks including Triund, Kareri and Indrahar are in good condition early in the month, and paragliding is in full swing. Navratri and Diwali-season long weekends bring crowds, so book ahead.",
        link: { href: '/hotels', label: 'Book an October stay' },
      },
      {
        question: 'Is Dharamshala good to visit in November?',
        answer:
          "Yes, November is a quiet favourite, with crisp sunny days around 22°C in Dharamshala and the high teens in McLeod Ganj (approx.), cold nights and the clearest air of the year. Crowds thin after Diwali and hotel rates often drop. Triund is excellent but chilly overnight, and higher routes such as Indrahar are usually closing for winter. The Dharamshala International Film Festival has typically been held in autumn.",
        link: { href: '/blog/festivals-events-calendar-dharamshala', label: 'Festivals and events calendar' },
      },
      {
        question: 'Is Dharamshala good to visit in December?',
        answer:
          "Yes, December is mostly dry and sunny, with days around 18°C in Dharamshala and nights close to freezing in McLeod Ganj (approx.). Snow coats the Dhauladhar peaks, but snow in town is uncommon before late December. The first half is quiet and cheap, while the Christmas to New Year week, roughly 24 December to 2 January, brings crowds and price spikes, so book early for that period.",
        link: { href: '/blog/dharamshala-christmas-new-year', label: 'Christmas and New Year in Dharamshala' },
      },
    ],
  },
  {
    id: 'treks-detail',
    title: 'Trekking in Detail',
    faqs: [
      {
        question: 'How many days does the Indrahar Pass trek take?',
        answer:
          "Most groups take 3-4 days for the Indrahar Pass trek from McLeod Ganj or Dharamkot, usually camping at Triund and then near Lahesh Cave before a long summit day to the pass at about 4,300 m. Some return the same way, while others cross into the Chamba side and descend through Gaddi villages, adding a day or two. It is a demanding, guided trek, usually attempted from around June to October.",
        link: { href: '/blog/indrahar-pass-trek-guide', label: 'Indrahar Pass trek guide' },
      },
      {
        question: 'Is Laka Glacier the same as Snowline?',
        answer:
          "Not quite, but they are on the same route. Snowline is the point above Triund, roughly 2-2.5 km on, where there is usually a seasonal cafe and snow lingers for much of the year. Laka Got and the Laka Glacier area lie a little higher, towards Lahesh Cave on the Indrahar route. The terrain gets rocky and exposed beyond Triund, so go with a guide and turn back in bad weather.",
        link: { href: '/blog/snowline-laka-glacier-trek', label: 'Snowline and Laka Glacier trek' },
      },
      {
        question: 'How do I trek to Guna Devi temple?',
        answer:
          "Guna Devi (Guna Mata) temple sits on a forested ridge above Dharamkot and is a quieter alternative to Triund. The trail climbs steeply through oak and rhododendron forest, and most hikers take roughly 3-5 hours up, depending on fitness and starting point. Paths are less marked than on Triund, so go with a local guide or someone who knows the route, start early and carry water.",
        link: { href: '/blog/easy-hikes-near-mcleod-ganj', label: 'Hikes near McLeod Ganj' },
      },
      {
        question: 'What is the Thatharana trek?',
        answer:
          "Thatharana is a lesser-known ridge and meadow trek in the Dhauladhar foothills east of Dharamshala, usually approached from the Khaniyara side. It offers big Dhauladhar and Kangra Valley views with far fewer people than Triund, and is typically done as a 2-3 day guided trek with camping. Trails are not well marked and water sources are limited, so hire a local guide and check conditions before going.",
        link: { href: '/treks', label: 'Treks near Dharamshala' },
      },
      {
        question: 'Can I trek solo near Dharamshala?',
        answer:
          "Yes, on busy trails such as Triund, Gallu Devi and the Bhagsu waterfall paths, many people hike solo in daylight. Beyond Triund, and on Kareri, Indrahar, Guna Devi or Thatharana, trekking alone is not advisable, because routes are less marked, weather turns quickly and help is far away. Always tell someone your route and return time, and start early so you are back before dark.",
        link: { href: '/blog/solo-female-travel-dharamshala', label: 'Solo travel safety' },
      },
      {
        question: 'Do I need a guide for the Triund trek?',
        answer:
          "No, a guide is not essential for Triund in good weather, as the trail from Gallu Devi is well used and easy to follow. A guide is worthwhile in winter, fog or snow, for first-time trekkers, families and anyone camping overnight, and is strongly recommended for anything beyond Triund. Registered guides also handle permits, tents and food, which makes an overnight trip much simpler.",
        link: { href: '/treks/triund-trek', label: 'Book a Triund guide' },
      },
      {
        question: 'How much does a trekking guide cost in Dharamshala?',
        answer:
          "Local guides for day hikes such as Triund typically charge roughly ₹1,500-3,000 per day for a small group, while multi-day treks such as Kareri or Indrahar are usually sold as packages including guide, porters, tents and meals (approx., as of 2026). Prices depend on group size, season and route. Choose registered guides or operators, and confirm what is included before you pay.",
        link: { href: '/treks', label: 'Guided treks and prices' },
      },
      {
        question: 'What happens if I get injured on a trek near Dharamshala?',
        answer:
          "Call 112 if you have a signal, give your exact location and stay put with your group. Rescues in the Dhauladhar are usually carried out on foot by police, local volunteers and guides, which can take many hours, and helicopter evacuation is rare. Carry a basic first-aid kit, a headlamp and warm layers, trek with a guide on remote routes, and buy travel insurance that covers trekking.",
        link: { href: '/blog/health-medical-help-dharamshala', label: 'Health and medical help' },
      },
      {
        question: 'Is there mobile signal on the Kareri Lake and Indrahar treks?',
        answer:
          "Signal is weak or absent for much of both treks. On the Kareri route you may get some coverage near Kareri village, but it usually fades as you go up the valley. On the Indrahar route, signal is patchy around Triund and unreliable beyond. Download offline maps, share your plan with someone before you set off, and carry a power bank. Your guide will know the few spots where calls get through.",
        link: { href: '/blog/kareri-lake-trek-guide', label: 'Kareri Lake trek guide' },
      },
      {
        question: 'Why do dogs follow trekkers to Triund?',
        answer:
          "Several friendly local dogs regularly walk with hikers on the Triund trail, sometimes all the way to the top and back, mostly hoping for food and company. They are generally harmless, but do not feed them sugary snacks, and keep food sealed at camp. Dogs can become territorial at night, so do not leave food outside tents. If you are nervous of dogs, walk with a group.",
        link: { href: '/blog/triund-camping-guide', label: 'Triund camping guide' },
      },
      {
        question: 'What are some easy short hikes near McLeod Ganj?',
        answer:
          "Good easy hikes include Bhagsu village to Bhagsu waterfall and on to the Shiva Cafe above it, McLeod Ganj to Dharamkot and Gallu Devi, the forest walk around Dal Lake and up to Naddi, and the shaded road walk down to St. John in the Wilderness. Most take one to three hours. They suit families, acclimatising travellers and anyone short on time.",
        link: { href: '/blog/easy-hikes-near-mcleod-ganj', label: 'Easy hikes near McLeod Ganj' },
      },
      {
        question: 'Can I trek from Bir Billing to Rajgundha?',
        answer:
          "Yes, a trail leads from the Billing take-off area through forest and meadows to Rajgundha, a remote village on the Barot Valley side. It is usually done over 1-2 days with an overnight stay in a homestay or camp, and some trekkers continue towards Barot. The route is long and can be muddy or snowbound, so go in May-June or September-November with a local guide.",
        link: { href: '/blog/bir-billing-rajgundha-trek', label: 'Bir Billing to Rajgundha trek' },
      },
      {
        question: 'Can I rent trekking gear in McLeod Ganj?',
        answer:
          "Yes, several shops in McLeod Ganj and Dharamkot rent tents, sleeping bags, jackets, trekking poles and microspikes by the day, and also sell basic gear. Check zips, tent poles and the temperature rating of sleeping bags before you pay, and expect to leave a deposit or ID. Good shoes are best brought from home, as rental footwear is limited and often poorly fitting.",
        link: { href: '/blog/triund-camping-guide', label: 'Triund camping guide' },
      },
      {
        question: 'Does Kareri Lake freeze in winter?',
        answer:
          "Yes, Kareri Lake usually freezes or is covered in snow from roughly December to March, and the upper trail is often snowbound. Winter trips are possible only for experienced trekkers with a guide and proper gear, and some years access is impractical. For a classic blue-water view, go from May to June or late September to November, when the trail is clear and the lake is open.",
        link: { href: '/treks/kareri-lake-trek', label: 'Kareri Lake trek package' },
      },
    ],
  },
];
