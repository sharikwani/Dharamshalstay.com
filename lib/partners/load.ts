import { HttpError, requireCaller, serviceClient, type Caller } from '@/lib/server-auth';
import { ACTIVITY_PARTNER_TYPES, EDITABLE_STATUSES, type ActivityPartnerType, type PartnerStatus } from './types';
import { latestDocs, missingItems, readyToSign, type OnboardingInput } from './requirements';

export const KYC_BUCKET = 'partner-kyc';
const SIGNED_URL_SECONDS = 300;

export function assertEditable(status: string | null): void {
  if (!status || !EDITABLE_STATUSES.includes(status as PartnerStatus)) {
    throw new HttpError(409, 'Your details are being reviewed or are already approved, so they cannot be changed now. Contact us if something is wrong.');
  }
}

export async function requireActivityPartner(req: Request, opts: { editable?: boolean } = {}): Promise<Caller> {
  const caller = await requireCaller(req, ['partner']);
  if (!ACTIVITY_PARTNER_TYPES.includes(caller.profile.partner_type)) throw new HttpError(403, 'This page is for paragliding, taxi and trek partners');
  if (opts.editable) assertEditable(caller.profile.partner_status);
  return caller;
}

export async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await serviceClient().storage.from(KYC_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  return data?.signedUrl || null;
}

export async function loadOnboarding(partnerId: string) {
  const sb = serviceClient();
  const [{ data: profile }, { data: documents }, { data: staff }, { data: vehicles }, { data: agreements }] = await Promise.all([
    sb.from('profiles').select('id, email, full_name, phone, business_name, legal_name, pan_number, business_registration_no, partner_type, partner_status, commission_pct, payout_method, payout_details, submitted_at, verified_at, verification_note, created_at').eq('id', partnerId).single(),
    sb.from('partner_documents').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false }),
    sb.from('partner_staff').select('*').eq('partner_id', partnerId).order('created_at'),
    sb.from('vehicles').select('*').eq('partner_id', partnerId).order('created_at'),
    sb.from('partner_agreements').select('id, version, body_sha256, signed_name, signed_at, ip, pdf_path').eq('partner_id', partnerId).order('signed_at', { ascending: false }),
  ]);
  if (!profile) throw new HttpError(404, 'Partner not found');

  const input: OnboardingInput = {
    partner_type: profile.partner_type as ActivityPartnerType,
    legal_name: profile.legal_name, phone: profile.phone, pan_number: profile.pan_number,
    payout_method: profile.payout_method, payout_details: profile.payout_details,
    documents: documents || [], staff: staff || [], vehicles: vehicles || [],
    agreementSigned: (agreements || []).length > 0,
  };
  const current = latestDocs(documents || []);
  const docsWithUrls = await Promise.all(current.map(async (d: any) => ({ ...d, url: await signedUrl(d.storage_path) })));
  const agreementsWithUrls = await Promise.all((agreements || []).map(async (a: any) => ({ ...a, url: await signedUrl(a.pdf_path) })));
  return {
    profile, documents: docsWithUrls, staff: staff || [], vehicles: vehicles || [], agreements: agreementsWithUrls,
    missing: missingItems(input), readyToSign: readyToSign(input),
  };
}
