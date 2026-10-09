import { createHash } from 'node:crypto';
import type { ActivityPartnerType } from './types';

// IMPORTANT: draft text. Have a lawyer review before real partners sign.
// Changing the wording requires a new AGREEMENT_VERSION.
export const AGREEMENT_VERSION = '2026-10-v1';

const SERVICE: Record<ActivityPartnerType, string> = {
  paragliding: 'tandem and other paragliding flights, including pilots, equipment and transport to and from the take-off site where included in a package',
  taxi: 'taxi and cab services, including airport and station transfers, local sightseeing and outstation trips, with the vehicles and drivers registered on the Platform',
  trek: 'guided treks, camping and related travel services, including guides, permits, food and equipment where included in a package',
};

const SAFETY: Record<ActivityPartnerType, string> = {
  paragliding: 'Every flight is flown by a pilot holding a valid licence or certificate, using maintained equipment, from a site and under conditions permitted by the authorities. You hold valid registration with the Himachal Pradesh tourism department and third-party/passenger insurance as required by law, and you will cancel flights when weather is unsafe.',
  taxi: 'Every vehicle is commercially registered with a valid taxi permit, fitness certificate and insurance, and every driver holds a valid driving licence and is fit to drive. You follow traffic laws, do not overload vehicles and do not let drivers work under the influence of alcohol or drugs.',
  trek: 'Every trek is led by competent guides, follows forest department and district rules, carries first aid, and is cancelled or turned back when weather or trail conditions are unsafe. You hold the registrations and permits required to operate treks in Himachal Pradesh.',
};

export function agreementFor(type: ActivityPartnerType) {
  const title = 'Dharamshala Stay Partner Agreement';
  const body = `This Partner Agreement ("Agreement") is between Dharamshala Stay ("Dharamshala Stay", "we", "us"), operator of the website dharamshalastay.com (the "Platform"), and the person or business signing below ("Partner", "you").

1. Services
You will provide ${SERVICE[type]} ("Services") to customers who book through the Platform. You are an independent business. Nothing in this Agreement makes you our employee, agent or partner in law.

2. Verification
You confirm that every document and detail you have given us, including your identity documents (Aadhaar, shown masked, and PAN), licences, registrations, vehicle documents and bank or UPI details, is true, current and belongs to you or your business. You will tell us within 7 days if any of them changes, expires or is cancelled. We may suspend your account while documents are missing or expired.

3. Commission
For every booking made through the Platform, Dharamshala Stay earns a commission of 20% of the booking value (the price paid by the customer, before any payment-gateway fee and excluding any taxes we collect separately), unless we agree a different rate with you in writing. Commission is earned on every booking whether the customer pays online or pays you in cash or by UPI directly.

4. Online payments
When a customer pays online, we receive the full amount. After the Service is completed, we credit 80% of the booking value to your Partner balance. We pay positive balances to your registered bank account or UPI ID every week, normally on Monday, after deducting any commission you owe us. Payment-gateway charges are borne by Dharamshala Stay.

5. Cash and direct payments
When a customer pays you directly (cash, UPI to you, or any other method), you collect the full amount and owe us the 20% commission. The commission is recorded in your Partner balance when the Service is completed. It is first deducted from money we owe you. Any amount still owed must be paid through the Platform within 7 days. If commission stays unpaid for more than 21 days, we may stop sending you new bookings until it is paid, and recover the amount by other lawful means.

6. Bookings taken off the Platform
You will not ask customers who found you through the Platform to cancel and re-book with you directly to avoid commission. A booking arranged with a customer introduced by the Platform within 90 days of their enquiry or booking is treated as a Platform booking.

7. Prices and availability
You set your package prices on the Platform and must honour the price shown at the time of booking. You will keep your availability up to date, accept or decline booking requests promptly, and not charge customers extra amounts that were not shown at booking, except for optional extras the customer clearly agrees to.

8. Safety, licences and insurance
${SAFETY[type]} You are solely responsible for the safety of customers during the Services and for any loss or injury caused by you, your staff, your vehicles or your equipment.

9. Cancellations and refunds
Customers may cancel under the policy shown at the time of booking. If you cancel a confirmed booking or fail to provide the Service, the customer is refunded in full and any amount credited to you for that booking is reversed. Repeated cancellations or no-shows may lead to suspension.

10. Customer data
You will use customer names, phone numbers and other details only to provide the booked Service, keep them confidential, and not use them for marketing or share them with anyone else. You will follow the Digital Personal Data Protection Act, 2023 and other applicable law.

11. Reviews and conduct
Customers may review your Services on the Platform. You will not post fake reviews or pressure customers about reviews. You will treat customers respectfully and will not discriminate against them.

12. Taxes
You are responsible for your own income tax, GST and other taxes on the Services. We will provide statements of bookings, commission and payouts to help you.

13. Liability
Dharamshala Stay provides the booking platform only and is not liable for the Services you provide. You will compensate Dharamshala Stay for any claim, penalty or loss arising from your Services, your breach of this Agreement or your breach of law. Our total liability to you under this Agreement is limited to the commission we earned from your bookings in the 3 months before the claim.

14. Suspension and termination
Either party may end this Agreement with 15 days' written notice by email. We may suspend or end it immediately for fraud, safety risk, false documents, unpaid commission or serious customer complaints. Amounts owed by either party up to the end date remain payable.

15. Changes
We may update this Agreement. We will tell you by email and on the Platform at least 15 days before changes take effect; continuing to accept bookings after that date means you accept the updated Agreement.

16. Law and disputes
This Agreement is governed by the laws of India. The courts at Dharamshala, Himachal Pradesh have exclusive jurisdiction.

17. Electronic signature
By ticking the acceptance box and typing your full name, you sign this Agreement electronically under the Information Technology Act, 2000. We record the date, time, IP address and a fingerprint (SHA-256) of this exact text, and email you a PDF copy.

Agreement version: ${AGREEMENT_VERSION}`;
  return { version: AGREEMENT_VERSION, title, body };
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
