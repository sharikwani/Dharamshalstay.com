import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError, serviceClient } from '@/lib/server-auth';
import { requireActivityPartner } from '@/lib/partners/load';
import { isAccountNumber, isIfsc, isPan, isUpi } from '@/lib/partners/validate';

const schema = z.object({
  legal_name: z.string().trim().min(2).max(200),
  business_name: z.string().trim().max(300).optional().default(''),
  phone: z.string().trim().min(10).max(20),
  pan_number: z.string().trim().toUpperCase(),
  business_registration_no: z.string().trim().max(100).optional().default(''),
  payout_method: z.enum(['bank', 'upi']),
  account_holder: z.string().trim().min(2).max(200),
  account_number: z.string().trim().optional().default(''),
  ifsc: z.string().trim().toUpperCase().optional().default(''),
  upi_id: z.string().trim().optional().default(''),
});

export async function PATCH(req: Request) {
  try {
    const { profile } = await requireActivityPartner(req, { editable: true });
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, 'Please fill in every required field.');
    const d = parsed.data;
    if (!isPan(d.pan_number)) throw new HttpError(400, 'PAN should look like ABCDE1234F.');
    if (d.payout_method === 'bank' && (!isAccountNumber(d.account_number) || !isIfsc(d.ifsc))) {
      throw new HttpError(400, 'Check the bank account number (9–18 digits) and IFSC (like SBIN0001234).');
    }
    if (d.payout_method === 'upi' && !isUpi(d.upi_id)) throw new HttpError(400, 'UPI ID should look like name@bank.');

    const payout_details = d.payout_method === 'bank'
      ? { account_holder: d.account_holder, account_number: d.account_number, ifsc: d.ifsc }
      : { account_holder: d.account_holder, upi_id: d.upi_id };
    const { error } = await serviceClient().from('profiles').update({
      legal_name: d.legal_name, business_name: d.business_name, phone: d.phone, pan_number: d.pan_number,
      business_registration_no: d.business_registration_no || null, payout_method: d.payout_method, payout_details,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
