import { Award, BadgeCheck, Users } from 'lucide-react';
import type { TravelPartner } from '@/data/travel-partners';

/** "Top Partner", "Verified by Dharamshala Stay" and the group-trip count: our own endorsement, not customer ratings. */
export default function PartnerBadges({ p, large = false }: { p: TravelPartner; large?: boolean }) {
  const chip = large ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.topPartner && <span className={`inline-flex items-center gap-1 rounded-full bg-amber-100 font-semibold text-amber-800 ${chip}`}><Award className="h-4 w-4" />Top Partner</span>}
      {p.verified && <span className={`inline-flex items-center gap-1 rounded-full bg-green-50 font-semibold text-green-700 ${chip}`}><BadgeCheck className="h-4 w-4" />Verified by Dharamshala Stay</span>}
      {p.groupsCompleted > 0 && <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 font-semibold text-slate-700 ${chip}`}><Users className="h-4 w-4" />{p.groupsCompleted} group trips completed</span>}
    </div>
  );
}
