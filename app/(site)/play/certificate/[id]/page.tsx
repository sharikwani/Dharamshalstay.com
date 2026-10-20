import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Gift, PartyPopper } from 'lucide-react';
import { certificate } from '@/lib/game/certificate';
import { CODE_MIN_BOOKING, PRIZES, placeLabel } from '@/lib/game/tambola';
import { siteConfig } from '@/lib/config';
import ShareCertificate from '@/components/game/ShareCertificate';

export const dynamic = 'force-dynamic';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const c = await certificate(params.id);
  if (!c) return { robots: { index: false } };
  const title = `${c.name} won ${placeLabel(c.place)} prize at ${c.party_name}`;
  const image = siteConfig.url + '/api/game/certificate/' + c.id;
  // The certificate itself is the link preview on WhatsApp and Facebook.
  return {
    title: { absolute: title + ' | Dharamshala Stay' }, description: 'Tambola winner certificate. Play free tambola at your next party on dharamshalastay.com/play.',
    robots: { index: false, follow: true },
    openGraph: { title, description: 'Tambola winner certificate by Dharamshala Stay', images: [{ url: image, width: 1080, height: 1350 }], type: 'website' },
    twitter: { card: 'summary_large_image', title, images: [image] },
  };
}

export default async function CertificatePage({ params }: { params: { id: string } }) {
  const c = await certificate(params.id);
  if (!c) notFound();
  const image = '/api/game/certificate/' + c.id;
  const pageUrl = siteConfig.url + '/play/certificate/' + c.id;
  const prize = PRIZES[c.prize];
  const share = `I won ${placeLabel(c.place)} prize (${prize.label}) in tambola at ${c.party_name}! \u{1F3C6}`;
  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-amber-50 to-orange-50 px-4 py-8">
      <div className="max-w-5xl mx-auto grid md:grid-cols-[minmax(0,460px)_1fr] gap-8 items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={`Winner certificate for ${c.name}, ${placeLabel(c.place)} prize at ${c.party_name}`} width={1080} height={1350} className="w-full h-auto rounded-2xl shadow-2xl" />
        <div className="space-y-5">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-orange-700"><PartyPopper className="h-4 w-4" />Congratulations!</p>
            <h1 className="text-3xl font-heading font-bold text-slate-900 mt-1">{c.name}, {placeLabel(c.place)} prize winner</h1>
            <p className="text-slate-600 mt-2">{prize.label} at {c.party_name}, {day(c.date)}.</p>
          </div>
          <ShareCertificate imageUrl={image} pageUrl={pageUrl} text={share} fileName={`tambola-certificate-${c.discount_code}.png`} />
          <div className="rounded-2xl bg-brand-900 p-5 text-white">
            <p className="flex items-center gap-2 font-semibold"><Gift className="h-5 w-5 text-orange-300" />Your prize: {inr(c.discount_amount)} off a Dharamshala trip</p>
            <p className="mt-3 text-3xl font-bold tracking-widest text-orange-300">{c.discount_code}</p>
            <p className="mt-3 text-sm text-brand-100">Use it on a hotel stay, trek, taxi or paragliding booked with Dharamshala Stay worth {inr(CODE_MIN_BOOKING)} or more, until {day(c.code_expires_at)}. One use. To use it, send the code to us on WhatsApp or write it in your booking enquiry and we will take it off your price.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent('Hi, I want to use my tambola prize code ' + c.discount_code)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-700">Use it on WhatsApp</a>
              <Link href="/hotels" className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">Browse hotels</Link>
              <Link href="/treks" className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">Treks</Link>
            </div>
          </div>
          <p className="text-sm text-slate-600">Hosting a party? <Link href="/play" className="font-semibold text-brand-700 underline">Play free tambola</Link> with everyone on their phones.</p>
        </div>
      </div>
    </div>
  );
}
