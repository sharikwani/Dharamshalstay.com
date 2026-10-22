'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { siteConfig } from '@/lib/config';

/** Private pages (admin, partner and hotel dashboards, personal links) are never tracked. */
const PRIVATE = /^\/(hi\/)?(admin|partner|account|auth|booking|claim|remove-listing|email|stories\/me)(\/|$)/;

/**
 * Google Analytics 4. Page views on client-side navigation come from GA's enhanced measurement
 * (browser history events), so one script tag is enough. Production only, and switched off on
 * private pages, so the owner's admin work does not count as traffic.
 */
export default function Analytics() {
  const id = siteConfig.gaMeasurementId;
  const path = usePathname() || '/';
  const off = PRIVATE.test(path);
  useEffect(() => {
    if (id) (window as any)['ga-disable-' + id] = off;
  }, [id, off]);
  if (!id || process.env.NODE_ENV !== 'production') return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window['ga-disable-${id}']=${PRIVATE}.test(location.pathname);window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}
