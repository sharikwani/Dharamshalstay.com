import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY || '');
  return _resend;
}

const FROM = process.env.EMAIL_FROM || 'Dharamshala Stay <bookings@dharamshalastay.com>';

const ADMIN_TO = process.env.ADMIN_EMAIL || 'hello@dharamshalastay.com';
export const adminEmail = () => ADMIN_TO;

export async function sendEmail(msg: { to: string | string[]; subject: string; html: string; attachments?: { filename: string; content: Buffer }[] }): Promise<void> {
  if (!process.env.RESEND_API_KEY) { console.log('[email skipped: no RESEND_API_KEY]', msg.subject); return; }
  const { error } = await getResend().emails.send({ from: FROM, to: msg.to, subject: msg.subject, html: msg.html, attachments: msg.attachments });
  if (error) console.error('Email failed:', msg.subject, error);
}

type BookingEmailInput = {
  guest_name: string; guest_email: string; booking_ref: string;
  check_in?: string; check_out?: string; activity_date?: string;
  amount: number; category: string; room_name?: string;
  property_name?: string; paid_amount?: number;
  payment_method?: string | null; payment_status?: string | null;
};

type BookingEmailText = { heading: string; intro: (b: BookingEmailInput) => string; subject: string; payment: (b: BookingEmailInput) => string };

