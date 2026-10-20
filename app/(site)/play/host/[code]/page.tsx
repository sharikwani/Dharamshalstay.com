import type { Metadata } from 'next';
import HostRoom from '@/components/game/HostRoom';

export const metadata: Metadata = { title: { absolute: 'Party game host screen | Dharamshala Stay' }, robots: { index: false, follow: false } };

export default function HostPage({ params }: { params: { code: string } }) {
  return <div className="min-h-[80vh] bg-slate-100 px-3 sm:px-6 py-6"><div className="max-w-7xl mx-auto"><HostRoom code={params.code} /></div></div>;
}
