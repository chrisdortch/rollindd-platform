import { NextRequest, NextResponse } from 'next/server';
import { sampleSite } from '@/lib/sample-data';
import { searchLyrics, snippetFor } from '@/lib/search';
import { getSiteBySlug } from '@/lib/sites';

export async function POST(request: NextRequest) {
  const { query, exact, siteSlug } = await request.json();
  const searchQuery = String(query || '');
  const site = siteSlug ? await getSiteBySlug(String(siteSlug)) : sampleSite;
  const results = searchLyrics(site.tracks, searchQuery, Boolean(exact));

  return NextResponse.json({
    site: {
      slug: site.slug,
      title: site.title
    },
    results: results.map((track) => ({ ...track, snippet: snippetFor(track, searchQuery) }))
  });
}
