import { headers } from 'next/headers';
import { sampleSite, sites } from './sample-data';
import { getSiteByHostFromDatabase, getSiteBySlugFromDatabase, isDatabaseConfigured } from './persistence';

export async function getSiteBySlug(slug: string) {
  if (isDatabaseConfigured()) {
    try {
      const dbSite = await getSiteBySlugFromDatabase(slug);
      if (dbSite) return dbSite;
    } catch (error) {
      console.warn('RollinDD database site lookup failed; using demo fallback.', error);
    }
  }

  return sites.find((site) => site.slug === slug) || sampleSite;
}

export async function getSiteForCurrentHost() {
  const h = await headers();
  const host = h.get('host')?.split(':')[0] || '';
  if (host && isDatabaseConfigured()) {
    try {
      const dbSite = await getSiteByHostFromDatabase(host);
      if (dbSite) return dbSite;
    } catch (error) {
      console.warn('RollinDD database host lookup failed; using demo fallback.', error);
    }
  }

  const match = sites.find((site) => site.primaryDomain === host || site.fallbackSubdomain === host || site.slug === host.split('.')[0]);
  return match || sampleSite;
}
