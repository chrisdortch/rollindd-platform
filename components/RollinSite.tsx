import type { Site } from '@/lib/types';

export function RollinSite({ site }: { site: Site }) {
  return <main className="shell"><h1>{site.title}</h1><p>{site.tagline}</p></main>;
}
