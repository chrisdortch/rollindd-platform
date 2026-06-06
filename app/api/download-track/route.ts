import { NextRequest, NextResponse } from 'next/server';
import { trackFilename } from '@/lib/downloads';
import { getSiteBySlug } from '@/lib/sites';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const siteSlug = search.get('site') || 'rollindd';
  const trackId = search.get('track') || '';
  const site = await getSiteBySlug(siteSlug);
  const track = site.tracks.find((item) => item.id === trackId);

  if (!track || !track.mp3Url) {
    return NextResponse.json({ error: 'MP3 is not available for this track.' }, { status: 404 });
  }

  const response = await fetch(track.mp3Url);
  if (!response.ok || !response.body) {
    return NextResponse.json({ error: `Could not fetch MP3 source (${response.status}).` }, { status: 502 });
  }

  return new Response(response.body, {
    headers: {
      'content-type': response.headers.get('content-type') || 'audio/mpeg',
      'content-disposition': `attachment; filename="${trackFilename(track).replace(/"/g, '')}"`,
      'cache-control': 'private, max-age=0, must-revalidate'
    }
  });
}
