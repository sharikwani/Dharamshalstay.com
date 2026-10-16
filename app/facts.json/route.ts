import { NextResponse } from 'next/server';
import { getAllFacts } from '@/lib/facts';
import { travelUpdates } from '@/data/travel-updates';
import { siteConfig } from '@/lib/config';

export const revalidate = 3600;

/** Machine-readable facts for AI assistants and anyone who wants to cite us (CC BY 4.0, link back). */
export async function GET() {
  const facts = await getAllFacts();
  const body = {
    publisher: { name: siteConfig.name, url: siteConfig.url, contact: siteConfig.email },
    description: 'Verified travel facts for Dharamshala, McLeod Ganj and the Kangra Valley. Each fact has the date it was checked and its sources.',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Please link to ' + siteConfig.url + '/facts#<id> when quoting.',
    updated: facts.reduce((m, f) => (f.verified > m ? f.verified : m), '2026-01-01'),
    facts: facts.map((f) => ({ ...f, url: siteConfig.url + '/facts#' + f.id, page: f.page ? siteConfig.url + f.page : undefined })),
    travelUpdates: travelUpdates.map((u) => ({ ...u, url: siteConfig.url + '/travel-updates#' + u.id, page: u.page ? siteConfig.url + u.page : undefined })),
  };
  return NextResponse.json(body, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
}
