import HotelCollectionView, { hotelCollectionMetadata } from '@/components/pages/HotelCollectionView';

export const revalidate = 60;
export const metadata = hotelCollectionMetadata('mountain-view');

export default function Page() {
  return <HotelCollectionView slug="mountain-view" />;
}
