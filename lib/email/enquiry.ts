/**
 * Everything that happens by email after an enquiry (website form or WhatsApp):
 * contact list (+ consent if they opted in), guest confirmation, admin alert, and the 2-day follow-up.
 */
import { serviceClient } from '@/lib/server-auth';
import { CONSENT_TEXT, upsertContact } from './contacts';
import { deliver, ADMIN_TO } from './send';
import { loadEnquiryData } from './data';
import { adminNewEnquiry, enquiryReceived } from './templates';
import { scheduleEnquiryFollowUp } from './jobs';

export async function afterEnquiry(inquiryId: string, opts: { consent?: boolean; lang?: 'en' | 'hi'; consentSource?: string; adminAlert?: boolean } = {}): Promise<void> {
  const e = await loadEnquiryData(inquiryId);
  if (!e) return;
  const sb = serviceClient();

  await upsertContact({
    email: e.email, phone: e.phone, name: e.name, language: opts.lang, source: e.source === 'whatsapp' ? 'whatsapp' : 'website',
    interests: [e.type], event: 'enquiry',
    consent: opts.consent ? { text: e.source === 'whatsapp' ? CONSENT_TEXT.whatsapp : CONSENT_TEXT.website, source: opts.consentSource || e.source || 'website' } : undefined,
  }, sb);

  if (e.email) {
    const { subject, doc } = enquiryReceived(e);
    await deliver({ to: e.email, subject, doc, kind: 'transactional', template: 'enquiry_received', inquiryId: e.id });
    await scheduleEnquiryFollowUp(e.id);
  }
  if (opts.adminAlert !== false) {
    const a = adminNewEnquiry(e);
    await deliver({ to: ADMIN_TO(), subject: a.subject, doc: a.doc, kind: 'admin', template: 'admin_new_enquiry', inquiryId: e.id });
  }
}
