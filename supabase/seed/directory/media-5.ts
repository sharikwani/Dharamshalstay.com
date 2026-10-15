import type { DirectoryMedia } from './types';

/**
 * Photos and listing details for directory batch 3, from the property's own website.
 * Check-in/out times and the pet policy are left out: the official FAQ and the
 * booking sites disagree, so they are confirmed with the property first.
 */
export const directoryMedia5: Record<string, DirectoryMedia> = {
  'friends-by-alizeh-upper-bhagsu': {
    images: [
      { url: 'https://friendsbyalizeh.com/images/uploads/427/3008_693cafe__10_.webp', alt: 'Terrace café at Friends by Alizeh at night, with yellow tables and chairs on a black-and-white chequered floor', category: 'common' },
      { url: 'https://friendsbyalizeh.com/images/uploads/427/3008_106cafe__5_.webp', alt: 'Lounge with low benches, colourful floor cushions and a large window looking out over the wooded valley', category: 'common' },
      { url: 'https://friendsbyalizeh.com/images/uploads/427/3008_985common_room__4_.webp', alt: 'Long common hall with yellow benches, pouf seats, the Friends by Alizeh neon sign and windows along one wall', category: 'common' },
      { url: 'https://friendsbyalizeh.com/images/uploads/427/3008_634common_room__9_.webp', alt: 'Window counter with bench seating looking out across the Bhagsu valley at dusk', category: 'view' },
      { url: 'https://friendsbyalizeh.com/images/uploads/s_3008/friends_by_alizeh_dorms__25__4912.jpeg', alt: 'Dorm room with a row of wooden bunk beds, each with yellow privacy curtains', category: 'room' },
      { url: 'https://friendsbyalizeh.com/images/uploads/s_3008/friends_by_alizeh_dorms__2__6451.jpeg', alt: 'Made-up lower bunk with a reading light and yellow curtains tied back', category: 'room' },
      { url: 'https://friendsbyalizeh.com/images/uploads/427/3008_838common_room__3_.webp', alt: 'Games corner with a carrom board, bookshelf and board games', category: 'common' },
    ],
    photo_source: 'https://friendsbyalizeh.com/gallery.html',
    room_types: [
      { name: '4 Bed Mixed Dorm', description: 'Bed in a four-bed mixed dorm with curtained wooden bunks.', bed_type: 'Bunk', max_occupancy: 1 },
      { name: '6 Bed Mixed Dorm', description: 'Bed in a six-bed mixed dorm with curtained bunks.', bed_type: 'Bunk', max_occupancy: 1 },
      { name: '6 Bed Female Dorm', description: 'Bed in a women-only six-bed dorm with personal storage.', bed_type: 'Bunk', max_occupancy: 1 },
      { name: '8 Bed Mixed Dorm with Balcony', description: 'Bed in a larger mixed dorm with personal storage and a balcony.', bed_type: 'Bunk', max_occupancy: 1 },
      { name: 'Deluxe Room', description: 'Private double room with its own bathroom.', bed_type: 'Double', max_occupancy: 2 },
    ],
  },
};
