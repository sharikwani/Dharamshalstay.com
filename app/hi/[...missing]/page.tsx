import { notFound } from 'next/navigation';

// Rendered as static (not streamed) so the response carries a real 404 status.
export const dynamic = 'force-static';
export function generateStaticParams() { return []; }

// Unmatched /hi/... URLs: show the Hindi 404 inside the Hindi layout.
export default function HindiMissing() {
  notFound();
}
