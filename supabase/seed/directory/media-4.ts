import type { DirectoryMedia } from './types';

/**
 * Hotel photos and listing details for directory batch 2.
 * Photos only where the property publishes its own (Hostelworld listings, as in batch 1);
 * Trip.com photos were removed (OTA-hosted images are not reused);
 * details are included only where those sources state them. Properties with no
 * verified own photos have no images, so the page uses an area photo.
 * Own photos for these listings were added later in media-6.ts (migration v30).
 */
export const directoryMedia4: Record<string, DirectoryMedia> = {
  'hotel-norbu-house-mcleod-ganj': {
    images: [],
    photo_source: '',
    check_in_time: '13:00',
    check_out_time: '12:00',
    room_types: [
      { name: 'Norbu Premium Plus', bed_type: 'Double' },
      { name: 'Royal Norbu Super Deluxe', bed_type: 'Double' },
      { name: 'Yewang Suite', bed_type: 'Double' },
      { name: 'Grand Norbu Suite', bed_type: 'Double' },
    ],
    amenities: ['WiFi', 'Free parking', 'Restaurant', 'Cafe', 'Room service', 'Garden', 'Lift', 'Business centre', 'Conference room'],
    pet_policy: 'Pets are not allowed.',
    smoking_policy: 'Rooms are non-smoking; no smoking in public areas.',
  },
  'hotel-woodville-inn-mcleod-ganj': {
    images: [],
    photo_source: '',
    check_in_time: '12:00',
    check_out_time: '11:00',
    room_types: [
      { name: 'Basic Room', bed_type: 'Double' },
      { name: 'Classic Room' },
      { name: 'Executive Room', bed_type: 'Queen' },
      { name: 'Deluxe Room', bed_type: 'Queen' },
    ],
    amenities: ['WiFi', 'Free parking', 'Restaurant', 'Bar', 'Lift', 'Room service', 'Laundry service', '24-hour front desk', 'CCTV'],
    smoking_policy: 'No smoking in public areas; the Basic Room is non-smoking, some other rooms permit smoking.',
  },
  'hotel-pawan-regency-jogiwara-road-mcleod-ganj': {
    images: [],
    photo_source: '',
    check_in_time: '13:00',
    check_out_time: '11:00',
    room_types: [
      { name: 'Premium Room', bed_type: 'King' },
      { name: 'Deluxe Room', bed_type: 'King' },
      { name: 'Superior Room', bed_type: 'King' },
    ],
    amenities: ['WiFi', 'Free parking', 'Restaurant', 'Room service'],
    pet_policy: 'Pets are listed as allowed for a fee (cats); confirm with the hotel.',
    smoking_policy: 'Rooms are non-smoking; no smoking in public areas.',
  },
  'the-bougainvillea-jogiwara-road-mcleod-ganj': {
    images: [],
    photo_source: '',
    check_in_time: '12:00',
    check_out_time: '10:00',
    room_types: [
      { name: 'Superior Room with Balcony' },
      { name: 'Deluxe Room with Mountain View' },
      { name: 'Superior Corner Room' },
      { name: 'Bed in 4-Bed Mixed Dormitory' },
    ],
    amenities: ['WiFi', 'Room service', 'Taxi booking', 'Tour desk', 'Smoking area'],
    smoking_policy: 'A smoking area is available; most rooms and the dorm are non-smoking.',
  },
  'hotel-akash-jogiwara-road-mcleod-ganj': {
    images: [],
    photo_source: '',
    check_in_time: '14:00',
    check_out_time: '11:00',
    room_types: [
      { name: 'Superior Room', bed_type: 'Queen' },
      { name: 'Family Studio Suite', bed_type: 'Queen' },
      { name: 'Deluxe Room', bed_type: 'Queen' },
      { name: 'Comfort Room', bed_type: 'Queen' },
    ],
    amenities: ['WiFi', 'Free parking', 'Restaurant', 'Massage room', '24-hour front desk', 'Tour and ticket booking'],
    smoking_policy: 'Rooms are non-smoking.',
  },
  'hotel-lavish-inn-jogiwara-road-mcleod-ganj': {
    images: [],
    photo_source: '',
    check_in_time: '14:00',
    check_out_time: '12:00',
    room_types: [
      { name: 'Executive Room' },
      { name: 'Deluxe Room' },
      { name: 'Super Deluxe Room' },
    ],
    amenities: ['Restaurant', 'Cafe', 'Bar', 'Free parking', 'Lift', 'Room service', 'Laundry service', '24-hour front desk'],
    smoking_policy: 'Smoking is not allowed inside the hotel.',
  },
  'la-riqueza-koala-inn-jogiwara-road-mcleod-ganj': {
    images: [],
    photo_source: '',
    room_types: [
      { name: 'Deluxe Room with Mountain View and Balcony', bed_type: 'Queen' },
      { name: 'Superior Room with Mountain View and Balcony', bed_type: 'Double' },
      { name: 'Family Room', bed_type: 'Queen plus 2 singles' },
      { name: 'Quadruple Room', bed_type: '2 singles or 1 double' },
    ],
    amenities: ['WiFi', 'Free parking', 'EV charging', 'Restaurant', 'Cafe', 'Bar', 'Laundry service', 'Luggage storage', '24-hour front desk'],
  },
  'zostel-mcleodganj-jogiwara-road': {
    images: [],
    photo_source: '',
    check_in_time: '13:00',
    check_out_time: '10:00',
    room_types: [
      { name: 'Bed in 6-Bed Female Dormitory' },
      { name: 'Bed in 6-Bed Mixed Dormitory' },
      { name: 'Superior Room with Balcony', bed_type: 'Queen' },
      { name: 'Deluxe Triple Room with Balcony', bed_type: 'Queen plus single' },
    ],
    amenities: ['WiFi', 'Cafe', 'Restaurant', 'Lockers', 'Luggage storage', 'Gaming area', 'Karaoke', 'Smoking area'],
    smoking_policy: 'Rooms are non-smoking; a smoking area is available.',
  },
  'hotel-the-nest-jogiwara-road-mcleod-ganj': {
    images: [
      { url: 'https://a.hwstatic.com/image/upload/f_auto,q_auto,w_1200/v1/propertyimages/3/310983/jqcalnhqjn2wy7r12mrh', alt: 'Hotel The Nest building with signboard', category: 'exterior' },
      { url: 'https://a.hwstatic.com/image/upload/f_auto,q_auto,w_1200/v1/propertyimages/3/310983/nbxfwj6swsknlxypdqko', alt: 'Double room with blue accents at Hotel The Nest', category: 'room' },
      { url: 'https://a.hwstatic.com/image/upload/f_auto,q_auto,w_1200/v1/propertyimages/3/310983/i5jaiybo6sxi8wzxir3l', alt: 'Lobby lounge and reception at Hotel The Nest', category: 'lobby' },
      { url: 'https://a.hwstatic.com/image/upload/f_auto,q_auto,w_1200/v1/propertyimages/3/310983/ienhn26j1k7lkayrmoww', alt: 'Balcony with cane chairs and forest views at Hotel The Nest', category: 'view' },
      { url: 'https://a.hwstatic.com/image/upload/f_auto,q_auto,w_1200/v1/propertyimages/3/310983/tgwmcyb38hzb0jnasg6k', alt: 'Lounge seating area at Hotel The Nest', category: 'lobby' },
      { url: 'https://a.hwstatic.com/image/upload/f_auto,q_auto,w_1200/v1/propertyimages/3/310983/o7iwvf5qtayjcpvghrxv', alt: 'Reception desk at Hotel The Nest', category: 'lobby' },
    ],
    photo_source: 'https://www.hostelworld.com/hotels/p/310983/hotel-the-nest/',
    check_in_time: '13:00',
    check_out_time: '11:00',
    amenities: ['WiFi', 'Free parking', 'Rooftop restaurant', 'Conference room', 'Travel desk', '24-hour reception', 'Evening shuttle to the mall'],
  },
  'hillora-mcleodganj-shivam-marg': {
    images: [
      { url: 'https://a.hwstatic.com/image/upload/f_auto,q_auto,w_1200/v1/propertyimages/3/330709/gq7080wrpbfll2mosctb', alt: 'Bed and balcony window with hill views at HillOra McLeodganj', category: 'room' },
      { url: 'https://a.hwstatic.com/image/upload/f_auto,q_auto,w_1200/v1/propertyimages/3/330709/warpjjllvb3o8x7ks3fi', alt: 'Room with balcony door and view of McLeod Ganj at HillOra McLeodganj', category: 'room' },
      { url: 'https://a.hwstatic.com/image/upload/f_auto,q_auto,w_1200/v1/propertyimages/3/330709/gwxb4blqpv6r23wwxfok', alt: 'Room window looking over the valley at HillOra McLeodganj', category: 'view' },
      { url: 'https://a.hwstatic.com/image/upload/f_auto,q_auto,w_1200/v1/propertyimages/3/330709/pkmvyulzwddwqekaskgh', alt: 'Room with wall-mounted TV at HillOra McLeodganj', category: 'room' },
      { url: 'https://a.hwstatic.com/image/upload/f_auto,q_auto,w_1200/v1/propertyimages/3/330709/dhcixdc4qvj3gedaryev', alt: 'Bathroom at HillOra McLeodganj', category: 'bathroom' },
    ],
    photo_source: 'https://www.hostelworld.com/hotels/p/330709/hillora-mcleodganj/',
    check_in_time: '13:00',
    room_types: [
      { name: 'Superior Double or Twin Room with Balcony' },
    ],
    amenities: ['WiFi', 'Free parking', 'Breakfast included', '24-hour reception', 'Luggage storage', 'Airport transfer'],
  },
  'albela-house-hotel-shivam-marg-mcleod-ganj': {
    images: [],
    photo_source: '',
    amenities: ['WiFi', 'Cafe', 'Laundry service', 'Luggage storage', 'Tour and taxi desk'],
    pet_policy: 'Pets (dogs and cats) are listed as allowed for an extra charge.',
    smoking_policy: 'Smoking only in assigned areas.',
  },
  'hotel-asian-plaza-main-square-mcleod-ganj': {
    images: [],
    photo_source: '',
    check_in_time: '13:00',
    check_out_time: '12:00',
    room_types: [
      { name: 'Deluxe Room', bed_type: 'Queen' },
      { name: 'Superior Double Room', bed_type: 'Queen' },
      { name: 'Luxury Suite', bed_type: 'King' },
    ],
    amenities: ['WiFi', 'Restaurant', 'Bar', 'Massage room', 'Swimming pool', 'Free parking', 'Luggage storage', 'Laundry service', '24-hour front desk'],
    pet_policy: 'Pets are not allowed.',
  },
  'shree-guest-house-main-square-mcleod-ganj': {
    images: [],
    photo_source: '',
    check_in_time: '13:00',
    check_out_time: '11:00',
    room_types: [
      { name: 'Deluxe Room', bed_type: 'Double' },
      { name: 'Standard Room', bed_type: 'Double' },
      { name: 'Budget Room', bed_type: 'Double' },
    ],
    amenities: ['WiFi', 'Cafe', 'Free parking', 'Laundry service', 'Luggage storage', '24-hour front desk'],
  },
  'mcleodganj-bed-and-breakfast-dharamkot-road': {
    images: [],
    photo_source: '',
    check_in_time: '12:00',
    check_out_time: '11:00',
    room_types: [
      { name: 'Deluxe Double Room', bed_type: 'King' },
      { name: 'Standard Room', bed_type: 'Double' },
      { name: 'Cottage Double Room', bed_type: 'Double' },
      { name: 'Master Room', bed_type: 'Double' },
    ],
    amenities: ['WiFi', 'Cafe', 'Library', 'Garden', 'Shared kitchen', 'Free parking', 'Laundry service', 'Luggage storage'],
    smoking_policy: 'Smoking only in designated areas.',
  },
  'hotel-bella-heights-temple-road-mcleod-ganj': {
    images: [],
    photo_source: '',
    check_in_time: '14:00',
    check_out_time: '12:00',
    room_types: [
      { name: 'Suite Room with Balcony', bed_type: 'King' },
      { name: 'Superior Room with Balcony', bed_type: 'King' },
      { name: 'Standard Room with Balcony', bed_type: 'King' },
      { name: 'Deluxe Room', bed_type: 'King' },
    ],
    amenities: ['WiFi', 'Free parking', 'Valet parking', 'Restaurant', 'Gym', 'Conference room', 'Co-working space', '24-hour front desk'],
    pet_policy: 'Pets are not allowed.',
    smoking_policy: 'Rooms are non-smoking; no smoking in public areas.',
  },
  'hotel-mount-view-jogiwara-road-mcleod-ganj': {
    images: [
    ],
    photo_source: '',
    room_types: [
      { name: 'Deluxe Room' },
      { name: 'Superior Room', bed_type: 'Double' },
      { name: 'Premium Room', bed_type: 'Queen' },
      { name: 'Family Suite', bed_type: 'King' },
      { name: 'Royal Room', bed_type: 'Queen' },
    ],
    amenities: ['WiFi', 'Room service', 'Laundry service', '24-hour front desk'],
  },
  'hotel-m-and-resort-temple-road-mcleod-ganj': {
    images: [
    ],
    photo_source: '',
    room_types: [
      { name: 'Deluxe Room' },
      { name: 'Executive Room with Balcony' },
      { name: 'Suite Room' },
    ],
    amenities: ['Restaurant', 'Bar', 'Travel desk'],
  },
  'serkong-house-nowrojee-road-mcleod-ganj': {
    images: [
    ],
    photo_source: '',
    check_in_time: '13:00',
    check_out_time: '11:00',
    room_types: [
      { name: 'Superior Room' },
      { name: 'Suite' },
      { name: 'Twin Room' },
    ],
    amenities: ['WiFi', 'Laundry service', '24-hour front desk'],
    pet_policy: 'Pets are not allowed.',
  },
  'alivaa-hotel-forsyth-ganj-mcleod-ganj': {
    images: [
    ],
    photo_source: '',
    check_in_time: '14:00',
    check_out_time: '12:00',
    room_types: [
      { name: 'Premium Room' },
      { name: 'Deluxe Room with Valley View' },
      { name: 'Deluxe King Room with Balcony', bed_type: 'King' },
    ],
    amenities: ['WiFi', 'Swimming pool', 'Restaurant', 'Bar', 'Free parking', '24-hour front desk'],
    pet_policy: 'Pets are not allowed.',
  },
  'zambala-house-himachal-tourism-road-mcleod-ganj': {
    images: [
    ],
    photo_source: '',
    amenities: ['Restaurant', 'Laundry service'],
  },
};
