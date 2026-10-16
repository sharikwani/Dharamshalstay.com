# Dharamshala Stay - working rules for Claude

Next.js 14 (App Router) + Supabase + Vercel. Local travel and hotel guide for Dharamshala / McLeod Ganj.

## Owner's standing rules
- Never push or deploy until the owner says "push". Commit locally, then wait.
- Check what already exists before creating anything external (GSC/Bing properties, Meta templates, webhooks, accounts).
- Never submit test enquiries or bookings on the live site: they send real alerts to hotels and the owner.
- Anything that messages real people (WhatsApp, email, social posts) needs the owner's OK first.
- Supabase migrations are run by the owner in the SQL editor (`supabase/migration-vNN-*.sql`). Never put secrets in committed SQL.

## Choosing the model for a job (save usage)
Use the cheapest model that can do the job well. Subagents in `.claude/agents/` have sensible defaults; override with the `model` parameter when a task is clearly easier or harder than usual.

| Job | Model | Agent |
|---|---|---|
| Find files, count, list, read a value, check status, reformat | **haiku** | quick-helper |
| Review social drafts against rules | **haiku** | social-editor |
| Web research (hotel contacts, listing facts), fact re-checks, SEO audits | **sonnet** | hotel-researcher, fact-checker, seo-auditor |
| Routine code edits in a known pattern, small content fixes | **sonnet** | (general-purpose with model: sonnet) |
| New guides, major rewrites, brand copy readers judge on quality | **opus** | content-writer |
| Architecture, tricky bugs, security, payments, anything risky | **opus** | (main session or Plan agent) |

Rules of thumb:
- Mechanical and checkable -> haiku. Needs judgement or web research -> sonnet. Quality writing, design or high stakes -> opus.
- Run independent research in parallel (several agents in one message), each with a tight brief.
- Agents never push, deploy or message anyone; the main session checks their output first.
- If a cheaper agent reports the task needs judgement, re-run it one level up instead of accepting a weak result.

## Conventions
- Edit files with line endings preserved (many files are CRLF). Avoid apostrophes inside single-quoted TS strings.
- Emails go through `lib/email/send.ts` `deliver()` (logging, consent, suppression). Marketing only to contacts with consent.
- Social posts: `lib/social/*`; slides render at `/social/card.jpg`. Only our own or properly licensed photos, with credits.
- Facts: `data/facts.ts` and `data/travel-updates.ts` are the verified source; keep `verified` dates current.
- Run `npx tsc --noEmit -p .` and `npx vitest run` before committing.
