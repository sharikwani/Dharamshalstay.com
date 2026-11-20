import type { serviceClient } from '@/lib/server-auth';
import { MEDICINE_BUCKET, PRESCRIPTION_RETENTION_DAYS } from './options';

export const PURGED_TEXT = 'Deleted after 30 days';

/**
 * Prescriptions and health details are kept only PRESCRIPTION_RETENTION_DAYS days (promised on the page and in the
 * consent text): deletes the file and clears the medicines and urgency text; name, area and status stay as the record.
 * Runs from the 10-minute cron heartbeat and whenever admin opens /admin/medicine. Returns how many rows it cleared.
 */
export async function purgeOldMedicineData(sb: ReturnType<typeof serviceClient>): Promise<number> {
  const before = new Date(Date.now() - PRESCRIPTION_RETENTION_DAYS * 24 * 3600e3).toISOString();
  const { data } = await sb.from('medicine_requests').select('id, prescription_path').lt('created_at', before)
    .or(`prescription_path.not.is.null,medicines.neq."${PURGED_TEXT}"`).limit(100);
  const rows = (data || []) as { id: string; prescription_path: string | null }[];
  if (!rows.length) return 0;
  const paths = rows.map((r) => r.prescription_path).filter((p): p is string => !!p);
  if (paths.length) {
    const { error } = await sb.storage.from(MEDICINE_BUCKET).remove(paths);
    if (error) { console.error('Prescription purge failed:', error); return 0; }
  }
  const { error } = await sb.from('medicine_requests')
    .update({ prescription_path: null, medicines: PURGED_TEXT, urgency: PURGED_TEXT, updated_at: new Date().toISOString() })
    .in('id', rows.map((r) => r.id));
  if (error) { console.error('Medicine data purge failed:', error); return 0; }
  return rows.length;
}
