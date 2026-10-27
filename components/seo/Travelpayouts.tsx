'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Travelpayouts (affiliate partner 591777): site verification and affiliate links on travel sites.
 * Public pages only, loaded after the page is idle so it never slows a page. A third-party script can read the
 * page it runs on, so it never runs where bookings, payments, accounts or admin work happen: if a visitor moves
 * from a public page to one of those inside the app, that page reloads without it.
 */
const PRIVATE = /^\/(hi\/)?(admin|partner|account|auth|booking|claim|remove-listing|email|stories\/me|tickets|play\/host|play\/tv)(\/|$)/;
const SRC = 'https://tp-em.com/NTkxNzc3.js?t=591777';

export default function Travelpayouts() {
  const path = usePathname() || '/';
  const isPrivate = PRIVATE.test(path);
  const loaded = useRef(false);

  useEffect(() => {
    if (isPrivate && loaded.current) window.location.reload();
  }, [isPrivate]);

  if (process.env.NODE_ENV !== 'production' || isPrivate) return null;
  return <Script id="travelpayouts" src={SRC} strategy="lazyOnload" data-cmp-ab="2" onLoad={() => { loaded.current = true; }} />;
}
