'use client';
import { useEffect, useState } from 'react';
import { reloadOnceForChunkError } from '@/lib/chunk-reload';

/**
 * Last-resort boundary for errors in the root layouts (header, footer, lead tools). Without it Next.js
 * shows a bare "Application error: a client-side exception" page, which Google indexed for
 * /medicine-delivery-dharamshala on 21 Nov 2026 when its renderer could not fetch some script files.
 * Missing-chunk errors reload once (lib/chunk-reload.ts).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Keep the page's real title: Google's renderer sometimes fails to fetch our script files, and whatever this
  // shows is what gets indexed. No noindex here, or one bad render could drop a good page from Google.
  const [title] = useState(() => (typeof document !== 'undefined' && document.title) || 'Dharamshala Stay');
  useEffect(() => {
    if (!reloadOnceForChunkError(error)) console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>{title}</title>
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8fafc', color: '#0f172a' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, textAlign: 'center' }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>This page did not load properly</h1>
            <p style={{ color: '#475569', margin: '0 0 20px' }}>Please reload it. If it keeps happening, message us on WhatsApp.</p>
            <button onClick={() => { try { reset(); } catch { location.reload(); } }} style={{ background: '#1e3a5f', color: '#fff', border: 0, borderRadius: 12, padding: '10px 20px', fontSize: 16, cursor: 'pointer', marginRight: 8 }}>Reload</button>
            <a href="/" style={{ color: '#1e3a5f', fontSize: 16 }}>Home</a>
          </div>
        </div>
      </body>
    </html>
  );
}
