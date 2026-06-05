import { RollinSite } from '@/components/RollinSite';
import { getSiteBySlug } from '@/lib/sites';

export default async function SitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSiteBySlug(slug);
  return <RollinSite site={site} />;
}
