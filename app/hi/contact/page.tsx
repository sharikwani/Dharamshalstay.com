import { ContactView, contactMetadata } from '@/components/pages/AboutContactViews';

export const metadata = contactMetadata('hi');

export default function ContactPage() {
  return <ContactView lang="hi" />;
}
