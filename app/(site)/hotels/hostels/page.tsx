import HotelCollectionView, { hotelCollectionMetadata } from '@/components/pages/HotelCollectionView';

export const revalidate = 60;
export const metadata = hotelCollectionMetadata('hostels');

export default function Page() {
  return <HotelCollectionView slug="hostels" />;
}
