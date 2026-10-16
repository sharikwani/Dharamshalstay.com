/**
 * Scheduled emails: queued with a dedupe key (so re-confirming a booking never double-schedules),
 * then sent by the cron runner when due. Every job re-checks the live booking/enquiry before sending,
 * so a cancelled booking never gets a "see you soon" email.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '@/lib/server-auth';
import { deliver } from './send';
import { livePaymentLink, loadBookingData, loadEnquiryData } from './data';
import { enquiryFollowUp, paymentFailed, preArrival, reviewRequest, type Built } from './templates';

export type JobTemplate = 'enquiry_follow_up' | 'pre_arrival' | 'review_request' | 'review_reminder' | 'payment_reminder';

const istAt = (date: string, hhmm: string) => new Date(`${date.slice(0, 10)}T${hhmm}:00+05:30`);
const addDays = (date: string, n: number) => { const d = new Date(date.slice(0, 10) + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export async function automationOn(name: string, sb: SupabaseClient = serviceClient()): Promise<boolean> {
  try {
    const { data } = await sb.from('email_settings').select('automations').eq('id', 1).maybeSingle();
    return (data?.automations as any)?.[name] !== false;
  } catch { return true; }
}

async function queue(sb: SupabaseClient, job: { template: JobTemplate; send_at: Date; dedupe_key: string; booking_id?: string; inquiry_id?: string; payload?: object }) {
  const { error } = await sb.from('email_jobs').upsert({ ...job, send_at: job.send_at.toISOString(), status: 'pending' }, { onConflict: 'dedupe_key', ignoreDuplicates: true });
  if (error) console.error('email job queue failed:', job.dedupe_key, error.message);
}

/** After a booking is confirmed: arrival guide 3 days before, review request the day after, one reminder. */
export async function scheduleBookingJourney(bookingId: string): Promise<void> {
  try {
    const sb = serviceClient();
    const { data: b } = await sb.from('bookings').select('id,guest_email,check_in,check_out,activity_date,category').eq('id', bookingId).maybeSingle();
    if (!b?.guest_email) return;
    const start = b.check_in || b.activity_date;
    const end = b.check_out || b.activity_date;
    const now = Date.now();
    if (start) {
      let at = istAt(addDays(start, -3), '09:00');
      // Booked at the last minute: send the guide now if the trip is still more than 20 hours away.
      if (at.getTime() < now && istAt(start, '09:00').getTime() - now > 20 * 3600e3) at = new Date(now + 5 * 60e3);
      if (at.getTime() > now) await queue(sb, { template: 'pre_arrival', send_at: at, dedupe_key: `pre_arrival:${b.id}`, booking_id: b.id });
    }
    if (end) {
      await queue(sb, { template: 'review_request', send_at: istAt(addDays(end, 1), '11:00'), dedupe_key: `review_request:${b.id}`, booking_id: b.id });
      if (b.category === 'hotel') await queue(sb, { template: 'review_reminder', send_at: istAt(addDays(end, 5), '11:00'), dedupe_key: `review_reminder:${b.id}`, booking_id: b.id });
    }
  } catch (e) { console.error('scheduleBookingJourney failed:', e); }
}

/** After an enquiry: one friendly follow-up two days later (skipped if they booked or we closed it). */
export async function scheduleEnquiryFollowUp(inquiryId: string): Promise<void> {
  try {
    await queue(serviceClient(), { template: 'enquiry_follow_up', send_at: new Date(Date.now() + 48 * 3600e3), dedupe_key: `enquiry_follow_up:${inquiryId}`, inquiry_id: inquiryId });
  } catch (e) { console.error('scheduleEnquiryFollowUp failed:', e); }
}

type Outcome = { send?: { to: string; built: Built; bookingId?: string; inquiryId?: string }; skip?: string };

