import HotelCollectionView, { hotelCollectionMetadata } from '@/components/pages/HotelCollectionView';

export const revalidate = 60;
export const metadata = hotelCollectionMetadata('near-dalai-lama-temple');

export default function Page() {
  return <HotelCollectionView slug="near-dalai-lama-temple" />;
}
