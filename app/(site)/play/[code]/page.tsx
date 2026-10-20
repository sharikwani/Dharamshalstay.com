import type { Metadata } from 'next';
import PlayerRoom from '@/components/game/PlayerRoom';

export const metadata: Metadata = { title: { absolute: 'Party game | Dharamshala Stay' }, robots: { index: false, follow: false } };

export default function PlayerPage({ params }: { params: { code: string } }) {
  return <div className="min-h-[80vh] bg-gradient-to-b from-brand-50 to-orange-50 px-3 py-6"><PlayerRoom code={params.code} /></div>;
}
