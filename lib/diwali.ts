/**
 * "Light up McLeod Ganj" for Diwali 2026: each new page a visitor opens lights one more home in a night
 * scene of the town at the bottom of the screen; the twelfth brings fireworks and a personal Diwali card.
 * Runs entirely in the browser (no database reads or writes) and switches itself off after Bhai Dooj.
 */

/** 6 Nov 2026 00:00 IST (Dhanteras weekend) to 12 Nov 2026 00:00 IST (after Bhai Dooj, 11 Nov). */
export const DIWALI_START = Date.UTC(2026, 10, 5, 18, 30);
export const DIWALI_END = Date.UTC(2026, 10, 11, 18, 30);

/** Pages where the scene would get in the way or does not belong (dashboards, checkout, tickets, games, TV). */
const EXCLUDED = /^\/(hi\/)?(admin|partner|account|auth|booking|tickets|email|claim|remove-listing|play|tv|social|stories\/me)(\/|$)/;

/** `?diwali=1` previews it outside the dates (for checking the design); `?diwali=0` hides it. */
export function diwaliActive(now: number, path: string, search = ''): boolean {
  if (EXCLUDED.test(path)) return false;
  const q = new URLSearchParams(search).get('diwali');
  if (q === '0') return false;
  if (q === '1') return true;
  return now >= DIWALI_START && now < DIWALI_END;
}

export interface DiwaliLight { key: string; en: string; hi: string }

/** Lit in this order, one per new page: from the middle of town outwards (phones see the middle first). The last is the finale. */
export const LIGHTS: DiwaliLight[] = [
  { key: 'h6', en: 'a hillside home in Forsyth Ganj', hi: 'फोर्सिथ गंज का एक घर' },
  { key: 'h5', en: 'a cafe in Naddi', hi: 'नड्डी का एक कैफ़े' },
  { key: 'road', en: 'the string of lights along Bhagsu Road', hi: 'भागसू रोड की रोशनी की लड़ी' },
  { key: 'h7', en: 'a bakery near the main square', hi: 'चौक के पास की बेकरी' },
  { key: 'h4', en: 'a homestay in Dharamkot', hi: 'धरमकोट का एक होमस्टे' },
  { key: 'h8', en: 'a home on the Kangra valley side', hi: 'कांगड़ा घाटी की ओर एक घर' },
  { key: 'flags', en: 'the prayer flags on the kora path', hi: 'कोरा पथ की प्रार्थना पताकाएँ' },
  { key: 'h3', en: 'a tea shop in Kotwali Bazaar', hi: 'कोतवाली बाज़ार की चाय की दुकान' },
  { key: 'bhagsu', en: 'Bhagsunag Temple', hi: 'भागसूनाग मंदिर' },
  { key: 'h2', en: 'a guesthouse on Temple Road', hi: 'टेम्पल रोड का एक गेस्टहाउस' },
  { key: 'h1', en: 'a family home above Jogiwara Road', hi: 'जोगीवाड़ा रोड के ऊपर एक घर' },
  { key: 'temple', en: 'the Tsuglagkhang temple complex', hi: 'त्सुगलागखांग मंदिर परिसर' },
];

export const TOTAL = LIGHTS.length;

export interface DiwaliState { pages: string[]; done: boolean; min: boolean; name: string }

export const EMPTY: DiwaliState = { pages: [], done: false, min: false, name: '' };

/** Same page in English and Hindi, or with a trailing slash, counts once. */
export function pageKey(path: string): string {
  const p = path.replace(/^\/hi(?=\/|$)/, '').replace(/\/+$/, '');
  return p || '/';
}

/** Record a page view. Returns the new state and the light it switched on, if any. */
export function visit(state: DiwaliState, path: string): { state: DiwaliState; lit: DiwaliLight | null } {
  const key = pageKey(path);
  if (state.pages.includes(key) || state.pages.length >= TOTAL) return { state, lit: null };
  const pages = [...state.pages, key];
  return { state: { ...state, pages }, lit: LIGHTS[pages.length - 1] };
}

export function parseState(raw: string | null): DiwaliState {
  try {
    const s = JSON.parse(raw || '');
    if (!s || !Array.isArray(s.pages)) return EMPTY;
    return {
      pages: s.pages.filter((p: unknown) => typeof p === 'string').slice(0, TOTAL),
      done: s.done === true, min: s.min === true, name: typeof s.name === 'string' ? s.name.slice(0, 40) : '',
    };
  } catch { return EMPTY; }
}
