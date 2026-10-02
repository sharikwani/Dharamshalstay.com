import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { ChevronRight, MessageCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Cards';
import JsonLd from '@/components/seo/JsonLd';
import { faqCategories } from '@/data/faqs';
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
  const all = faqCategories.flatMap((c) => c.faqs);

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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        <nav aria-label="FAQ topics" className="lg:sticky lg:top-24 self-start">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Topics</p>
          <ul className="flex flex-wrap lg:flex-col gap-2 lg:gap-1 text-sm">
            {faqCategories.map((c) => (
              <li key={c.id}>
                <a href={'#' + c.id} className="block px-3 py-1.5 rounded-lg bg-slate-100 lg:bg-transparent hover:bg-blue-50 text-slate-700 hover:text-brand-700">
                  {c.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-12">
          {faqCategories.map((c) => (
            <section key={c.id} id={c.id} className="scroll-mt-24">
              <h2 className="text-2xl font-heading font-bold text-slate-900 mb-4">{c.title}</h2>
              <div className="space-y-3">
                {c.faqs.map((f) => (
                  <details key={f.question} className="group bg-white border border-slate-200 rounded-xl open:shadow-sm">
                    <summary className="flex items-center justify-between cursor-pointer px-5 py-4 font-medium text-slate-800 hover:text-brand-600">
                      <h3 className="text-base font-medium pr-2">{f.question}</h3>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                    </summary>
                    <div className="px-5 pb-5 text-slate-600 leading-relaxed">
                      <p>{f.answer}</p>
                      {f.link && (
                        <Link href={f.link.href} className="inline-block mt-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
                          {f.link.label} &rarr;
                        </Link>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}

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
