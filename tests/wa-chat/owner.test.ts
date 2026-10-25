import { describe, expect, it, vi } from 'vitest';

// Modules in the import chain create a database client on load; give them dummy settings (nothing is called).
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-key';
});
import { isAffirmative, runOwnerTool } from '@/lib/wa-chat/owner';

describe('owner WhatsApp mode', () => {
  it('treats only a short, plain yes as approval', () => {
    for (const t of ['yes', 'YES', 'ok', 'Haan', 'go ahead', 'send it', 'confirm', '👍', 'yes!']) expect(isAffirmative(t)).toBe(true);
    for (const t of ['confirm HTL-123', 'yes but change the date', 'no', 'assign to Karan', '']) expect(isAffirmative(t)).toBe(false);
  });
  it('never changes anything without that yes, even if the model claims confirmation', async () => {
    for (const tool of ['confirm_booking', 'assign_booking', 'update_booking', 'message_customer', 'email_customer']) {
      const r = JSON.parse(await runOwnerTool(tool, { ref: 'TRK-1', partner_name: 'Karan', text: 'hi', subject: 's', confirmed: true }, { lastText: 'assign TRK-1 to Karan' }));
      expect(r.needs_confirmation).toBe(true);
    }
    const r = JSON.parse(await runOwnerTool('confirm_booking', { ref: 'TRK-1', confirmed: false }, { lastText: 'yes' }));
    expect(r.needs_confirmation).toBe(true);
  });
});
