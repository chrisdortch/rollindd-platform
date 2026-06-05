import { headers } from 'next/headers';
import { sampleSite, sites } from './sample-data';

export async function getSiteBySlug(slug: string) {
  return sites.find((site) => site.slug === slug) || sampleSite;
}

export async function getSiteForCurrentHost() {
  const h = await headers();
  const host = h.get('host')?.split(':')[0] || '';
  const match = sites.find((site) => site.primaryDomain === host || site.fallbackSubdomain === host || site.slug === host.split('.')[0]);
  return match || sampleSite;
}
