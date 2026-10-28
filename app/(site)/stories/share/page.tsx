import { Breadcrumb } from '@/components/ui/Cards';
import ShareStoryForm from '@/components/stories/ShareStoryForm';
import { generateSEO } from '@/lib/seo';
import { display } from '@/lib/fonts';
import { siteConfig } from '@/lib/config';

export const metadata = generateSEO({
  title: 'Share Your Dharamshala Story',
  description: 'Tell your story from Dharamshala or McLeod Ganj with your photos. One story is chosen every day for our homepage and Instagram.',
  path: '/stories/share',
  noindex: true, // a form, not something to rank
});

export default function ShareStoryPage() {
  return (
    <div className={display.variable + ' min-h-screen bg-[#f7f5f0]'}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Stories', href: '/stories' }, { label: 'Share your story' }]} />
        <p className="text-xs font-semibold uppercase tracking-[.3em] text-orange-600">Share your story</p>
        <h1 className="st-display mt-2 max-w-3xl text-4xl leading-tight text-slate-900 sm:text-5xl">Your Dharamshala moment deserves to be heard.</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">
          Every story is read by our team here in the mountains. One is chosen every day for our homepage and our Instagram (@{siteConfig.instagramHandle}), with your name on it.
        </p>
        <div className="mt-10"><ShareStoryForm /></div>
      </div>
    </div>
  );
}
