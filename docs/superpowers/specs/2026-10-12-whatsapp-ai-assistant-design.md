# WhatsApp AI Assistant

Date: 2026-10-12
Status: design approved by owner in chat ("yes"); spec awaiting owner review
Related: `2026-10-10-whatsapp-booking-alerts-design.md`

## 1. Goal

Customers who tap the WhatsApp button on the website chat with the Dharamshala
Stay business number and get fast, warm, accurate answers from an AI
assistant, any time of day. The assistant answers questions from live site
data, collects booking requests as enquiries for the team to confirm, and
hands the chat to the owner whenever a person is needed. The owner sees every
chat in an admin inbox and can take over at any moment.

## 2. Decisions

| Topic | Decision |
|---|---|
| Number | The Cloud API number **+1 929-525-5894** (phone number id in `WHATSAPP_PHONE_NUMBER_ID`). The website WhatsApp button points to it. The owner's Indian number +91 98057 00665 stays a normal WhatsApp and gets no AI. |
| AI provider | OpenAI Chat Completions with tool calling, using the existing `OPENAI_API_KEY`. Model from `OPENAI_CHAT_MODEL`, default `gpt-4o`. Voice notes transcribed with OpenAI audio transcription. |
| What the AI may do | Answer questions; look up live data; create an enquiry; hand over to a human. It **may not** confirm bookings or availability, quote prices not in the data, offer discounts, or promise refunds. |
| Booking requests | Collected in chat, saved to `inquiries`, owner emailed. Customer told the team will confirm availability shortly. |
| Takeover | Admin inbox page with live chats, reply box, **Take over** / **Hand back to AI**. AI auto-hands-over (and emails the owner) on complaints, refunds, cancellation of paid bookings, abuse/anger, explicit request for a person, media it cannot read, or low confidence. |
| Honesty | Natural, human tone, but never claims to be a human. If asked, it says it is Dharamshala Stay's assistant and that a team member can join. Required by WhatsApp Business policy (business-specific assistants only). |
| Cost guard | Max 20 AI replies per customer per hour and 200 per day overall (configurable); beyond that the chat is handed to the owner. |

## 3. Conversation flow

1. Meta posts an inbound message to the existing `/api/whatsapp/webhook`
   (signature already verified there).
2. The webhook stores it in `whatsapp_chat_messages`, upserts the
   `whatsapp_conversations` row (phone, profile name, `last_customer_at`),
   marks it read and shows the typing indicator, then returns 200 at once.
   Processing continues in the background (`waitUntil` from
   `@vercel/functions`; route `maxDuration = 60`).
3. **Debounce:** the background task waits ~4 s. If a newer customer message
   arrived for the same conversation, it stops; the newer task answers all
   unanswered messages together.
4. If AI mode does not allow this number (section 10), or the conversation
   is paused (human took over) or in `needs_human`, no AI reply. Otherwise the assistant runs (section 4) and its reply is sent as a
   free-form text message (allowed and free within the 24-hour customer
   service window) and stored.
5. Status webhooks for these messages update their delivery status, as for
   templates today.

Non-text input:
- **Voice note** → download media, transcribe, treat as text (stored with a
  "voice note" marker).
- **Image / document / video / sticker / location / contacts** → stored as a
  placeholder ("[photo]", etc.); conversation handed to the owner with a short
  holding reply ("Thanks! A team member will look at this and reply shortly.").
- **Button replies** keep their existing partner Accept / Can't-do-it handling
  and never reach the AI.
- Messages from numbers that are current partner/staff recipients of booking
  alerts are still answered by the AI unless they are button replies.

## 4. The assistant

**System prompt** (in code, reviewed like any copy):
- Persona: Dharamshala Stay's travel desk in Dharamshala/McLeod Ganj. Warm,
  polite, concise; 1–4 short sentences or a short list; mirrors the
  customer's language (English, Hindi, Hinglish); uses the customer's name
  when known; at most one emoji, only when natural.
- Facts only from tools and the business summary; if unsure, say so and offer
  a team member.
- Hard rules from section 2 (no confirmations, no invented prices, no
  discounts, honest about being an assistant, hand over on the listed
  triggers).
- Business summary: what Dharamshala Stay offers, areas covered, office
  hours, payment options, cancellation policy summary, website links.

**Context sent each turn:** system prompt + the last 20 messages of the
conversation (customer, AI and admin messages, admin ones labelled so the AI
keeps continuity after a takeover).

