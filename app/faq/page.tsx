import FaqView, { faqMetadata } from '@/components/pages/FaqView';

export const metadata = faqMetadata('en');

export default function FAQPage() {
  return <FaqView lang="en" />;
}
