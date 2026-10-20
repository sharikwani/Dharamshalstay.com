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

## Every piece of content is SEO + AEO + GEO (owner's rule, always)
Blog posts, guides, landing pages, FAQs and page copy must do all three, every time:
- **SEO:** one clear search intent per page; the main keyword in title, meta_title (under 60 chars), H1/first line and one H2; meta_description under 155 chars that leads with the answer; descriptive slug; internal links to 3+ related guides and to the booking pages (hotels, taxis, treks); real photos with descriptive alt text.
- **AEO (answer engines, featured snippets, voice):** open with a bold **Short answer:** of 2-4 sentences; question-style H2s; a quick-facts table (dates, timings, location, entry fee, how to reach); 5-8 FAQs (the `faqs` field becomes FAQPage schema) with direct answers that make sense on their own.
- **GEO (ChatGPT, Copilot, Perplexity, Gemini citing us):** specific, checkable facts with dates and numbers; name places precisely (ground, road, distance from McLeod Ganj / Kotwali Bazaar); say what is confirmed and what is not; a `sources` list of official and news sources; current year in title and dates; `updated_at` kept fresh.
- Photos: only our own or freely licensed (Wikimedia Commons), self-hosted in `public/images/places` with credits in `data/photo-credits.ts`.
- Sitemap always complete (owner rule): every new public page goes in `lib/sitemap-entries.ts` (`tests/sitemap-coverage.test.ts` fails otherwise); after a push, submit new/changed URLs with `node scripts/indexnow-submit.mjs <urls>`.
- Run `npx tsc --noEmit -p .` and `npx vitest run` before committing.
