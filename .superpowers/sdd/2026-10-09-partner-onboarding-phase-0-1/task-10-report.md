# Task 10 report
Implemented per brief verbatim: agreement.ts, agreement-pdf.ts, emails.ts, POST /api/partner/agreement, sendEmail + adminEmail in lib/email.ts, tests, pdf-lib@1.17.1. Also app/api/partner/onboarding/route.ts (ruling R3, Task 9 Step 3).
Tests: tests/partners/agreement.test.ts 4/4; full suite 51/51; tsc clean. Tests touch only pure functions (no Resend).
Note: lib/email.ts has older functions with local `const adminEmail = ...` (shadowing the new exported fn within them; harmless). New module-level ADMIN_TO added since no module-level constant existed.

## Fix round 1 (R11)
- Migration: removed UNIQUE (partner_id, version); added idx_partner_agreements_partner(partner_id, signed_at DESC). Route now uses .insert (append-only) with updated comment.
- Added clientIp(req) in lib/server-auth.ts (x-vercel-forwarded-for, x-real-ip, last x-forwarded-for, 'unknown'); route uses it; unit test added.
- Command: npx tsc --noEmit && npm test -> clean; 52/52 passing.
