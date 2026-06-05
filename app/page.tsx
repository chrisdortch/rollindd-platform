import { RollinSite } from '@/components/RollinSite';
import { getSiteForCurrentHost } from '@/lib/sites';

export default async function Home() {
  const site = await getSiteForCurrentHost();
  return <RollinSite site={site} />;
}
