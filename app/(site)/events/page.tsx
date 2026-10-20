import { EventsView, eventsMetadata } from '@/components/pages/PlanViews';

// Past events drop off by date.
export const revalidate = 86400;
export const metadata = eventsMetadata();

export default function EventsPage() {
  return <EventsView />;
}
