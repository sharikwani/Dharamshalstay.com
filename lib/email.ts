import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');

const FROM = process.env.EMAIL_FROM || 'Dharamshala Stay <bookings@dharamshalastay.com>';

export async function sendBookingConfirmation(booking: {
  guest_name: string; guest_email: string; booking_ref: string;
  check_in?: string; check_out?: string; activity_date?: string;
  amount: number; category: string; room_name?: string;
  property_name?: string; paid_amount?: number;
}) {
  if (!booking.guest_email || !process.env.RESEND_API_KEY) return null;

  const dateInfo = booking.check_in
    ? booking.check_in + ' to ' + (booking.check_out || '')
    : booking.activity_date || '';

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1e3a5f;color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:24px">Booking Confirmed!</h1>
        <p style="margin:8px 0 0;opacity:0.8">Dharamshala Stay</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
        <p style="font-size:16px;color:#334155">Hi ${booking.guest_name},</p>
        <p style="color:#64748b">Your booking has been confirmed. Here are the details:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Reference</td><td style="padding:8px 0;font-weight:700;color:#1e3a5f">${booking.booking_ref}</td></tr>
          ${booking.property_name ? '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Property</td><td style="padding:8px 0;font-weight:600">' + booking.property_name + '</td></tr>' : ''}
          ${booking.room_name ? '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Room</td><td style="padding:8px 0">' + booking.room_name + '</td></tr>' : ''}
          <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Type</td><td style="padding:8px 0;text-transform:capitalize">${booking.category}</td></tr>
          ${dateInfo ? '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Dates</td><td style="padding:8px 0">' + dateInfo + '</td></tr>' : ''}
          <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Amount</td><td style="padding:8px 0;font-weight:700;color:#16a34a">Rs.${booking.amount.toLocaleString('en-IN')}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Payment</td><td style="padding:8px 0;color:#16a34a;font-weight:600">${booking.paid_amount ? 'Paid Rs.' + booking.paid_amount.toLocaleString('en-IN') : 'Pay at property'}</td></tr>
        </table>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;font-weight:600;color:#166534">What to bring:</p>
          <p style="margin:4px 0 0;color:#15803d;font-size:14px">Valid ID (Aadhaar/Passport/Driving License) and this booking reference.</p>
        </div>
        <p style="color:#64748b;font-size:14px">Questions? WhatsApp us at +91-98057-00665 or reply to this email.</p>
        <div style="text-align:center;margin-top:24px">
          <a href="https://dharamshalastay.com" style="background:#1e3a5f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Visit Dharamshala Stay</a>
        </div>
      </div>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: booking.guest_email,
      subject: 'Booking Confirmed - ' + booking.booking_ref + ' | Dharamshala Stay',
      html,
    });
    if (error) console.error('Email send error:', error);
    return data;
  } catch (err) {
    console.error('Email error:', err);
    return null;
  }
}

export async function sendAdminNotification(booking: {
  guest_name: string; guest_phone: string; guest_email?: string;
  booking_ref: string; category: string; amount: number;
  check_in?: string; check_out?: string; property_name?: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'hello@dharamshalastay.com';
  if (!process.env.RESEND_API_KEY) return null;

  try {
    return await resend.emails.send({
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
