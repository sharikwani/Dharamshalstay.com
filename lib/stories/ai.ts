/**
 * AI help for stories. It only advises: a score and notes for the owner's queue, a short Instagram caption,
 * and a safety check on comments and prayer flags. The owner approves and features every story.
 */
import { hasContactInfo } from './rules';

const KEY = () => process.env.OPENAI_API_KEY;

export type Screening = { score: number; notes: string; flags: string[]; caption: string };

const SCREEN_PROMPT = `You help the owner of Dharamshala Stay (a local travel guide for Dharamshala and McLeod Ganj, India) choose a "Story of the day" from stories sent in by travellers and locals.
Judge the story and its photos and reply in JSON only:
{"score": 0-100, "notes": "one or two plain sentences for the owner", "flags": [..], "caption": "..."}
Score high for: a real, personal, specific experience in the area; warmth or surprise; a clear sense of place; good, original photos.
Score low for: generic text, copied or AI-sounding writing, advertising, a hotel, cafe, taxi or tour promoting itself, very short or off-topic stories.
"flags" lists only real problems, from: "advertising", "contact_details", "children_faces", "unsafe_advice", "hate_or_abuse", "explicit", "not_own_photo", "off_topic", "copied_or_ai", "personal_data_of_others". Empty if none.
"caption": an Instagram story line of at most 90 characters in the storyteller's spirit, no hashtags, no emojis beyond one.
Never invent facts about the place.`;

/** Score a new story with its photos (JPEG/PNG/WebP bytes). Null when the AI is not available. */
export async function screenStory(s: { title: string; body: string; place: string; author_kind: string }, images: { type: string; bytes: Uint8Array }[]): Promise<Screening | null> {
  if (!KEY()) return null;
  const content: any[] = [{ type: 'text', text: `Place: ${s.place}\nStoryteller: ${s.author_kind}\nTitle: ${s.title}\n\n${s.body}` }];
  for (const im of images.slice(0, 3)) {
    content.push({ type: 'image_url', image_url: { url: `data:${im.type};base64,${Buffer.from(im.bytes).toString('base64')}`, detail: 'low' } });
  }
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_STORY_MODEL || 'gpt-4.1-mini', temperature: 0.2, max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SCREEN_PROMPT }, { role: 'user', content }],
      }),
      signal: AbortSignal.timeout(40000),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `OpenAI ${res.status}`);
    return parseScreening(data.choices?.[0]?.message?.content || '');
  } catch (e) {
    console.error('Story screening failed:', e);
    return null;
  }
}

const KNOWN_FLAGS = ['advertising', 'contact_details', 'children_faces', 'unsafe_advice', 'hate_or_abuse', 'explicit', 'not_own_photo', 'off_topic', 'copied_or_ai', 'personal_data_of_others'];

export function parseScreening(raw: string): Screening | null {
  try {
    const j = JSON.parse(raw);
    const score = Math.max(0, Math.min(100, Math.round(Number(j.score))));
    if (!Number.isFinite(score)) return null;
    return {
      score,
      notes: String(j.notes || '').slice(0, 400),
      flags: (Array.isArray(j.flags) ? j.flags : []).map(String).filter((f: string) => KNOWN_FLAGS.includes(f)),
      caption: String(j.caption || '').replace(/#\S+/g, '').trim().slice(0, 90),
    };
  } catch { return null; }
}

/**
 * Comments and prayer flags go live at once unless they carry contact details or links, or the moderation
 * check flags them; then they wait for the owner. If the check cannot run, they wait too.
 */
export async function moderateShort(text: string): Promise<'visible' | 'held'> {
  if (hasContactInfo(text)) return 'held';
  if (!KEY()) return 'held';
  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: text }),
      signal: AbortSignal.timeout(8000),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) return 'held';
    return data.results?.[0]?.flagged ? 'held' : 'visible';
  } catch { return 'held'; }
}
