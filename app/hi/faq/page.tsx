import FaqView, { faqMetadata } from '@/components/pages/FaqView';

export const metadata = faqMetadata('hi');

export default function FAQPage() {
  return <FaqView lang="hi" />;
}
