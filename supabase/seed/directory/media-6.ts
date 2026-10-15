import type { DirectoryMedia } from './types';

/**
 * Own photos for directory listings that had none, so the /hotels cards stop
 * repeating one shared area photo. Every photo was uploaded by the property to
 * its own Trip.com or Agoda listing (name and address matched against the
 * listing), checked to load and viewed before the alt text was written.
 * Photos showing guests or staff were left out.
 *
 * Applied by supabase/migration-v30-hotel-own-photos.sql
 * (npx tsx scripts/generate-directory-sql.ts --photos). Only the photo fields
 * are set here; the other listing facts stay in media-4.ts.
 */
type OwnPhotos = Pick<DirectoryMedia, 'images' | 'photo_source'>;

const trip = (id: string) => 'https://ak-d.tripcdn.com/images/' + id + '_R_960_660_R5_D.jpg';
const agoda = (hotelId: number, path: string) => 'https://pix8.agoda.net/hotelImages/' + hotelId + '/' + path;

export const directoryMedia6: Record<string, OwnPhotos> = {
  'hotel-norbu-house-mcleod-ganj': {
    images: [
      { url: trip('0584l12000cseb13vBCE5'), alt: 'Hotel Norbu House, a glass-fronted building with balconies on the ridge facing the Dalai Lama Temple, McLeod Ganj', category: 'exterior' },
      { url: trip('0584p12000kyiuotf2230'), alt: 'Double room with an endless-knot headboard, striped throw and Tibetan rug at Hotel Norbu House', category: 'room' },
      { url: trip('0580o12000sxkaokzAE87'), alt: 'Spacious room with armchair, wall TV and painted Tibetan border on the ceiling at Hotel Norbu House', category: 'room' },
      { url: trip('0582j12000kyiuyfgB6C8'), alt: 'Restaurant with wooden tables and colourful Tibetan murals at Hotel Norbu House', category: 'restaurant' },
      { url: trip('0585c12000t1r5hve0855'), alt: 'Clear-day view over the wooded Kangra valley from Hotel Norbu House', category: 'view' },
      { url: trip('0583712000i5ib06q9380'), alt: 'Covered balcony walkway with tables outside the upper-floor rooms at Hotel Norbu House', category: 'other' },
      { url: trip('1ik0c12000nobsfsnF7DE'), alt: 'Conference hall set up with tables and a Potala Palace mural at Hotel Norbu House', category: 'amenity' },
    ],
    photo_source: 'https://ph.trip.com/hotels/kangra-hotel-detail-81986949/hotel-norbu-house',
  },
  'hotel-woodville-inn-mcleod-ganj': {
    images: [
      { url: trip('0584u12000su8zrsr2543'), alt: 'Hotel Woodville Inn lit up at night, near the Dalai Lama Temple in McLeod Ganj', category: 'exterior' },
      { url: trip('1ik6r12000nq8qiql1682'), alt: 'Reception desk with glowing onyx front and wooden slat wall bearing the Woodville Inn name', category: 'lobby' },
      { url: trip('0580112000szg0iafF45F'), alt: 'Twin room with pink runners and a balcony door at Hotel Woodville Inn', category: 'room' },
      { url: trip('0581u12000t0f8x4s2884'), alt: 'Lounge with leather sofas and carved wood panels at Hotel Woodville Inn', category: 'lobby' },
      { url: trip('0585l12000tr9i1lyF2A3'), alt: 'Long dining table set for a meal in the mirrored restaurant at Hotel Woodville Inn', category: 'restaurant' },
      { url: trip('0586m12000jc6zte9F3D4'), alt: 'Covered terrace with artificial grass looking out over the hills at Hotel Woodville Inn', category: 'view' },
      { url: trip('0224j120009zukzanABA6'), alt: 'Tiled guest corridor with wood-clad walls at Hotel Woodville Inn', category: 'other' },
    ],
    photo_source: 'https://ph.trip.com/hotels/kangra-hotel-detail-104593851/hotel-woodville-inn-mcleodganj',
  },
  'hotel-pawan-regency-jogiwara-road-mcleod-ganj': {
    images: [
      { url: trip('0222912000oc7lhkoA2FB'), alt: 'King room with wood-framed windows and a hillside view at Hotel Pawan Regency, Jogiwara Road, McLeod Ganj', category: 'room' },
      { url: trip('0225q12000l0sso4nC294'), alt: 'Roof terrace with wicker chairs overlooking McLeod Ganj and the mountains at Hotel Pawan Regency', category: 'view' },
      { url: trip('0584912000stpmee53E73'), alt: 'Reception with a marble counter and the Pawan Regency name in wooden letters', category: 'lobby' },
      { url: trip('0222x12000o990fix5D25'), alt: 'Restaurant with yellow seating and a picture window onto the hills at Hotel Pawan Regency', category: 'restaurant' },
      { url: trip('0224b12000l0ssi64353D'), alt: 'Double room with teal accents, work desk and balcony door at Hotel Pawan Regency', category: 'room' },
      { url: trip('0226012000o990cb4AD5C'), alt: 'Dining area opening onto the terrace with town views at Hotel Pawan Regency', category: 'restaurant' },
      { url: trip('0225x12000oah4i9x5636'), alt: 'Bright corridor hung with colourful paintings at Hotel Pawan Regency', category: 'other' },
    ],
    photo_source: 'https://uk.trip.com/hotels/kangra-hotel-detail-106792698/hotel-pawan-regency-best-mountain-view-hotel-in-mcleodganj',
  },
  'the-bougainvillea-jogiwara-road-mcleod-ganj': {
    images: [
      { url: trip('0224n12000eq7371m8EAD'), alt: 'Yellow-and-white front of The Bougainvillea with balconies on every floor, Jogiwara Road, McLeod Ganj', category: 'exterior' },
      { url: trip('1ik5512000t5wygvv5C40'), alt: 'Wood-floored double room with a red feature wall and balcony windows at The Bougainvillea', category: 'room' },
      { url: trip('0586o12000jeucdz0792F'), alt: 'Glassed-in terrace lounge with wooden sofas and potted plants at The Bougainvillea', category: 'lobby' },
      { url: trip('0585112000nrtr3nh4007'), alt: 'Dorm room with metal bunk beds and pine panelling at The Bougainvillea', category: 'room' },
      { url: trip('1ik5j12000t4mhyfc545A'), alt: 'Terrace seating with log stools and valley views at The Bougainvillea', category: 'view' },
      { url: trip('0220812000en7589m1693'), alt: 'The Bougainvillea building with its balconies lit at dusk', category: 'exterior' },
      { url: trip('0581t12000hx8q96i4638'), alt: 'Arched corridor with pine-panelled walls at The Bougainvillea', category: 'other' },
    ],
    photo_source: 'https://in.trip.com/hotels/kangra-hotel-detail-114121466/the-bougainvillea-mcleodganj/',
  },
  'hotel-akash-jogiwara-road-mcleod-ganj': {
    images: [
      { url: trip('0585x12000ncymfw694AF'), alt: 'Hotel Akash, a white building with red balcony railings on Jogiwara Road, McLeod Ganj', category: 'exterior' },
      { url: trip('0220912000kxdo3v73CB3'), alt: 'Double room with green cushions, wood panelling and Tibetan wall hangings at Hotel Akash', category: 'room' },
      { url: trip('0224o12000kxdnteoFC6F'), alt: 'Wooden reception counter with a portrait of the Dalai Lama at Hotel Akash', category: 'lobby' },
      { url: trip('0222c12000kxdob3o9316'), alt: 'Rooftop restaurant on artificial grass with the forested hills behind at Hotel Akash', category: 'restaurant' },
      { url: trip('0580212000ncynaqq70D3'), alt: 'Rooftop tables with prayer flags looking across McLeod Ganj from Hotel Akash', category: 'view' },
      { url: trip('0580d12000ncynbzv98FC'), alt: 'Hotel Akash with its balconies and rooftop lit in the evening', category: 'exterior' },
      { url: trip('0220k12000ac7117p5DED'), alt: 'Guest corridor with pine panelling and a window at the end at Hotel Akash', category: 'other' },
    ],
    photo_source: 'https://us.trip.com/hotels/kangra-hotel-detail-61961432/hotel-akash/',
  },
  'hotel-lavish-inn-jogiwara-road-mcleod-ganj': {
    images: [
      { url: trip('0222412000jjhfl7wFD25'), alt: 'Illuminated Hotel Lavish Inn sign on the building front, Jogiwara Road, McLeod Ganj', category: 'exterior' },
      { url: trip('0584512000tcabmby5054'), alt: 'Double room with a sofa, coffee table and tall window at Hotel Lavish Inn', category: 'room' },
      { url: trip('0224112000j7m7l988954'), alt: 'Room with green-accent bedding and a window onto a balcony at Hotel Lavish Inn', category: 'room' },
      { url: trip('0225o12000j7m7r5k539F'), alt: 'Restaurant with cream tub chairs and warm lighting at Hotel Lavish Inn', category: 'restaurant' },
      { url: trip('0583g12000svs2ies809A'), alt: 'Executive room with a padded headboard and sofa at Hotel Lavish Inn', category: 'room' },
    ],
    photo_source: 'https://www.trip.com/hotels/kangra-hotel-detail-84608378/hotel-lavish-inn-and-black-magic-restaurant-and-bar/',
  },
  'la-riqueza-koala-inn-jogiwara-road-mcleod-ganj': {
    images: [
      { url: trip('0585312000tz20bl98CB5'), alt: 'La Riqueza Koala Inn among deodar trees at dusk, Jogiwara Road, McLeod Ganj', category: 'exterior' },
      { url: trip('1ik2w12000nj8tm6750F3'), alt: 'Grey-and-white building of La Riqueza Koala Inn with deodars and a leafy garden in front', category: 'exterior' },
      { url: trip('0220812000o1p4jo9C943'), alt: 'Double room with a wall TV and glass doors to the balcony at La Riqueza Koala Inn', category: 'room' },
      { url: trip('0226912000o1p4lrw60E1'), alt: 'Room with sliding glass doors onto a balcony over the forested valley at La Riqueza Koala Inn', category: 'room' },
      { url: trip('1ik2s12000tvz9sb084AD'), alt: 'Rooftop terrace with blue chairs facing the hills at sunset at La Riqueza Koala Inn', category: 'view' },
      { url: trip('0226r12000lnal192258C'), alt: 'Corridor with timber-clad doors and potted plants at La Riqueza Koala Inn', category: 'other' },
    ],
    photo_source: 'https://www.trip.com/hotels/kangra-hotel-detail-123332711/la-riqueza-koala-inn-mcleod-ganj-mountain-view-rooms-with-balcony-near-to-mall-road',
  },
  'zostel-mcleodganj-jogiwara-road': {
    images: [
      { url: trip('1ik5s12000s07lzse50B9'), alt: 'Painted front of Zostel McLeodganj among deodar trees on Jogiwara Road, McLeod Ganj', category: 'exterior' },
      { url: trip('0580812000rywiaciB664'), alt: 'Private double room with a wooden pillar and floor-to-ceiling windows at Zostel McLeodganj', category: 'room' },
      { url: trip('0586p12000ry68hurD0BA'), alt: 'Common room with a red brick wall, mandala paintings and low benches at Zostel McLeodganj', category: 'common' },
      { url: trip('0585u12000s10gy350303'), alt: 'Rooftop terrace with a mural wall and snow peaks behind at Zostel McLeodganj', category: 'view' },
      { url: trip('0587312000swki55aF0AA'), alt: 'Superior room with a padded headboard and pendant lamp at Zostel McLeodganj', category: 'room' },
      { url: trip('0583712000ry6954m67E6'), alt: 'Lounge with low wooden tables and cushioned benches under cloud-pattern panels at Zostel McLeodganj', category: 'common' },
    ],
    photo_source: 'https://us.trip.com/hotels/kangra-hotel-detail-99542724/zostel-mcleodganj/',
  },
  'albela-house-hotel-shivam-marg-mcleod-ganj': {
    images: [
      { url: trip('0222t12000clzk528A1EA'), alt: 'Albela House Hotel, a white building with red and teal balconies off Shivam Marg, McLeod Ganj', category: 'exterior' },
      { url: trip('0226y12000clzk177122B'), alt: 'Balcony with a table and two chairs facing the forest at Albela House Hotel', category: 'view' },
      { url: trip('0221f12000clzjnr42F61'), alt: 'Albela House Hotel and its lit terrace restaurant at night', category: 'exterior' },
      { url: trip('0223712000clzjyj473DC'), alt: 'Balcony table looking across the misty valley at Albela House Hotel', category: 'view' },
      { url: trip('0223f12000e09dgkyE6D6'), alt: 'Cloud over the wooded hillside and houses seen from Albela House Hotel', category: 'view' },
    ],
    photo_source: 'https://us.trip.com/hotels/kangra-hotel-detail-97340873/albela-house-hotel-mcleodganj/',
  },
  'hotel-asian-plaza-main-square-mcleod-ganj': {
    images: [
      { url: trip('0226x12000l0gzmyb1700'), alt: 'Hotel Asian Plaza balconies with wooden shutters above the Main Square, McLeod Ganj', category: 'exterior' },
      { url: trip('0222j12000ln25yck9024'), alt: 'Large suite with a king bed, sitting area and brass lanterns at Hotel Asian Plaza', category: 'room' },
      { url: trip('1ik5q12000o5nci2sE3E1'), alt: 'Restaurant with orange booth seating and a crystal chandelier at Hotel Asian Plaza', category: 'restaurant' },
      { url: trip('0224r12000l0gzr51224F'), alt: 'Sunny terrace with red and green chairs and wooded hills beyond at Hotel Asian Plaza', category: 'view' },
      { url: trip('0222x12000l0gzmd3D609'), alt: 'Lobby steps between wooden doors at Hotel Asian Plaza', category: 'lobby' },
      { url: trip('0223i12000l0gzx6eE45F'), alt: 'Street-level entrance and glass-fronted restaurant of Hotel Asian Plaza in the evening', category: 'exterior' },
    ],
    photo_source: 'https://in.trip.com/hotels/kangra-hotel-detail-3683331/hotel-asian-plaza-mcleodganj/',
  },
  'shree-guest-house-main-square-mcleod-ganj': {
    images: [
      { url: trip('0584g12000ncykizlBDBF'), alt: 'Turquoise front of Shree Guest House with its sign and potted plants, just above the Main Square, McLeod Ganj', category: 'exterior' },
      { url: trip('1ik2h12000t7jkwghD861'), alt: 'Double bed with a patterned blanket and Tibetan rug at Shree Guest House', category: 'room' },
      { url: trip('0582n12000hsyzn4nA8EC'), alt: 'Room with a maroon wall and a window looking into the trees at Shree Guest House', category: 'room' },
      { url: trip('1ik4h12000t7jrhf2A2AC'), alt: 'Single room with a wooden table beside wide windows onto the deodars at Shree Guest House', category: 'room' },
      { url: trip('0221i12000ap7jyd7F874'), alt: 'Landing with a writing desk, thangka and windows onto the trees at Shree Guest House', category: 'common' },
      { url: trip('0586d12000mcy3nebCD35'), alt: 'Corridor with a dark tiled floor at Shree Guest House', category: 'other' },
    ],
    photo_source: 'https://uk.trip.com/hotels/kangra-hotel-detail-114516892/shree-guest-house',
  },
  'mcleodganj-bed-and-breakfast-dharamkot-road': {
    images: [
      { url: trip('0584z12000t1fp6qu5D6C'), alt: 'Mcleodganj Bed and Breakfast, a red-and-yellow house under deodars opposite TIPA on Dharamkot Road', category: 'exterior' },
      { url: trip('0585t12000svgtrxkDE22'), alt: 'Room with a blue bedspread and big windows onto a pine-shaded balcony at Mcleodganj Bed and Breakfast', category: 'room' },
      { url: trip('0581e12000u2fkjdjF19C'), alt: 'Double room with a white brick wall, desk and kettle at Mcleodganj Bed and Breakfast', category: 'room' },
      { url: trip('0227112000tn1tf4lCF3A'), alt: 'Cottage room with a wooden ladder to a sleeping loft at Mcleodganj Bed and Breakfast', category: 'room' },
      { url: trip('0226r12000bngx4n987F7'), alt: 'Wooden café terrace with benches among the trees at Mcleodganj Bed and Breakfast', category: 'restaurant' },
    ],
    photo_source: 'https://in.trip.com/hotels/kangra-hotel-detail-61945868/mcleodganj-homestay/',
  },
  'hotel-bella-heights-temple-road-mcleod-ganj': {
    images: [
      { url: trip('0221212000l18brci2F65'), alt: 'Hotel Bella Heights, a tall building with balconies and Zip signage on Temple Road, McLeod Ganj', category: 'exterior' },
      { url: trip('0220w12000p9tpd9qE34D'), alt: 'King room with wooden floor, padded headboard and sofa at Hotel Bella Heights', category: 'room' },
      { url: trip('1ik4c12000o436pzcEDD9'), alt: 'Reception with a green sofa and quilted feature wall at Hotel Bella Heights', category: 'lobby' },
      { url: trip('0222z12000j5g8vr49FBE'), alt: 'Covered rooftop restaurant with glass sides and hill views at Hotel Bella Heights', category: 'restaurant' },
      { url: trip('0200l120008h7ctarE319'), alt: 'Rooftop walkway lit at night leading to a Buddha statue at Hotel Bella Heights', category: 'view' },
      { url: trip('0221y12000p9tpfza32D9'), alt: 'Guest corridor ending in a painting of the Buddha at Hotel Bella Heights', category: 'other' },
      { url: trip('1ik2s12000nob3byq5ABF'), alt: 'Wood-ceilinged conference hall with rows of chairs at Hotel Bella Heights', category: 'amenity' },
    ],
    photo_source: 'https://in.trip.com/hotels/kangra-hotel-detail-61933910/zip-by-spree-hotels-bella-heights-mcleodganj/',
  },
  'hotel-mount-view-jogiwara-road-mcleod-ganj': {
    images: [
      { url: agoda(9827373, '0/fe79efbb1b5b412ff960624f984c019b.jpg'), alt: 'Hotel Mount View, a white building with turquoise roofs below the wooded hillside, Jogiwara Road, McLeod Ganj', category: 'exterior' },
      { url: agoda(9827373, '124833682/aa9a658f7435833cfa84afd7e00351e1.jpg'), alt: 'Double room with armchairs and a balcony door looking onto the hills at Hotel Mount View', category: 'room' },
      { url: agoda(9827373, '124834523/37afc2e28f91b4a32a338026ab298f41.jpg'), alt: 'Room with a sofa, sitting area and wide windows onto the forested slopes at Hotel Mount View', category: 'room' },
      { url: agoda(9827373, '124834321/71f12f0e6f5cf26a971a1ce09425e67a.jpg'), alt: 'Room with two beds, pine panelling and a balcony door at Hotel Mount View', category: 'room' },
      { url: agoda(9827373, '0/84a913eda4862abe75b1bfa029ca40be.jpg'), alt: 'Cloud drifting through the valley below McLeod Ganj, seen from Hotel Mount View', category: 'view' },
      { url: agoda(9827373, '124834321/6d0cac4aff64d81327b889105c1b7456.jpg'), alt: 'Grey-tiled bathroom with a shower and counter basin at Hotel Mount View', category: 'bathroom' },
      { url: agoda(9827373, '124833682/82be7f32bd833a97648c5fa42be15179.jpg'), alt: 'Snow on the rooftops and hillside of McLeod Ganj, seen from Hotel Mount View in winter', category: 'view' },
    ],
    photo_source: 'https://www.agoda.com/en-in/hotel-mount-view/hotel/dharamshala-in.html',
  },
  'hotel-m-and-resort-temple-road-mcleod-ganj': {
    images: [
      { url: agoda(44684147, '0/325ac89b15d348b26317fc49fd2d4c78.jpg'), alt: 'Lit entrance and café seating under the Hotel M and Resort sign on Dalai Lama Temple Road, McLeod Ganj', category: 'exterior' },
      { url: agoda(44684147, '0/d53bdab132bfc15548fe8104fa54c11a.jpg'), alt: 'Marble entrance hall with a carved wooden ceiling light at Hotel M and Resort', category: 'lobby' },
      { url: agoda(44684147, '0/73691c335a5ebb4e0c25900c02562678.jpg'), alt: 'Open terrace with wicker chairs and a glass rail over the valley at dusk at Hotel M and Resort', category: 'view' },
      { url: agoda(44684147, '0/fa1f338a5ee68f6e068a2210b1bcb41b.jpg'), alt: 'Café with cane chairs and a cake counter beside windows onto the valley at Hotel M and Resort', category: 'restaurant' },
      { url: agoda(44684147, '0/0a560ba62e3f99294c8cd00710665879.jpg'), alt: 'Reception desk in black marble and herringbone wood with a painting behind at Hotel M and Resort', category: 'lobby' },
      { url: agoda(44684147, '0/9f825baa79c57338310feeeae0ff0dcf.jpg'), alt: 'Café corner with yellow and green sofas and travel posters at Hotel M and Resort', category: 'restaurant' },
      { url: agoda(44684147, '0/7b48766a9fa61398d747afd8e46fec54.jpg'), alt: 'Round wooden table and cane chairs outside the Au M Café at Hotel M and Resort', category: 'restaurant' },
    ],
    photo_source: 'https://www.ixigo.com/hotels/tripli-hotels-m-resort-in-dharmsala-1272666-d',
  },
  'serkong-house-nowrojee-road-mcleod-ganj': {
    images: [
      { url: agoda(35417832, '0/c2b7f87006bea62dd1563ed248932381.jpg'), alt: 'Double room with endless-knot cushions and Tibetan rugs at Serkong House, Nowrojee Road, McLeod Ganj', category: 'room' },
      { url: agoda(35417832, '0/ddc2afe6869347c641e43025ef6aacfb.jpg'), alt: 'Sitting area with a painted Tibetan table and carpet by the balcony door at Serkong House', category: 'room' },
      { url: agoda(35417832, '0/d9a9fbc18e468430c0e26384e6b37921.jpg'), alt: 'Twin room with red-and-black Tibetan bedcovers and a desk at Serkong House', category: 'room' },
      { url: agoda(35417832, '0/8a68e52aa658a33a2ba147b4392b7e2c.jpg'), alt: 'Twin room with a blue wall and a dragon-pattern rug at Serkong House', category: 'room' },
      { url: agoda(35417832, '0/b38dae4550134f9d36894559b2e047cf.jpg'), alt: 'Double room with a red wall and a large red Tibetan carpet at Serkong House', category: 'room' },
      { url: agoda(35417832, '0/333e80eebf2e11cdb82a65fa67924c2c.jpg'), alt: 'Ochre and red-brick facade with railed balconies at Serkong House', category: 'exterior' },
      { url: agoda(35417832, '0/f87f2e0aa457e569c5296edb53f410aa.jpg'), alt: 'Bathroom with a glass shower screen and water heater at Serkong House', category: 'bathroom' },
    ],
    photo_source: 'https://www.agoda.com/en-in/serkong-house/hotel/dharamshala-in.html',
  },
  'alivaa-hotel-forsyth-ganj-mcleod-ganj': {
    images: [
      { url: agoda(69358045, '0/8f27e0da7e457382a51cc920ed65a54f.jpg'), alt: 'Front of Alivaa Hotel, a four-storey stone and timber building in Forsyth Ganj, McLeod Ganj', category: 'exterior' },
      { url: agoda(69358045, '0/b0d9549144b9f8b58a02212b73b5bff1.jpg'), alt: 'King room with a sitting corner and balcony doors onto the valley at Alivaa Hotel', category: 'room' },
      { url: agoda(69358045, '0/8c50667641d035d30d4be64523a1ab83.jpg'), alt: 'Room with a carved pale-blue bed, desk and mountain-view window at Alivaa Hotel', category: 'room' },
      { url: agoda(69358045, '0/a1caa036127b2363d31d828a310ac017.jpg'), alt: 'Room with marble-effect feature walls and a window onto the hills at Alivaa Hotel', category: 'room' },
      { url: agoda(69358045, '0/cb700de1ab7d915d96fb93ea5162edd4.jpg'), alt: 'Restaurant with a coffered ceiling and a wall of windows onto the hills at Alivaa Hotel', category: 'restaurant' },
      { url: agoda(69358045, '0/e632a7238e444d670f9cb5132a24e739.jpg'), alt: 'Sky Garden rooftop terrace with a reception counter and Dhauladhar view at Alivaa Hotel', category: 'view' },
      { url: agoda(69358045, '0/6099b3d2a92a52003f8511e93a06b7ab.jpg'), alt: 'Lobby with a crystal chandelier, tufted sofas and the Alivaa reception desk', category: 'lobby' },
    ],
    photo_source: 'https://www.ixigo.com/hotels/alivaa-hotel-mcleodganj-best-dhauladhar-view-in-dharmsala-1713443-d',
  },
  'zambala-house-himachal-tourism-road-mcleod-ganj': {
    images: [
      { url: agoda(32864895, '0/0c1b25699998eaafb240761882177a46.jpeg'), alt: 'Zambala House, a cream building with wide balconies at the end of Himachal Tourism Road, McLeod Ganj', category: 'exterior' },
      { url: agoda(32864895, '534352068/99bcf6f91a98273dc7a80618d5ec7f26.jpeg'), alt: 'Double room with a red feature wall and a large window onto the valley at Zambala House', category: 'room' },
      { url: agoda(32864895, '534414756/38bc5fa05f4d9849d33088336b29ae64.jpeg'), alt: 'Bright red room with endless-knot cushions and a wood-panelled screen at Zambala House', category: 'room' },
      { url: agoda(32864895, '0/08db1a7d05788ecb23512207ae4af2ed.jpeg'), alt: 'Lobby with carved Tibetan furniture, sofas and the reception desk at Zambala House', category: 'lobby' },
      { url: agoda(32864895, '534414756/36820cf0488a352df0768c42ecf376ba.jpeg'), alt: 'Balcony with a small table looking down the Kangra valley from Zambala House', category: 'view' },
      { url: agoda(32864895, '534352068/4159c6f5a462e2638194bb5a471e6ae2.jpeg'), alt: 'Bathroom with a glass shower, long counter and mirror at Zambala House', category: 'bathroom' },
      { url: agoda(32864895, '0/948ffa15dbcc7df5f51145ba2e9f965d.jpeg'), alt: 'Front balcony lined with potted plants beside the Hotel Zambala House sign among deodars', category: 'exterior' },
    ],
    photo_source: 'https://www.agoda.com/en-in/zambala-house/hotel/dharamshala-in.html',
  },
};
