import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { MessageCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { allFaqCategories } from '@/data/faq-all';
import FAQBrowser from '@/components/faq/FAQBrowser';
import { generateSEO, breadcrumbSchema, faqSchema } from '@/lib/seo';
import { getWhatsAppLink } from '@/lib/utils';
import { placeImage } from '@/lib/place-images';

export const metadata: Metadata = generateSEO({
  title: 'Dharamshala & McLeod Ganj Travel FAQ - Questions Answered',
  description: 'Answers to the questions travellers ask most about Dharamshala, McLeod Ganj, Kangra, Palampur and Bir: best time, how to reach, Triund, snow, safety, costs and where to stay.',
  path: '/faq',
  image: placeImage('dhauladhar-hero'),
  keywords: ['dharamshala faq', 'mcleod ganj questions', 'is dharamshala safe', 'best time to visit dharamshala', 'triund trek questions', 'how to reach dharamshala'],
});

export default function FAQPage() {
  const all = allFaqCategories.flatMap((c) => c.faqs);

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: 'Home', href: '/' }, { name: 'Questions & Answers', href: '/faq' }]),
        faqSchema(all),
      ]} />

      <section className="relative">
        <div className="absolute inset-0">
          <Image src={placeImage('dhauladhar-hero')} alt="Dhauladhar range above Dharamshala" fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-brand-950/75" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-12 text-white">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Questions & Answers' }]} />
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mt-2">Dharamshala Travel: Questions &amp; Answers</h1>
          <p className="text-blue-100 max-w-3xl mt-3">
            Straight answers from our local team to the {all.length} questions travellers ask most before visiting Dharamshala,
            McLeod Ganj, the Kangra Valley, Palampur and Bir. Can&apos;t find yours? Ask us on WhatsApp -- it&apos;s free.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <FAQBrowser categories={allFaqCategories} />

        <div className="mt-12">
          <div className="bg-gradient-to-br from-brand-50 to-blue-50 rounded-2xl p-8 text-center">
            <h2 className="font-heading font-bold text-xl text-slate-900 mb-2">Still have a question?</h2>
            <p className="text-slate-600 mb-5">We live in Dharamshala. Ask us anything about your trip -- we usually reply within a couple of hours.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <a href={getWhatsAppLink('Hi! I have a question about visiting Dharamshala.')} target="_blank" rel="noopener noreferrer"
                className="bg-green-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-600 flex items-center justify-center gap-1.5">
                <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
              </a>
              <Link href="/blog" className="bg-white border border-slate-300 text-slate-800 px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-50">
                Read the travel guides
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
