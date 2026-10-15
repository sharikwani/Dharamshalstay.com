import { createHmac, timingSafeEqual } from 'node:crypto';

const API = 'https://api.razorpay.com/v1';

/** Razorpay takes the payment when both API keys are set (live keys start rzp_live_). */
export function razorpayEnabled(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Online payment is on when Razorpay or Stripe is set up. */
export function onlinePaymentEnabled(): boolean {
  return razorpayEnabled() || !!process.env.STRIPE_SECRET_KEY;
}

export class RazorpayError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** One call to the Razorpay REST API with the account's key id and secret. */
export async function razorpay<T = any>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new RazorpayError(data?.error?.description || `Razorpay HTTP ${res.status}`, res.status);
  return data as T;
}

function hmacMatches(payload: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(createHmac('sha256', secret).update(payload).digest('hex'));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** The X-Razorpay-Signature of a webhook: an HMAC of the raw body with the webhook secret set in the Razorpay dashboard. */
export function webhookSignatureValid(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  return !!(secret && signature && hmacMatches(rawBody, signature, secret));
}