**Tools** (server functions; read with the service-role client, published or
active rows only, no partner/guest private data):
| Tool | Returns |
|---|---|
| `search_hotels(area?, budget_max?, guests?, query?)` | Up to 6 hotels: name, area, type, star rating, price range, short description, page link. |
| `get_hotel(slug_or_name)` | Rooms (name, base price, max guests, meal-plan rates), check-in/out times, key amenities, policies, page link. |
| `list_taxi_routes(from?, to?)` | Matching routes with vehicle types and fares, page link. |
| `list_treks(query?)` / `get_trek(slug_or_name)` | Trek summaries / details (duration, difficulty, price, inclusions), page link. |
| `list_paragliding()` | Packages with price, duration, inclusions, page link. |
| `create_enquiry({type, name, phone, check_in?, check_out?, guests?, item?, pickup?, drop?, notes})` | Saves to `inquiries` (`source='whatsapp'`, linked to the conversation; phone defaults to the WhatsApp number), emails the owner. Returns the enquiry id. |
| `handover({reason})` | Sets conversation `needs_human`, pauses AI, emails the owner with the reason and last messages. |

Tool loop capped at 5 calls per turn. If OpenAI fails or times out, the
customer gets one polite holding message and the chat is handed over.

## 5. Data (migration v19)

`whatsapp_conversations`
- `id`, `phone` (unique, normalised wa_id), `profile_name`, `status`
  (`ai` | `human` | `needs_human` | `closed`), `handover_reason`,
  `last_customer_at`, `last_message_at`, `unread_admin` (int),
  `created_at`, `updated_at`.

`whatsapp_chat_messages`
- `id`, `conversation_id`, `direction` (`in` | `out`), `author`
  (`customer` | `ai` | `admin`), `body`, `kind` (`text` | `voice` | `media`
  | `system`), `wa_message_id` (unique), `status` (`received` | `sent` |
  `delivered` | `read` | `failed`), `error`, `admin_id`, `created_at`.

`inquiries`: add `source` (default `'website'`) and `whatsapp_conversation_id`.

`whatsapp_settings`: single row (`ai_mode`, `test_numbers`, `updated_at`).

RLS: all new tables admin-read only; all writes through the service role.

## 6. Admin inbox (`/admin/whatsapp`)

- Left: conversations, newest first, with name/phone, last message preview,
  time, status badge (AI / You / Needs you), unread count. Filter: all /
  needs you.
- Right: the thread (customer left; AI and admin right, labelled), linked
  enquiries, reply box, **Take over** / **Hand back to AI**, **Close**.
- Sending from the inbox sends a free-form message within 24 h of the
  customer's last message; outside that window the box is disabled with an
  explanation (a template would be needed).
- Sending a reply automatically switches the conversation to `human`.
- Refreshes every 5 s while open. Nav link with a "needs you" count.
- Settings panel: AI mode (Off / Test / On) and test numbers.
- API: `GET /api/admin/whatsapp/conversations`, `GET .../[id]`,
  `POST .../[id]/messages`, `PATCH .../[id]` (status). All `requireCaller(['admin'])`.

## 7. Website button

`WhatsAppButton` and the "Chat on WhatsApp" CTAs switch to the AI number
`19295255894` (`siteConfig.whatsappAi`) in the follow-up deploy of rollout
step 3. Phone/call links
and the contact page keep showing the Indian number.

## 8. Safety and abuse

- Rate limits from section 2; over the limit → handover.
- Inbound text truncated to 2,000 chars; history to the last 20 messages.
- Prompt-injection resistance: tool results and customer text are data; the
  rules are restated after history; tools cannot read bookings, partner
  details, or anything private; `create_enquiry` only writes a new row.
- No AI reply to: group messages, our own echoes, messages older than 24 h
  (Meta retries), duplicate `wa_message_id` (idempotent insert).

## 9. Testing

- Unit: message parsing (text, voice, media, buttons), debounce decision,
  rate limiting, tool functions against mocked Supabase, the tool loop with a
  mocked OpenAI, handover triggers, inbox API auth.
- Manual on production with the owner's phone: greeting, hotel question,
  taxi fare, booking request → enquiry + email, "talk to a human" →
  handover, admin takeover and reply, voice note.

## 10. Rollout

The AI is switched by a setting the owner controls in the inbox (no Vercel
changes needed): `whatsapp_settings` single row with `ai_mode`
(`off` | `test` | `on`) and `test_numbers` (text[]).
- `off`: messages are stored and shown in the inbox; owner emailed for each
  new chat; no AI replies.
- `test`: AI replies only to numbers in `test_numbers`.
- `on`: AI replies to everyone.

1. Owner runs migration v19 in Supabase (creates the tables and the settings
   row in `test` mode with the owner's number +91 98057 00665).
2. Deploy. Owner tests from their phone against the +1 929 number.
3. Owner switches to `on` in the inbox, then a small follow-up deploy points
   the website button at the AI number (pages are static, so the button
   cannot follow the setting live).

## 11. Out of scope

Payments or confirmed bookings in chat, outbound marketing, template
follow-ups after 24 h, multiple admin users with assignment, Hindi-only
templates.