async function prepare(sb: SupabaseClient, job: any): Promise<Outcome> {
  if (!(await automationOn(job.template, sb))) return { skip: 'automation switched off' };

  if (job.template === 'enquiry_follow_up') {
    const e = await loadEnquiryData(job.inquiry_id);
    if (!e?.email) return { skip: 'no email' };
    if (['converted', 'closed'].includes(e.status || '')) return { skip: 'enquiry ' + e.status };
    const since = e.created_at;
    const or = [e.email ? `guest_email.ilike.${e.email}` : '', e.phone ? `guest_phone.eq.${e.phone}` : ''].filter(Boolean).join(',');
    if (or) {
      const { count } = await sb.from('bookings').select('id', { count: 'exact', head: true }).or(or).gte('created_at', since);
      if (count) return { skip: 'guest has booked' };
    }
    return { send: { to: e.email, built: enquiryFollowUp(e), inquiryId: e.id } };
  }

  const b = await loadBookingData(job.booking_id);
  if (!b?.guest_email) return { skip: 'no booking email' };
  if (['cancelled', 'failed', 'no_show'].includes(b.status)) return { skip: 'booking ' + b.status };
  if (job.template === 'payment_reminder') {
    if (b.status !== 'pending' || ['paid', 'partially_paid', 'refunded'].includes(b.payment_status)) return { skip: 'no longer awaiting payment' };
    const link = await livePaymentLink((b as any).razorpay_link_id);
    if (!link) return { skip: 'payment link expired or not found' };
    return { send: { to: b.guest_email, built: paymentFailed({ ...b, payment_link: link }, job.payload?.why === 'failed' ? 'failed' : 'unpaid'), bookingId: b.id } };
  }
  const confirmed = b.status === 'confirmed' || b.status === 'completed' || b.payment_status === 'paid';
  if (!confirmed) return { skip: 'booking not confirmed' };

  if (job.template === 'pre_arrival') return { send: { to: b.guest_email, built: preArrival(b), bookingId: b.id } };
  if (job.template === 'review_request' || job.template === 'review_reminder') {
    if (job.template === 'review_reminder' && b.property_id && b.guest_phone) {
      const phone10 = String(b.guest_phone).replace(/\D/g, '').slice(-10);
      const { count } = await sb.from('hotel_reviews').select('id', { count: 'exact', head: true }).eq('property_id', b.property_id).eq('phone', phone10);
      if (count) return { skip: 'already reviewed' };
    }
    return { send: { to: b.guest_email, built: reviewRequest(b, job.template === 'review_reminder'), bookingId: b.id } };
  }
  return { skip: 'unknown template' };
}

/**
 * Online bookings still unpaid 45 minutes after they were made (abandoned checkout or a failed attempt):
 * one reminder with the live payment link. Razorpay failure webhooks call schedulePaymentReminder directly.
 */
export async function queueUnpaidReminders(sb: SupabaseClient = serviceClient()): Promise<number> {
  const from = new Date(Date.now() - 24 * 3600e3).toISOString(), to = new Date(Date.now() - 45 * 60e3).toISOString();
  const { data } = await sb.from('bookings').select('id').eq('status', 'pending').eq('payment_status', 'pending')
    .not('razorpay_link_id', 'is', null).not('guest_email', 'is', null).gte('created_at', from).lte('created_at', to).limit(50);
  for (const b of data || []) await queue(sb, { template: 'payment_reminder', send_at: new Date(), dedupe_key: `payment_reminder:${b.id}`, booking_id: b.id });
  return data?.length || 0;
}

export async function schedulePaymentReminder(bookingId: string, why: 'failed' | 'unpaid'): Promise<void> {
  try { await queue(serviceClient(), { template: 'payment_reminder', send_at: new Date(), dedupe_key: `payment_reminder:${bookingId}`, booking_id: bookingId, payload: { why } }); }
  catch (e) { console.error('schedulePaymentReminder failed:', e); }
}

/** Send every due job. Called by the cron route every 10 minutes. */
export async function runDueJobs(limit = 40): Promise<{ sent: number; skipped: number; failed: number }> {
  const sb = serviceClient();
  const res = { sent: 0, skipped: 0, failed: 0 };
  const { data: jobs, error } = await sb.from('email_jobs').select('*').eq('status', 'pending').lte('send_at', new Date().toISOString()).order('send_at').limit(limit);
  if (error) { console.error('runDueJobs load failed:', error.message); return res; }

  for (const job of jobs || []) {
    // Claim the job first so two overlapping runs can't both send it.
    const { data: claimed } = await sb.from('email_jobs').update({ attempts: job.attempts + 1, status: 'sending' }).eq('id', job.id).eq('status', 'pending').select('id');
    if (!claimed?.length) continue;
    try {
      const o = await prepare(sb, job);
      if (o.skip || !o.send) {
        await sb.from('email_jobs').update({ status: 'skipped', last_error: o.skip || null }).eq('id', job.id);
        res.skipped++;
        continue;
      }
      const r = await deliver({ to: o.send.to, subject: o.send.built.subject, doc: o.send.built.doc, kind: 'transactional', template: job.template, bookingId: o.send.bookingId, inquiryId: o.send.inquiryId });
      if (r.ok || r.status === 'skipped') {
        await sb.from('email_jobs').update({ status: r.ok ? 'sent' : 'skipped', sent_at: r.ok ? new Date().toISOString() : null, last_error: r.reason || null }).eq('id', job.id);
        r.ok ? res.sent++ : res.skipped++;
      } else {
        // Provider error: retry on the next runs, give up after 3 attempts.
        await sb.from('email_jobs').update({ status: job.attempts + 1 >= 3 ? 'failed' : 'pending', last_error: r.reason || 'send failed' }).eq('id', job.id);
        res.failed++;
      }
    } catch (e: any) {
      await sb.from('email_jobs').update({ status: job.attempts + 1 >= 3 ? 'failed' : 'pending', last_error: String(e?.message || e) }).eq('id', job.id);
      res.failed++;
    }
  }
  return res;
}
