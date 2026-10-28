import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { TrekDetailView, trekMetadata } from '@/components/pages/TrekViews';
import { getPublishedTreks } from '@/lib/db';
import { hasHindiTrek } from '@/lib/i18n/content';

export const revalidate = 600;
export const dynamicParams = true;

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  return (await getPublishedTreks()).filter((t: any) => hasHindiTrek(t.slug)).map((t: any) => ({ slug: t.slug }));
}

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return trekMetadata(params.slug, 'hi');
}

export default function TrekPage({ params }: Props) {
  // Not translated yet: send readers (and Google) to the English trek page instead of a duplicate under /hi.
  if (!hasHindiTrek(params.slug)) permanentRedirect('/treks/' + params.slug);
  return <TrekDetailView slug={params.slug} lang="hi" />;
}
