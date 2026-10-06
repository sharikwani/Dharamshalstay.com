import { notFound } from 'next/navigation';

// Rendered as static (not streamed) so the response carries a real 404 status.
export const dynamic = 'force-static';
export function generateStaticParams() { return []; }

// English and Hindi have separate root layouts, so there is no top-level
// not-found page. Unmatched URLs land here and get the styled 404 inside the layout.
export default function Missing() {
  notFound();
}
