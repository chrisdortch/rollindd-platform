import { CollectionExperience } from '@/components/CollectionExperience';
import { getSiteForCurrentHost } from '@/lib/sites';

export default async function Home() {
  const site = await getSiteForCurrentHost();
  return <CollectionExperience site={site} />;
}
