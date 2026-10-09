import { HttpError } from '@/lib/server-auth';
import { normalizeIndianPhone } from '@/lib/whatsapp';

export const INVALID_WHATSAPP = 'Enter a valid Indian mobile number for WhatsApp.';

/**
 * Profile fields for a WhatsApp alerts change. A valid number is only required when alerts
 * are on; with alerts off the number is stored normalised, or null if it is not valid.
 * Turning alerts on (off → on) stamps when and by whom consent was recorded.
 */
export function whatsappProfilePatch(opts: {
  rawNumber: string | null | undefined; alerts: boolean; wasOn: boolean; by: 'partner' | 'admin';
}): Record<string, unknown> {
  const number = normalizeIndianPhone(opts.rawNumber);
  if (opts.alerts && !number) throw new HttpError(400, INVALID_WHATSAPP);
  return {
    whatsapp_number: number, whatsapp_alerts: opts.alerts,
    ...(opts.alerts && !opts.wasOn ? { whatsapp_opt_in_at: new Date().toISOString(), whatsapp_opt_in_by: opts.by } : {}),
  };
}
