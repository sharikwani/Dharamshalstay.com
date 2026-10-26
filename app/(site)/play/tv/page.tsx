import type { Metadata } from 'next';
import { TvCodeForm } from '@/components/game/TvLinkPhone';

export const metadata: Metadata = { title: { absolute: 'Connect your TV | Dharamshala Stay party games' }, robots: { index: false, follow: false } };

export default function ConnectTvPage() {
  return <div className="min-h-[70vh] bg-slate-100 px-4 py-10"><TvCodeForm /></div>;
}
