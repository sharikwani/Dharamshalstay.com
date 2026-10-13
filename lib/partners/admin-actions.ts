export type AdminAction =
  | { action: 'approve_doc' | 'reject_doc'; document_id: string; reason?: string }
  | { action: 'verify' }
  | { action: 'request_changes' | 'reject' | 'suspend'; note: string }
  | { action: 'reinstate' }
  | { action: 'set_commission'; commission_pct: number };

export function canVerify(state: {
  documents: { status: string }[];
  agreements: { signed_at?: string | null }[];
  missing: { key: string }[];
  profile?: { submitted_at?: string | null };
}): string | null {
  if (state.missing.some((m) => m.key !== 'agreement')) return 'The partner\'s checklist is incomplete.';
  if (!state.agreements.length) return 'The partner has not signed the agreement.';
  // The sign route sets submitted_at to the signature's signed_at. Only older signatures means the latest
  // submission's signing was interrupted, so there is no current signature to verify against.
  const submitted = state.profile?.submitted_at ? Date.parse(state.profile.submitted_at) : NaN;
  if (!Number.isNaN(submitted) && !state.agreements.some((a) => !!a.signed_at && Date.parse(a.signed_at) >= submitted)) {
    return 'The partner has not signed the agreement for their latest submission.';
  }
  if (!state.documents.length || state.documents.some((d) => d.status !== 'approved')) return 'Approve every document before verifying.';
  return null;
}
