// Extra Q&A set 2 for the /faq page (Buddhism, transport detail, nearby trips,
// shopping & culture, stays in detail, nature & weather safety).
// Written October 2026. Re-verify each season: teaching registration rules, Tibet Museum
// and Tushita timings, ropeway status, bus timings, rental and homestay rules.
import type { FAQCategory } from './faqs';

export const faqsExtra2: FAQCategory[] = [
  {
    id: 'buddhism-dalai-lama',
    title: 'Buddhism, Monasteries & the Dalai Lama',
    faqs: [
      {
        question: 'How do I register for a Dalai Lama teaching in McLeod Ganj?',
        answer:
          "Registration is required for teachings in Dharamshala and normally opens a few days before the event, closing the day before the first session. According to the official Dalai Lama website, it runs from 9 am to 1 pm and 2 pm to 5 pm at the Tsuglagkhang (main temple) courtyard, with a nominal fee of about ₹10. Foreigners need copies of their passport, Indian visa and C-form, and Indian residents a copy of their Aadhaar card. Bring a passport-size photo in case it is asked for.",
        link: { href: '/blog/dalai-lama-temple-guide', label: 'Dalai Lama Temple guide' },
      },
      {
        question: 'How do I know if the Dalai Lama is in McLeod Ganj during my visit?',
        answer:
          "Check the official schedule at dalailama.com, which lists his public teachings and events, usually only a few weeks or months ahead. His Holiness lives in McLeod Ganj but has in recent years spent long periods elsewhere, for example in Ladakh in summer or South India in winter, and his public engagements have become fewer with age. If nothing is listed for your dates, assume you will not see him, and treat any sighting as a bonus.",
        link: { href: '/destinations/mcleod-ganj', label: 'McLeod Ganj guide' },
      },
      {
        question: 'What can I take into a Dalai Lama teaching?',
        answer:
          "Security at teachings is strict, so carry as little as possible. Phones, cameras, bags, lighters and sharp items are usually not allowed inside, though rules can vary by event, so check at registration and leave valuables at your hotel. People typically bring a cushion or folding mat, a cup for the tea that is served, a small FM radio with earphones for translation, and warm layers. Arrive early, as seats in the courtyard fill fast.",
        link: { href: '/blog/tibetan-culture-etiquette-guide', label: 'Tibetan etiquette guide' },
      },
      {
        question: 'Are Dalai Lama teachings translated into English?',
        answer:
          "Yes, teachings at the Tsuglagkhang are given in Tibetan and have usually been translated live into English and several other languages over FM radio, so bring a small FM radio and earphones. Frequencies are normally posted around the temple or announced at registration. Some events are also streamed live on the official website, which is a good option if you cannot get a seat.",
        link: { href: '/blog/dalai-lama-temple-guide', label: 'Attending a teaching' },
      },
      {
        question: 'Can I see where the Dalai Lama lives?',
        answer:
          "Not up close. His residence and private office are inside the Tsuglagkhang Complex at the bottom of Temple Road, but that part is closed to the public and heavily guarded. You can visit the main temple, Namgyal Monastery and the courtyard, and walk the Lingkor kora path, which circles the whole complex through the forest. Prayer flags, chortens and prayer wheels line the route, and it takes about 30-45 minutes.",
        link: { href: '/blog/dalai-lama-temple-guide', label: 'Inside the Tsuglagkhang' },
      },
      {
        question: 'What is the Lingkor kora walk in McLeod Ganj?',
        answer:
          "The Lingkor is a circular pilgrim path around the Dalai Lama's residence and the Tsuglagkhang Complex. It starts near the temple gate, runs downhill through forest with prayer flags, mani stones and a small chorten, then climbs back to Temple Road. Walk it clockwise, as Tibetans do, ideally early morning when elderly locals spin prayer wheels and recite mantras. It takes roughly 30-45 minutes, with some steps and uneven ground.",
        link: { href: '/blog/easy-hikes-near-mcleod-ganj', label: 'Easy walks near McLeod Ganj' },
      },
      {
        question: 'Where is the Tibet Museum, and when is it open?',
        answer:
          "According to the museum's official website, the Tibet Museum is on the second floor of the T-Building at the Central Tibetan Administration in Gangchen Kyishong, between lower Dharamshala and McLeod Ganj, rather than in the old space at the temple entrance. It lists hours of 9 am to 5 pm with a lunch break from 1 to 2 pm, and closure on Saturdays and government holidays. Exhibits cover Tibetan history, the 1959 exile and life in exile. Check timings locally before going.",
        link: { href: '/blog/places-to-visit-in-dharamshala', label: 'Places to visit' },
      },
      {
        question: 'What is the Library of Tibetan Works and Archives?',
        answer:
          "The Library of Tibetan Works and Archives (LTWA), founded in 1970 at Gangchen Kyishong, holds one of the world's most important collections of Tibetan manuscripts, books and thangkas. Visitors can see its small museum floor of old artefacts and statues, and the library has run Buddhist philosophy and Tibetan language classes that outsiders can join. Class schedules change by term, so check at the library office. It is a quiet, rewarding stop between Dharamshala and McLeod Ganj.",
        link: { href: '/blog/things-to-do-in-mcleod-ganj', label: 'Things to do in McLeod Ganj' },
      },
      {
        question: 'Where can I watch monks debating in McLeod Ganj?',
        answer:
          "Monks of Namgyal Monastery often debate in the Tsuglagkhang courtyard in the afternoon, clapping and stamping to make their points. Debates are tied to the monastic calendar, so they do not happen every day and pause during holidays and teachings. Ask at the temple about the current timing. Watch quietly from the side, do not walk between monks, and ask before taking photos, and do not use flash.",
        link: { href: '/blog/tibetan-culture-etiquette-guide', label: 'Monastery etiquette' },
      },
      {
        question: 'What is Nechung Monastery?',
        answer:
          "Nechung Monastery in Gangchen Kyishong is the seat of the Nechung Oracle, the State Oracle traditionally consulted by the Dalai Lama and the Tibetan government. The colourful temple sits just below the Central Tibetan Administration offices and is usually quiet, with fine murals and Dhauladhar views. It combines easily with the Library of Tibetan Works and Archives and the Tibet Museum on a half-day walk. Dress modestly and ask before photographing inside.",
        link: { href: '/destinations/dharamshala', label: 'Dharamshala guide' },
      },
      {
        question: 'Does the Karmapa live at Gyuto Monastery?',
        answer:
          "Not at present. The 17th Karmapa, Ogyen Trinley Dorje, lived for many years at temporary quarters at Gyuto Monastery in Sidhbari and held public audiences there, but he has been abroad since 2017 and, as of the latest reports, has not returned to India. Gyuto itself remains open to visitors and is known for its deep-voiced tantric chanting and wide mountain views, and it pairs well with Norbulingka.",
        link: { href: '/blog/sidhbari-norbulingka-gyuto-guide', label: 'Sidhbari, Norbulingka and Gyuto' },
      },
      {
        question: 'Which other monasteries and nunneries are worth visiting near Dharamshala?',
        answer:
          "Beyond the Tsuglagkhang, visit Gyuto Monastery and Dolma Ling Nunnery near Sidhbari, Nechung Monastery at Gangchen Kyishong, and the small temples along Jogiwara Road in McLeod Ganj. Further away, Bir has several large monasteries, including Palpung Sherab Ling and Chokling Gompa, about 2-2.5 hours by road. Most welcome respectful visitors in daytime, but halls may close during prayers or lunch, so be flexible.",
        link: { href: '/blog/bir-travel-guide', label: 'Bir travel guide' },
      },
      {
        question: 'Does Tushita Meditation Centre have drop-in sessions?',
        answer:
          "Yes. Tushita, above Dharamkot, lists drop-in guided meditation from Monday to Saturday, 9 to 10 am, on a donation basis, plus Dharma film screenings and access to its library. It also runs 10-day Introduction to Buddhism courses that must be booked online and fill quickly. Its website lists opening hours from February to November and closure on Sundays, which suggests a winter break in December and January, so check before you go.",
        link: { href: '/blog/meditation-yoga-retreats-dharamshala', label: 'Meditation and yoga retreats' },
      },
      {
        question: 'Is the Vipassana course at Dhamma Sikhara free?',
        answer:
          "Yes, courses at Dhamma Sikhara, the Vipassana centre near Dharamkot, run purely on donations from past students, so there is no fee. The main offering is a 10-day silent residential course with strict rules: no phones, no talking, no leaving early and a long daily meditation schedule. You must apply online through the dhamma.org schedule, and processing can take up to two weeks, so apply well before your trip.",
        link: { href: '/blog/meditation-yoga-retreats-dharamshala', label: 'Meditation courses guide' },
      },
    ],
  },
  {
    id: 'transport-detail',
    title: 'Getting Around in Detail',
    faqs: [
      {
        question: 'What time do Volvo buses leave Delhi for Dharamshala and McLeod Ganj?',
        answer:
          "Most AC Volvo and Scania buses leave Delhi in the late afternoon and evening and arrive early the next morning, after roughly 10-12 hours. HRTC services, including the Himsuta brand, depart from ISBT Kashmere Gate, and private buses mostly go from Majnu ka Tilla, with many running straight to McLeod Ganj. Exact departure times change by season, so check the HRTC website or app, or a bus booking app, and book a few days ahead for weekends.",
        link: { href: '/blog/delhi-to-dharamshala-by-bus', label: 'Delhi to Dharamshala by bus' },
      },
      {
        question: 'Where do buses to Delhi leave from in McLeod Ganj and Dharamshala?',
        answer:
          "Private overnight buses to Delhi usually leave from McLeod Ganj's bus stand area in the late afternoon or evening, while HRTC Volvo and ordinary buses depart from the main Dharamshala bus stand in the lower town. If you book an HRTC bus, allow 30 minutes to get down from McLeod Ganj in traffic. Confirm the exact boarding point when booking, as private operators sometimes use pick-up spots near their offices.",
        link: { href: '/blog/dharamshala-to-delhi-taxi-guide', label: 'Dharamshala to Delhi options' },
      },
      {
        question: 'How long does it take from Chandigarh to Dharamshala?',
        answer:
          "Chandigarh to Dharamshala is roughly 230-250 km, about 5-6 hours by car or 6-7 hours by bus. HRTC and Punjab state buses run from the ISBT in Sector 43, including some AC services, and taxis take the route via Ropar, Una and Kangra or via Anandpur Sahib. Chandigarh is also handy for flights and trains if Kangra flights are full or expensive.",
        link: { href: '/blog/chandigarh-to-dharamshala', label: 'Chandigarh to Dharamshala' },
      },
      {
        question: 'How do I travel from Dharamshala to Manali by bus?',
        answer:
          "HRTC runs day and overnight buses between Dharamshala and Manali, and some private Volvo operators run the route in season, taking roughly 8-10 hours for about 230-250 km via Palampur, Baijnath, Mandi and Kullu. Buses are cheap but slow, and day buses give good valley views. A private taxi takes 7-8 hours and lets you stop at Bir or Palampur. Book a day ahead in peak months.",
        link: { href: '/blog/himachal-itinerary-delhi-dharamshala-manali', label: 'Dharamshala-Manali itinerary' },
      },
      {
        question: 'Which station should I book: Pathankot Junction, Pathankot Cantt or Chakki Bank?',
        answer:
          "Book whichever your train stops at, since all three are within a few kilometres of each other and roughly 85-90 km from Dharamshala. Many overnight trains from Delhi heading to Jammu stop only at Pathankot Cantt or Chakki Bank, not the main junction. Pathankot Junction is in the town and is also the start of the narrow-gauge Kangra Valley line. Taxis and autos wait at all three, and buses leave from Pathankot bus stand.",
        link: { href: '/taxi', label: 'Pathankot to Dharamshala taxi' },
      },
      {
        question: 'Can I take a bus from Kangra Airport instead of a taxi?',
        answer:
          "Yes, if you travel light. Kangra Airport at Gaggal sits on the main Pathankot-Dharamshala road, and local and HRTC buses heading to Dharamshala pass along the highway near the airport entrance, taking around 30-45 minutes to the Dharamshala bus stand. From there you change for McLeod Ganj. With luggage, late flights or bad weather, a pre-booked taxi is far easier and more reliable.",
        link: { href: '/taxi/gaggal-airport-to-dharamshala-taxi', label: 'Gaggal airport taxi' },
      },
      {
        question: 'Are there local buses to Naddi, Dharamkot and Norbulingka?',
        answer:
          "Local buses do run on some of these routes, but services are infrequent and stop by early evening. Buses link Dharamshala with McLeod Ganj and with Sidhbari, near Norbulingka and Gyuto, through the day, and a few run up to Naddi. Dharamkot has very limited bus access, so most people walk up from McLeod Ganj or take a taxi. Ask at the bus stand for current timings and carry small change.",
        link: { href: '/blog/local-transport-dharamshala', label: 'Local transport guide' },
      },
      {
        question: 'Do Uber and Ola work in Dharamshala?',
        answer:
          "Generally not for local rides. App-based cabs have very limited presence in Dharamshala and McLeod Ganj, and local transport is dominated by taxi union stands with fixed fare charts. Some apps may show outstation bookings to or from cities like Chandigarh or Delhi, but availability is unreliable. For local trips, use a taxi stand, ask your hotel to call a driver, or pre-book a cab.",
        link: { href: '/taxi', label: 'Book a local taxi' },
      },
      {
        question: 'How do taxi unions and fares work in McLeod Ganj?',
        answer:
          "Local taxis operate from union stands in McLeod Ganj, Dharamshala and Bhagsu, and fares are set by the union for fixed routes, often shown on a board at the stand. One-way and return prices differ, and waiting time adds to the bill. There is no meter, so confirm the price before setting off. Unions can object to outside taxis picking up passengers locally, which is why pre-booked cabs often meet guests at hotels.",
        link: { href: '/blog/local-transport-dharamshala', label: 'Taxi fares and tips' },
      },
      {
        question: 'Can I rent a scooter or motorbike in McLeod Ganj?',
        answer:
          "Yes, scooters and motorbikes are rented in McLeod Ganj and lower Dharamshala, usually by the day. You need a valid driving licence for the vehicle type, and foreigners should carry an International Driving Permit. Prefer rental vehicles registered for commercial hire, wear a helmet and inspect the brakes. Roads are steep, narrow and crowded, so it suits experienced riders only, and parking in McLeod Ganj is tight.",
        link: { href: '/blog/rules-permits-dos-donts-dharamshala', label: 'Local rules and permits' },
      },
      {
        question: 'Where can I park in McLeod Ganj?',
        answer:
          "Parking in McLeod Ganj is limited to a few paid parking areas near the bus stand and main square, and spaces fill quickly on weekends and holidays. Temple Road, Jogiwara Road and the market lanes are narrow and often one-way, with no space to stop. If you are driving, choose a hotel with confirmed parking, leave the car there and walk or take local taxis in town.",
        link: { href: '/hotels', label: 'Hotels with parking' },
      },
      {
        question: 'Is it safe to drive at night around Dharamshala?',
        answer:
          "It is best avoided where possible. Hill roads around Dharamshala are narrow, poorly lit in places and busy with trucks and buses, and fog, rain, falling rocks and animals add risk after dark, especially in monsoon and winter. If you drive yourself, give way to uphill traffic, use your horn on blind bends and do not overtake on curves. For late arrivals, a local driver who knows the road is the safer choice.",
        link: { href: '/taxi', label: 'Hire a local driver' },
      },
      {
        question: 'Is the Dharamshala-McLeod Ganj ropeway working now?',
        answer:
          "Check locally before relying on it. The Dharamshala Skyway, which opened in 2022 and normally takes about 5 minutes between lower Dharamshala and McLeod Ganj, was suspended in August 2025 after a landslide near one of its towers and has had safety-related closures since. If it is running, it is a quick way to skip the traffic. If not, local buses and taxis cover the 9 or so km road in 20-30 minutes.",
        link: { href: '/blog/local-transport-dharamshala', label: 'Getting around Dharamshala' },
      },
    ],
  },
  {
    id: 'nearby-trips',
    title: 'Nearby Trips',
    faqs: [
      {
        question: 'How do I get from Dharamshala to Bir by public transport?',
        answer:
          "Take an HRTC or private bus from Dharamshala towards Baijnath or Mandi and get off at Bir Road, near Chowgan, or ride to Baijnath and change. From there, local buses, shared jeeps or taxis cover the last few kilometres into Bir. The journey takes about 3-3.5 hours with the change, against about 2-2.5 hours by taxi. Start early, as connections thin out in the evening.",
        link: { href: '/blog/bir-travel-guide', label: 'Bir travel guide' },
      },
      {
        question: 'How far is Dalhousie from Dharamshala, and is it a good day trip?',
        answer:
          "Dalhousie is roughly 115-125 km from Dharamshala, about 4-5 hours by road via Shahpur and Nurpur. That makes a same-day round trip long and tiring, so most travellers spend at least one night and combine it with Khajjiar. Dalhousie has colonial churches, pine-forest walks and views of the Pir Panjal and Dhauladhar ranges. A private taxi is the most practical option.",
        link: { href: '/blog/dalhousie-khajjiar-from-dharamshala', label: 'Dalhousie and Khajjiar guide' },
      },
      {
        question: 'Is Khajjiar worth visiting from Dharamshala?',
        answer:
          "Yes, if you are already going to Dalhousie. Khajjiar is a large meadow ringed by deodar forest, about 22-24 km from Dalhousie, often nicknamed the Mini Switzerland of India. It suits a relaxed half-day of walking, horse rides and photos, but it gets crowded and commercial on peak weekends. It is too far for a day trip from Dharamshala alone, so plan a night in Dalhousie or Khajjiar.",
        link: { href: '/blog/dalhousie-khajjiar-from-dharamshala', label: 'Plan Dalhousie and Khajjiar' },
      },
      {
        question: 'How do I get to Chamba from Dharamshala, and what is there to see?',
        answer:
          "Chamba is roughly 170-190 km from Dharamshala by road, about 6-7 hours via Dalhousie or Khajjiar, so plan at least two nights. The old town on the Ravi river is known for the stone Lakshmi Narayan temple complex, the Bhuri Singh Museum with Pahari miniature paintings, the Chaugan meadow and embroidered Chamba rumals. Fit trekkers sometimes reach the Chamba side on foot over Indrahar Pass, but that is a serious multi-day route.",
        link: { href: '/blog/dalhousie-khajjiar-from-dharamshala', label: 'Dalhousie, Khajjiar and Chamba' },
      },
      {
        question: 'How far is Barot Valley from Dharamshala?',
        answer:
          "Barot is roughly 130-140 km from Dharamshala, about 4-5 hours by road via Palampur, Baijnath and Joginder Nagar, with a narrow final stretch. It is a quiet valley on the Uhl river known for trout, pine forests and the edge of the Nargu Wildlife Sanctuary, with simple guesthouses and camps. Go for at least one night. Road conditions can be poor after monsoon rains, so check before leaving.",
        link: { href: '/blog/barot-valley-guide', label: 'Barot Valley guide' },
      },
      {
        question: 'When is the best time to visit Pong Dam for birdwatching?',
        answer:
          "November to March is best, when tens of thousands of migratory waterbirds, including bar-headed geese, winter on the Pong Dam reservoir, also called Maharana Pratap Sagar. The wetland is a Ramsar site about 55-65 km from Dharamshala, roughly 1.5-2 hours by road. Go early in the morning with binoculars, and consider a local birding guide. Nagrota Surian and the area around Ransar island are popular viewing spots.",
        link: { href: '/blog/pong-dam-bird-sanctuary-guide', label: 'Pong Dam birding guide' },
      },
      {
        question: 'Can I combine Amritsar with Dharamshala?',
        answer:
          "Yes, it is one of the most popular pairings. Amritsar is about 200-210 km from Dharamshala, roughly 5-6 hours by road via Pathankot, so it works as a separate stop rather than a day trip. Many visitors spend a night in Amritsar for the Golden Temple and the Attari-Wagah border ceremony, then take a morning taxi into the hills. A few direct buses run, or you can change at Pathankot.",
        link: { href: '/blog/how-to-reach-dharamshala', label: 'Routes to Dharamshala' },
      },
      {
        question: 'How far is Shimla from Dharamshala?',
        answer:
          "Shimla is roughly 235-250 km from Dharamshala, a 7-8 hour drive via Hamirpur, Bilaspur or Mandi depending on the route. HRTC runs day and overnight buses between the two. A small regional flight between Kangra and Shimla has operated on some schedules, so check current availability. Shimla fits best at the start or end of a Himachal circuit rather than as a side trip from Dharamshala.",
        link: { href: '/blog/himachal-itinerary-delhi-dharamshala-manali', label: 'Himachal itinerary' },
      },
      {
        question: 'How do I get from Dharamshala to Kasol?',
        answer:
          "Kasol, in the Parvati Valley, is roughly 220-240 km from Dharamshala, about 7-8 hours by road via Palampur, Mandi and Bhuntar. There is no direct bus on most days, so bus travellers usually go to Bhuntar or Mandi and change for a local bus up the valley to Kasol. A taxi is much faster. Combine Kasol with Manali or Manikaran rather than making a round trip from Dharamshala.",
        link: { href: '/blog/himachal-itinerary-delhi-dharamshala-manali', label: '10-day Himachal circuit' },
      },
      {
        question: 'Can I go from Dharamshala to Jibhi and Tirthan Valley?',
        answer:
          "Yes, but plan a full travel day. Jibhi is roughly 200-220 km from Dharamshala, about 6-8 hours via Mandi, the Aut tunnel and Banjar. By bus you would typically change at Mandi or Aut and again at Banjar. Jibhi and the Tirthan Valley offer wooden homestays, waterfalls and walks to Jalori Pass, and suit two to three nights. Upper roads near Jalori can close after snow.",
        link: { href: '/taxi', label: 'Book an intercity taxi' },
      },
      {
        question: 'What is there to see in Nurpur on the way from Pathankot?',
        answer:
          "Nurpur, roughly 65 km from Dharamshala on the Pathankot road, is worth a short stop for its ruined hilltop fort and the Brij Raj Swami temple inside, dedicated to Krishna and Meera. The area was also known for pashmina and shawl weaving. Allow about an hour. It fits easily into a transfer from Pathankot or Amritsar, so ask your driver to stop on the way.",
        link: { href: '/blog/places-to-visit-in-kangra', label: 'Places to visit in Kangra' },
      },
      {
        question: 'Can I visit Palampur by local bus?',
        answer:
          "Yes, buses run frequently between the Dharamshala bus stand and Palampur via Chamunda Devi and Nagrota Bagwan, taking roughly 1.5-2 hours. Once in Palampur, the tea gardens and town centre are walkable, while Andretta, Baijnath and Neugal Khad need local buses, autos or a taxi. Head back by late afternoon, as evening services thin out. The narrow-gauge toy train also stops at Palampur when running.",
        link: { href: '/blog/palampur-travel-guide', label: 'Palampur travel guide' },
      },
      {
        question: 'What is a good multi-day loop around Kangra from Dharamshala?',
        answer:
          "A relaxed five-day loop takes in McLeod Ganj and Dharamkot, then Norbulingka and Chamunda on the way to Palampur, a night or two in Bir for monasteries and paragliding, and a final day for Kangra Fort and Masroor before returning or heading to the airport. Add Barot or Pong Dam if you have extra time. A private taxi for the loop is the most efficient option.",
        link: { href: '/blog/five-day-kangra-valley-itinerary', label: '5-day Kangra Valley itinerary' },
      },
    ],
  },
  {
    id: 'shopping-culture',
    title: 'Shopping, Festivals & Culture',
    faqs: [
      {
        question: 'What should I buy in McLeod Ganj?',
        answer:
          "Good buys in McLeod Ganj include Tibetan singing bowls, thangka paintings, prayer flags, malas, incense, yak and sheep wool shawls, Tibetan carpets, silver jewellery and books on Buddhism and Tibet. Kangra tea and Himachali woollens make useful gifts too. Temple Road and Jogiwara Road have the most shops. For assured quality, buy from Tibetan cooperatives and Norbulingka's shop rather than random stalls.",
        link: { href: '/blog/shopping-in-mcleod-ganj', label: 'Shopping in McLeod Ganj' },
      },
      {
        question: 'How can I tell a hand-painted thangka from a print?',
        answer:
          "Look closely: a hand-painted thangka has slightly raised brushwork, fine gold detail and tiny variations, while prints look flat and uniform, with dot patterns under a magnifier. Genuine thangkas take weeks or months to paint, so a large one priced very cheaply is almost certainly printed. Ask who painted it and which school it follows. Norbulingka and established artists' studios are the safest places to buy.",
        link: { href: '/blog/shopping-in-mcleod-ganj', label: 'Buying thangkas' },
      },
      {
        question: 'Is bargaining acceptable in McLeod Ganj markets?',
        answer:
          "Yes, polite bargaining is normal at street stalls and many souvenir shops, especially when buying several items. Start a little below the asking price and settle somewhere in the middle, staying friendly. Cooperatives, Norbulingka, bookshops and many Tibetan-run boutiques have fixed prices, so do not haggle there. Remember that small sums matter more to the seller than to you.",
        link: { href: '/blog/shopping-in-mcleod-ganj', label: 'Shopping tips' },
      },
      {
        question: 'Where can I buy genuine Kangra tea?',
        answer:
          "Buy Kangra tea, which has carried a Geographical Indication tag since 2005, from the Palampur Co-operative Tea Factory shop, estate shops around Palampur, or reputable tea stores in Dharamshala and McLeod Ganj. Both green and black (orthodox) teas are produced. Check for the Kangra tea label and a recent packing date. Spring flush teas, picked from about March to May, are the most prized.",
        link: { href: '/blog/palampur-travel-guide', label: 'Palampur tea gardens' },
      },
      {
        question: 'What are Kangra miniature paintings, and where can I see them?',
        answer:
          "Kangra painting is a school of Pahari miniature art that flourished in the 18th and early 19th centuries under Raja Sansar Chand, known for delicate lines, soft colours and scenes of Krishna and Radha. In Dharamshala, the Kangra Art Museum in Kotwali Bazaar has a collection, and the Maharaja Sansar Chand Museum at Kangra Fort shows related works. A few artists still paint in this style and sell originals.",
        link: { href: '/blog/kangra-painting-art-guide', label: 'Kangra painting guide' },
      },
      {
        question: 'What happens during Losar in McLeod Ganj?',
        answer:
          "Losar, the Tibetan New Year, usually falls in February or early March and is celebrated for about three days, with the main public activity on the first days. Families clean their homes, eat guthuk soup before the new year, make offerings and visit the Tsuglagkhang and monasteries for prayers. Many Tibetan shops and restaurants close for a few days, so expect quieter streets and plan meals accordingly. Dates follow the Tibetan lunar calendar.",
        link: { href: '/blog/losar-tibetan-festivals-guide', label: 'Losar and Tibetan festivals' },
      },
      {
        question: 'When is the Dharamshala International Film Festival held?',
        answer:
          "The Dharamshala International Film Festival (DIFF), running since 2012, has usually been held over a few days in late October or early November, with screenings of independent Indian and international films, talks and workshops, typically at venues in upper Dharamshala and McLeod Ganj. Dates, venues and passes vary from year to year, so check the festival's official website before planning a trip around it.",
        link: { href: '/blog/festivals-events-calendar-dharamshala', label: 'Festivals and events calendar' },
      },
      {
        question: 'How is Navratri celebrated in the Kangra Valley?',
        answer:
          "Navratri is the busiest time at the Kangra Valley's Devi temples: Chamunda, Brajeshwari in Kangra, Jwalamukhi and Chintpurni. Both the spring Navratri (around March-April) and the autumn Navratri (September-October) draw huge crowds of pilgrims, with long queues, special decorations and fairs. Traffic on temple roads can be heavy, so start early and expect security checks. Book hotels in advance near the temples.",
        link: { href: '/blog/kangra-devi-temples-guide', label: 'Kangra Devi temples guide' },
      },
      {
        question: 'Who are the Gaddi people?',
        answer:
          "The Gaddis are a traditionally semi-nomadic pastoral community of the Dhauladhar and the Bharmour area of Chamba, known for moving large flocks of sheep and goats between high summer pastures and the lower valleys in winter. You may see Gaddi shepherds and their flocks on trails around Triund and Kareri. Men often wear a woollen chola tied with a black rope belt. Ask before taking photographs.",
        link: { href: '/blog/gaddi-shepherds-culture', label: 'Gaddi shepherd culture' },
      },
      {
        question: 'What language is spoken in Dharamshala?',
        answer:
          "Hindi is widely spoken across Dharamshala, and locals among themselves often use Kangri, a Pahari language of the Kangra Valley. In McLeod Ganj you will also hear Tibetan, and English is widely understood in hotels, cafes, shops and among taxi drivers in tourist areas. A few words of Hindi or Tibetan, such as namaste, dhanyavaad, tashi delek and thuk-je-chay, are always appreciated.",
        link: { href: '/blog/tibetan-culture-etiquette-guide', label: 'Culture and etiquette' },
      },
      {
        question: 'Where can I see Tibetan opera, music and dance?',
        answer:
          "The Tibetan Institute of Performing Arts (TIPA), founded in 1959 and based in McLeod Ganj, preserves Tibetan opera (Ache Lhamo), folk dance and music. It stages performances on special occasions, including festivals and some public events, and has hosted an annual opera festival in spring. Performances are not daily, so check notice boards in McLeod Ganj or ask at TIPA about upcoming shows during your stay.",
        link: { href: '/blog/losar-tibetan-festivals-guide', label: 'Tibetan festivals' },
      },
      {
        question: 'Can I ship carpets or large souvenirs home from McLeod Ganj?',
        answer:
          "Yes, many established carpet and handicraft shops in McLeod Ganj and Norbulingka can arrange international shipping, and India Post and courier companies operate from Dharamshala. Get a written invoice listing the item, price and shipping cost, and ask for tracking details. Customs duties in your home country are usually paid on arrival. For valuable pieces, pay by card for added protection.",
        link: { href: '/blog/shopping-in-mcleod-ganj', label: 'Shopping guide' },
      },
    ],
  },
  {
    id: 'stays-practical',
    title: 'Stays in Detail',
    faqs: [
      {
        question: 'Can unmarried couples stay together in Dharamshala hotels?',
        answer:
          "Yes. There is no law in India that stops two consenting adults who are not married from sharing a hotel room, provided both show valid photo ID at check-in. However, individual hotels and homestays can set their own policies, and a few family-run properties refuse unmarried couples or local-ID guests. If this matters, confirm the policy in writing before booking, and we can point you to couple-friendly stays.",
        link: { href: '/hotels', label: 'Couple-friendly hotels' },
      },
      {
        question: 'What ID do I need to check in to a hotel?',
        answer:
          "Indian guests usually need an original government photo ID with an address, such as an Aadhaar card, driving licence, passport or voter ID, for every adult. A PAN card is often not accepted because it has no address. Foreign guests must show their passport and a valid Indian visa. Some hotels do not accept IDs with a local Dharamshala address, so check this when booking if it applies to you.",
        link: { href: '/blog/rules-permits-dos-donts-dharamshala', label: 'Rules and permits' },
      },
      {
        question: 'What is the C-form, and why do hotels ask foreigners for it?',
        answer:
          "The C-form is a mandatory registration that hotels, guesthouses and homestays must submit online to Indian immigration authorities within 24 hours of a foreign guest's arrival. You simply show your passport and visa at check-in, and the property files it. Ask for a copy, as foreigners need it to register for Dalai Lama teachings. Properties that cannot register foreigners may turn you away.",
        link: { href: '/blog/dalai-lama-temple-guide', label: 'Teachings and registration' },
      },
      {
        question: 'Can I check in early after an overnight bus?',
        answer:
          "Sometimes, but do not assume it. Standard check-in in Dharamshala is usually around 12-2 pm, while overnight Volvo buses arrive between about 5 and 8 am. Many hotels will let you leave bags and freshen up, and allow early check-in if a room is free, often for a fee in peak season. If you need a room on arrival, book the previous night as well.",
        link: { href: '/blog/delhi-to-dharamshala-by-bus', label: 'Overnight bus tips' },
      },
      {
        question: 'Are power cuts common in Dharamshala?',
        answer:
          "Power cuts are not daily, but they do happen, especially during storms, heavy rain, snowfall and monsoon, and can last from minutes to several hours in villages. Larger hotels usually have generators, while smaller guesthouses may have only an inverter that runs lights and Wi-Fi, not heaters or geysers. Ask what the backup covers before booking, and carry a power bank and a small torch.",
        link: { href: '/blog/atm-mobile-network-internet-dharamshala', label: 'Power, internet and network' },
      },
      {
        question: 'How much does a monthly rental cost in Dharamkot or Bhagsu?',
        answer:
          "Monthly rentals vary widely by season and comfort. As a rough guide for 2026, simple guesthouse rooms on monthly terms may start around ₹10,000-15,000, while a better room with kitchen access, good views or Wi-Fi can run ₹20,000-35,000 or more. Rates rise in April to June and fall in monsoon and winter. View the place first, check heating and water, and agree electricity charges in advance.",
        link: { href: '/destinations/dharamkot', label: 'Dharamkot guide' },
      },
      {
        question: 'Which area is best for a workation?',
        answer:
          "Lower Dharamshala and the quieter parts of McLeod Ganj usually offer the most reliable power, fibre broadband and mobile signal, plus road access for supplies. Dharamkot and Bhagsu have a strong remote-worker community and cafes, but some guesthouses rely on patchy Wi-Fi. Before booking a long stay, ask for a speed test screenshot, confirm power backup for the router, and keep a mobile hotspot as backup.",
        link: { href: '/blog/dharamshala-for-digital-nomads', label: 'Digital nomad guide' },
      },
      {
        question: 'Should I choose a homestay or a hotel in Dharamshala?',
        answer:
          "Choose a homestay for home-cooked food, local insight and a village setting, especially in Dharamkot, Naddi or around Palampur. Choose a hotel if you want room service, generator backup, reliable heating, lifts or easy car access. Homestays are often better value but have fewer facilities and stricter quiet hours. Check whether the homestay is registered, especially if you are a foreign guest, since it must file a C-form.",
        link: { href: '/hotels', label: 'Hotels and homestays' },
      },
      {
        question: 'Are there hostels in McLeod Ganj and Dharamkot?',
        answer:
          "Yes, McLeod Ganj, Bhagsu and Dharamkot have several backpacker hostels with dorm beds, private rooms, common areas and cafes, and many offer female-only dorms. Dorm beds are roughly ₹400-700 a night in 2026, higher on peak weekends. Hostels are a good way to find trekking partners for Triund. Check recent reviews for cleanliness, hot water and heating, and whether lockers are provided.",
        link: { href: '/destinations/bhagsu', label: 'Bhagsu guide' },
      },
      {
        question: 'How do I check whether a hotel is reachable by car?',
        answer:
          "Ask the hotel directly whether a car can reach the door, how far the nearest drop point is, and how many steps lead to reception. Many properties in McLeod Ganj, Bhagsu and Dharamkot are reached by steep lanes or stairs, and photos rarely show this. Check the location on a map with satellite view, and ask whether staff help with luggage. This matters most for families and older travellers.",
        link: { href: '/blog/best-hotels-in-mcleod-ganj', label: 'Best hotels in McLeod Ganj' },
      },
      {
        question: 'Is it cheaper to book a Dharamshala hotel directly?',
        answer:
          "Often, but not always. Smaller hotels and guesthouses may offer a better rate or free extras when you book directly or through a local agent, since they avoid big platform commissions. Large booking sites sometimes run flash deals that are hard to beat. Compare the final price including taxes and breakfast, read the cancellation terms, and get confirmation in writing.",
        link: { href: '/contact', label: 'Ask us for a quote' },
      },
      {
        question: 'Do hotels in McLeod Ganj have lifts?',
        answer:
          "Only some do. Larger and newer hotels, especially in lower Dharamshala, often have lifts, but many guesthouses and boutique stays in McLeod Ganj, Bhagsu and Dharamkot are built down or up the hillside with several floors of stairs. If anyone in your group has limited mobility, ask for a ground-floor or road-level room and confirm whether there is a lift before booking.",
        link: { href: '/blog/dharamshala-for-senior-citizens', label: 'Tips for senior travellers' },
      },
      {
        question: 'Are hotels in Dharamshala pet-friendly?',
        answer:
          "Some are, but pet-friendly stays are still limited, so book ahead and confirm in writing. Homestays and independent hotels are more likely to accept dogs than larger properties, sometimes with an extra cleaning fee. Keep pets leashed, as stray dogs and monkeys are common, and avoid leaving them alone in rooms. Leopards have been reported near forest-edge settlements, so keep pets indoors at night.",
        link: { href: '/blog/travelling-with-pets-dharamshala', label: 'Travelling with pets' },
      },
    ],
  },
  {
    id: 'nature-weather-safety',
    title: 'Nature, Wildlife & Weather Safety',
    faqs: [
      {
        question: 'What should I do if a monkey grabs my bag or food?',
        answer:
          "Let it go. Do not chase, hit or tug-of-war with a monkey, as they can bite. Avoid staring or baring your teeth, which monkeys read as a threat, and back away calmly. Often they drop the item once they find nothing to eat. Prevention is easier: keep food and plastic bags out of sight, close windows and balcony doors, and do not feed them.",
        link: { href: '/blog/first-time-visitor-tips-mistakes', label: 'First-timer tips' },
      },
      {
        question: 'What should I do after a dog or monkey bite in Dharamshala?',
        answer:
          "Treat any bite or scratch seriously because of rabies risk. Wash the wound immediately with soap and running water for about 15 minutes, then go to a hospital the same day for anti-rabies vaccination and, if needed, immunoglobulin. The Zonal Hospital in Dharamshala and larger private hospitals can advise. Start treatment even if you were vaccinated before, and finish the full course.",
        link: { href: '/blog/health-medical-help-dharamshala', label: 'Health and medical help' },
      },
      {
        question: 'Are there leopards near McLeod Ganj, and what should I do if I see one?',
        answer:
          "Leopards live in the forests around Dharamshala and have occasionally been seen near forest-edge homes and roads, usually at dusk or night. Attacks on people are rare. Walk in groups after dark, use a torch, keep children and pets close, and avoid forest shortcuts at night. If you see a leopard, do not run or approach. Stay calm, keep facing it, make yourself look large and back away slowly.",
        link: { href: '/blog/solo-female-travel-dharamshala', label: 'Staying safe' },
      },
      {
        question: 'Are there bears on the trails around Dharamshala?',
        answer:
          "Himalayan black bears live in the Dhauladhar forests, especially on quieter routes towards Kareri and higher up, but sightings on busy trails like Triund are rare. They are most active from spring to autumn. Trek in groups, talk or make noise on blind bends, never leave food around campsites, and keep a safe distance if you spot one. Local guides know recent sightings and safer camping spots.",
        link: { href: '/treks', label: 'Guided treks' },
      },
      {
        question: 'Is Dharamshala in an earthquake zone?',
        answer:
          "Yes. The Kangra region is in one of India's highest seismic risk categories, and the 1905 Kangra earthquake, estimated at around magnitude 7.8, killed some 20,000 people and destroyed much of Dharamshala and Kangra. Small tremors are felt occasionally. Know the exits of your hotel, keep a torch and shoes near the bed, and during shaking drop, cover and hold on, away from windows.",
        link: { href: '/blog/places-to-visit-in-kangra', label: 'Kangra history' },
      },
      {
        question: 'What should I do if a landslide blocks the road while I am travelling?',
        answer:
          "Stop at a safe distance, do not drive under loose slopes, and do not try to cross fresh debris or flowing water. Follow police and road crews' instructions, as clearing can take from an hour to a full day. Turn back to the last town if waiting is unsafe. Keep water, snacks, a charged phone and some cash in the car during monsoon, and check local news before leaving.",
        link: { href: '/blog/dharamshala-monsoon-travel-guide', label: 'Monsoon safety' },
      },
      {
        question: 'Is it safe to visit Bhagsu waterfall and streams in heavy rain?',
        answer:
          "No, keep away from streams and waterfalls during and right after heavy rain. In July 2021 a flash flood in the Bhagsu nala swept away cars and damaged buildings, showing how quickly water levels rise. Cloudbursts can send torrents down from the Dhauladhar with little warning. Watch the sky, heed local alerts, never camp beside streams in monsoon, and do not wade across swollen streams.",
        link: { href: '/blog/bhagsu-travel-guide', label: 'Bhagsu travel guide' },
      },
      {
        question: 'What rain gear do I need for Dharamshala?',
        answer:
          "Pack a proper waterproof jacket or poncho, a small umbrella, quick-drying clothes, and shoes with strong grip, ideally waterproof, because the steep lanes turn slippery. A rain cover for your backpack and zip-lock bags for phones and documents help a lot. In monsoon, leeches appear on some forest trails, so long socks and salt are useful. Cotton jeans take days to dry, so avoid them.",
        link: { href: '/blog/dharamshala-weather-what-to-pack', label: 'Packing list' },
      },
      {
        question: 'Are thunderstorms and lightning dangerous on Triund and other ridges?',
        answer:
          "Yes. Afternoon thunderstorms are common in spring, summer and monsoon, and lightning on exposed ridges such as Triund has caused deaths in the past. Start treks early so you are off high ground by early afternoon, and check the forecast. If a storm builds, descend from ridgelines, avoid lone trees and metal poles, and crouch low on insulating material rather than sheltering in an open tent on the crest.",
        link: { href: '/blog/triund-trek-complete-guide', label: 'Triund safety tips' },
      },
      {
        question: 'Is it safe to drive to McLeod Ganj when it snows?',
        answer:
          "Only with care, and often better not to. After snowfall the steep roads to McLeod Ganj, Naddi and Dharamkot can freeze, especially in early mornings and after dark when black ice forms. Plain cars without snow chains slip easily on the gradients. If snow is forecast, consider parking in lower Dharamshala and taking a local taxi whose driver knows the roads, and avoid driving between late evening and mid-morning.",
        link: { href: '/blog/dharamshala-in-winter-snowfall', label: 'Winter driving tips' },
      },
      {
        question: 'Is Dharamshala good for birdwatching?',
        answer:
          "Yes. The forests around McLeod Ganj, Dharamkot and Naddi host species such as the red-billed blue magpie, Himalayan griffon, lammergeier, laughingthrushes and various tits and finches, with spring and autumn especially rewarding. Early-morning walks on quiet forest paths work best. For waterbirds, Pong Dam in winter is outstanding. Bring binoculars and stay on paths to avoid disturbing wildlife.",
        link: { href: '/blog/pong-dam-bird-sanctuary-guide', label: 'Pong Dam birding' },
      },
      {
        question: 'What is the Dhauladhar Wildlife Sanctuary?',
        answer:
          "The Dhauladhar Wildlife Sanctuary protects a large stretch of the Dhauladhar slopes above Dharamshala and Palampur, ranging from oak and rhododendron forest up to alpine meadows and rock. It is home to species such as the Himalayan black bear, leopard, goral, Himalayan tahr and many pheasants. Several trekking routes pass through or near it, so follow Forest Department rules and carry all your waste back down.",
        link: { href: '/treks', label: 'Treks near Dharamshala' },
      },
      {
        question: 'Are there forest fires around Dharamshala?',
        answer:
          "Yes, forest fires are a risk in the dry pre-monsoon months, roughly April to June, when pine needles and dry grass catch easily. Never drop cigarettes or matches, avoid lighting campfires except where permitted, and report smoke to locals or the emergency number 112. If you see fire on a trail, move away uphill of the wind direction or back down the way you came. Trails may close during fire alerts.",
        link: { href: '/blog/rules-permits-dos-donts-dharamshala', label: 'Dos and donts' },
      },
      {
        question: 'Do I need sunscreen in Dharamshala, even in winter?',
        answer:
          "Yes. At 1,400-2,850 m, UV levels are higher than on the plains, and clear winter days and snow reflection make sunburn easy, especially on Triund and other open trails. Use sunscreen of SPF 30 or more, sunglasses and a cap, and reapply on long hikes. Drink plenty of water, because cool air makes it easy to underestimate dehydration on steep climbs.",
        link: { href: '/blog/dharamshala-weather-what-to-pack', label: 'What to pack' },
      },
    ],
  },
];
