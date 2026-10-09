export type AdminAction =
  | { action: 'approve_doc' | 'reject_doc'; document_id: string; reason?: string }
  | { action: 'verify' }
  | { action: 'request_changes' | 'reject' | 'suspend'; note: string }
  | { action: 'reinstate' }
  | { action: 'set_commission'; commission_pct: number };

export function canVerify(state: { documents: { status: string }[]; agreements: unknown[]; missing: { key: string }[] }): string | null {
  if (state.missing.some((m) => m.key !== 'agreement')) return 'The partner\'s checklist is incomplete.';
  if (!state.agreements.length) return 'The partner has not signed the agreement.';
  if (!state.documents.length || state.documents.some((d) => d.status !== 'approved')) return 'Approve every document before verifying.';
  return null;
}
