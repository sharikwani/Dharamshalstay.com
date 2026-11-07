'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { diwaliActive } from '@/lib/diwali';

/** The scene loads only during Diwali (6-11 Nov 2026 IST) on public pages; any other day this is a few bytes and nothing else. */
const DiwaliScene = dynamic(() => import('./DiwaliScene'), { ssr: false });

export default function DiwaliLights() {
  const path = usePathname() || '/';
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(diwaliActive(Date.now(), path, window.location.search)); }, [path]);
  if (!on) return null;
  return <DiwaliScene path={path} hindi={/^\/hi(\/|$)/.test(path)} />;
}
