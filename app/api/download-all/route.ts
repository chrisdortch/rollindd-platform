import { NextRequest, NextResponse } from 'next/server';
import { createStoredZip, safeFilename, trackFilename, zipReadme } from '@/lib/downloads';
import { getSiteBySlug } from '@/lib/sites';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const siteSlug = request.nextUrl.searchParams.get('site') || 'rollindd';
  const site = await getSiteBySlug(siteSlug);
  const tracks = [...site.tracks]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((track) => track.mp3Url);

  if (!tracks.length) {
    return NextResponse.json({ error: 'No downloadable MP3s are available for this site.' }, { status: 404 });
  }

  const files: Array<{ name: string; data: Buffer }> = [];
  for (const track of tracks) {
    const response = await fetch(track.mp3Url!);
    if (!response.ok) continue;
    files.push({
      name: trackFilename(track, files.length + 1),
      data: Buffer.from(await response.arrayBuffer())
    });
  }

  if (!files.length) {
    return NextResponse.json({ error: 'Could not fetch any MP3 sources.' }, { status: 502 });
  }

  files.push({
    name: 'RollinDD.m3u',
    data: Buffer.from(['#EXTM3U', ...files.map((file) => file.name)].join('\n'))
  });
  files.push({
    name: 'Apple-Music-Import.txt',
    data: Buffer.from(zipReadme(site.title))
  });

  const zip = createStoredZip(files);
  return new Response(zip, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${safeFilename(site.title)} MP3s.zip"`,
      'cache-control': 'private, max-age=0, must-revalidate'
    }
  });
}
