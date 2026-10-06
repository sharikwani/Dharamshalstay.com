import { ContactView, contactMetadata } from '@/components/pages/AboutContactViews';

export const metadata = contactMetadata('en');

export default function ContactPage() {
  return <ContactView lang="en" />;
}
