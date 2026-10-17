import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, requireCaller } from '@/lib/server-auth';
import { couponState } from '@/lib/retention/rules';
import { listCoupons, listRetention, markRefundDone, setCouponStatus } from '@/lib/retention/store';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/** Bookings kept instead of cancelled: the offers made, coupons issued and refunds to send. */
export async function GET(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const [coupons, offers] = await Promise.all([listCoupons(), listRetention()]);
    const t = today();
    return NextResponse.json({
      coupons: coupons.map((c) => ({ ...c, state: couponState(c, c.booking_status, t) })),
      offers,
    });
  } catch (e) { return jsonError(e); }
}

const schema = z.object({
  action: z.enum(['coupon_used', 'coupon_void', 'coupon_free', 'refund_done']),
  id: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    await requireCaller(req, ['admin']);
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new HttpError(400, 'Invalid request');
    const { action, id } = body.data;
    if (action === 'refund_done') {
      if (!(await markRefundDone(id))) throw new HttpError(409, 'This refund is already marked done');
    } else {
      await setCouponStatus(id, action === 'coupon_used' ? 'used' : action === 'coupon_void' ? 'void' : 'issued');
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
