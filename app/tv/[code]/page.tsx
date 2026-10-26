import TvHost from '@/components/game/TvHost';

export default function TvGamePage({ params, searchParams }: { params: { code: string }; searchParams: { cast?: string } }) {
  return <TvHost code={params.code} cast={searchParams.cast === '1'} />;
}
