import { CollectionExperience } from '@/components/CollectionExperience';
import { getSiteBySlug } from '@/lib/sites';

export default async function SitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSiteBySlug(slug);
  return <CollectionExperience site={site} />;
}