async function sendBookingEmail(booking: BookingEmailInput, t: BookingEmailText) {
  if (!booking.guest_email || !process.env.RESEND_API_KEY) return null;

  const dateInfo = booking.check_in
    ? booking.check_in + ' to ' + (booking.check_out || '')
    : booking.activity_date || '';

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1e3a5f;color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:24px">${t.heading}</h1>
        <p style="margin:8px 0 0;opacity:0.8">Dharamshala Stay</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
        <p style="font-size:16px;color:#334155">Hi ${escHtml(booking.guest_name)},</p>
        <p style="color:#64748b">${t.intro(booking)}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Reference</td><td style="padding:8px 0;font-weight:700;color:#1e3a5f">${escHtml(booking.booking_ref)}</td></tr>
          ${booking.property_name ? '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Property</td><td style="padding:8px 0;font-weight:600">' + escHtml(booking.property_name) + '</td></tr>' : ''}
          ${booking.room_name ? '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Room</td><td style="padding:8px 0">' + escHtml(booking.room_name) + '</td></tr>' : ''}
          <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Type</td><td style="padding:8px 0;text-transform:capitalize">${booking.category}</td></tr>
          ${dateInfo ? '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Dates</td><td style="padding:8px 0">' + dateInfo + '</td></tr>' : ''}
          <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Amount</td><td style="padding:8px 0;font-weight:700;color:#16a34a">Rs.${booking.amount.toLocaleString('en-IN')}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Payment</td><td style="padding:8px 0;color:#16a34a;font-weight:600">${t.payment(booking)}</td></tr>
        </table>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;font-weight:600;color:#166534">What to bring:</p>
          <p style="margin:4px 0 0;color:#15803d;font-size:14px">Valid ID (Aadhaar/Passport/Driving License) and this booking reference.</p>
        </div>
        <p style="color:#64748b;font-size:14px">Questions? WhatsApp us at +1 929-525-5894 or reply to this email.</p>
        <div style="text-align:center;margin-top:24px">
          <a href="https://dharamshalastay.com" style="background:#1e3a5f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Visit Dharamshala Stay</a>
        </div>
      </div>
    </div>
  `;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to: booking.guest_email,
      subject: t.subject,
      html,
    });
    if (error) console.error('Email send error:', error);
    return data;
  } catch (err) {
    console.error('Email error:', err);
    return null;
  }
}

/** The confirmation's payment row: an unpaid online booking (e.g. confirmed by the admin before payment) must not say "Pay at property". */
export function confirmedPaymentText(b: Pick<BookingEmailInput, 'amount' | 'paid_amount' | 'payment_method' | 'payment_status'>): string {
  if (b.paid_amount) return 'Paid Rs.' + b.paid_amount.toLocaleString('en-IN');
  if (b.payment_method === 'online') return b.payment_status === 'paid' ? 'Paid Rs.' + b.amount.toLocaleString('en-IN') : 'Online payment pending';
  return 'Pay at property';
}

export const sendBookingConfirmation = (booking: BookingEmailInput) => sendBookingEmail(booking, {
  heading: 'Booking Confirmed!',
  intro: () => 'Your booking has been confirmed. Here are the details:',
  subject: 'Booking Confirmed - ' + booking.booking_ref + ' | Dharamshala Stay',
  payment: confirmedPaymentText,
});

/** Pay-later bookings: the hotel has not confirmed yet, so say so honestly. Never throws. */
export const sendBookingRequestReceived = (booking: BookingEmailInput) => sendBookingEmail(booking, {
  heading: 'Booking Request Received',
  intro: (b) => `Thank you! We've received your booking request. ${b.category === 'hotel' ? 'The hotel' : 'Our team'} will confirm it shortly, and we'll send you a confirmation by email and WhatsApp.`,
  subject: 'Booking Request Received - ' + booking.booking_ref + ' | Dharamshala Stay',
  payment: () => 'Pay at property',
});

export async function sendAdminNotification(booking: {
  guest_name: string; guest_phone: string; guest_email?: string;
  booking_ref: string; category: string; amount: number;
  check_in?: string; check_out?: string; property_name?: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'hello@dharamshalastay.com';
  if (!process.env.RESEND_API_KEY) return null;

  try {
    return await getResend().emails.send({
      from: FROM,
      to: adminEmail,
      subject: 'New Booking: ' + booking.booking_ref + ' - ' + booking.guest_name,
      html: `
        <h2>New ${booking.category} Booking</h2>
        <p><strong>Ref:</strong> ${booking.booking_ref}</p>
        <p><strong>Guest:</strong> ${booking.guest_name} (${booking.guest_phone})</p>
        ${booking.guest_email ? '<p><strong>Email:</strong> ' + booking.guest_email + '</p>' : ''}
        ${booking.property_name ? '<p><strong>Property:</strong> ' + booking.property_name + '</p>' : ''}
        <p><strong>Amount:</strong> Rs.${booking.amount}</p>
        ${booking.check_in ? '<p><strong>Dates:</strong> ' + booking.check_in + ' to ' + (booking.check_out || '') + '</p>' : ''}
        <p><a href="https://dharamshalastay.com/admin/bookings">View in Admin Panel</a></p>
      `,
    });
  } catch (err) {
    console.error('Admin email error:', err);
    return null;
  }
}

const escHtml = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Tells the admin a partner has submitted (or resubmitted) a listing for approval. */
export async function sendPropertySubmittedNotification(p: {
  id: string; name: string; type?: string; destination_slug?: string; city?: string;
  contact_name?: string; contact_phone?: string; contact_email?: string; resubmitted?: boolean;
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'hello@dharamshalastay.com';
  if (!process.env.RESEND_API_KEY) return null;
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dharamshalastay.com';

  try {
    return await getResend().emails.send({
      from: FROM,
      to: adminEmail,
      subject: (p.resubmitted ? 'Listing resubmitted: ' : 'New listing to approve: ') + p.name,
      html: `
        <h2>${p.resubmitted ? 'A partner resubmitted a listing' : 'A partner submitted a new listing'}</h2>
        <p><strong>Property:</strong> ${escHtml(p.name)} (${escHtml(p.type || 'hotel')})</p>
        <p><strong>Area:</strong> ${escHtml(p.destination_slug || p.city || '-')}</p>
        <p><strong>Contact:</strong> ${escHtml(p.contact_name || '-')} · ${escHtml(p.contact_phone || '-')} · ${escHtml(p.contact_email || '-')}</p>
        <p><a href="${site}/admin/approvals/${encodeURIComponent(p.id)}">Review it in the admin panel</a></p>
      `,
    });
  } catch (err) {
    console.error('Property submitted email error:', err);
    return null;
  }
}
