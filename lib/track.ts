/**
 * Google Analytics 4 event, from the browser. A no-op when GA is not loaded (dev, private pages, blockers).
 * generate_lead is GA's recommended lead event: mark it as a key event in GA to count leads per page.
 */
export function track(name: string, params: Record<string, string | number | undefined> = {}): void {
  try {
    const gtag = (window as any).gtag;
    if (typeof gtag === 'function') gtag('event', name, { page_path: location.pathname, ...params });
  } catch { /* analytics must never break the page */ }
}
