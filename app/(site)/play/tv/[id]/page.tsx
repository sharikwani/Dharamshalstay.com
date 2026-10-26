import type { Metadata } from 'next';
import { TvLinkPhone } from '@/components/game/TvLinkPhone';

export const metadata: Metadata = { title: { absolute: 'Show your game on the TV | Dharamshala Stay' }, robots: { index: false, follow: false } };

export default function TvLinkPage({ params }: { params: { id: string } }) {
  return <div className="min-h-[70vh] bg-slate-100 px-4 py-10"><TvLinkPhone pairId={params.id} /></div>;
}
