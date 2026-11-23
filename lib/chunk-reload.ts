/**
 * After a deploy, a browser (or Google's renderer) that loaded the old HTML can ask for JavaScript
 * files the new deploy no longer has. Next.js then shows "Application error: a client-side exception",
 * and Google indexed exactly that as our medicine page title (Nov 2026). A fresh load fixes it, so
 * reload once; the session flag stops a reload loop if the error is real.
 */
const KEY = 'ds-chunk-reload';

export function isChunkError(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  const text = `${e?.name || ''} ${e?.message || ''}`;
  return /ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(text);
}

/** Reloads the page once per path for a chunk error. Returns true when a reload was started. */
export function reloadOnceForChunkError(error: unknown): boolean {
  if (typeof window === 'undefined' || !isChunkError(error)) return false;
  const mark = `${location.pathname}|${Math.floor(Date.now() / 60000)}`;
  try {
    const last = sessionStorage.getItem(KEY);
    if (last && last.split('|')[0] === location.pathname && Date.now() / 60000 - Number(last.split('|')[1]) < 5) return false;
    sessionStorage.setItem(KEY, mark);
  } catch { /* storage blocked: reload anyway, a crawler gets one try */ }
  location.reload();
  return true;
}
