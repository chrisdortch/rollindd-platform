import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSecret } from '@/lib/admin-auth';
import { saveSiteWithTracks, getSiteBySlugFromDatabase, isDatabaseConfigured } from '@/lib/persistence';
import { sampleSite } from '@/lib/sample-data';
import { fetchSunoPlaylist } from '@/lib/suno';
import { analyzeLyrics, generateThemeFromLyrics } from '@/lib/theme';

export async function POST(request: NextRequest) {
  const { playlistUrl, themePrompt, save } = await request.json();
  const shouldSave = Boolean(save);

  if (shouldSave) {
    const authResponse = requireAdminSecret(request);
    if (authResponse) return authResponse;
  }

  const fetched = await fetchSunoPlaylist(String(playlistUrl || ''));
  const lyricAnalysis = analyzeLyrics(fetched.tracks, String(themePrompt || ''));
  const theme = generateThemeFromLyrics(fetched.tracks, String(themePrompt || ''), fetched.tracks[0]?.coverImageUrl);

  if (!fetched.tracks.length) {
    return NextResponse.json(
      {
        ...fetched,
        status: 'failed',
        lyricAnalysis,
        theme,
        riskNotes: ['No demo tracks were saved. Existing homepage data was left unchanged.']
      },
      { status: 502 }
    );
  }

  if (!shouldSave) {
    return NextResponse.json({ ...fetched, status: 'preview', lyricAnalysis, theme });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        ...fetched,
        status: 'blocked',
        lyricAnalysis,
        theme,
        error: 'POSTGRES_URL is not configured, so Fetch cannot update the homepage.'
      },
      { status: 503 }
    );
  }

  const existing = await getSiteBySlugFromDatabase('rollindd');
  const baseSite = existing || {
    ...sampleSite,
    id: 'preview-rollindd',
    slug: 'rollindd',
    title: 'RollinDD',
    primaryDomain: 'rollindd-platform.vercel.app',
    fallbackSubdomain: 'rollindd.rollindd.com',
    status: 'preview' as const
  };

  const site = {
    ...baseSite,
    slug: 'rollindd',
    title: 'RollinDD',
    sunoPlaylistUrl: String(playlistUrl || sampleSite.sunoPlaylistUrl),
    tagline: theme.hero.subheadline,
    theme,
    tracks: fetched.tracks
  };
  const savedSite = await saveSiteWithTracks(site);

  return NextResponse.json({
    ...fetched,
    status: 'completed',
    persistence: 'database',
    lyricAnalysis,
    theme,
    site: savedSite,
    completed: [
      `Parsed ${fetched.tracks.length} Suno production records.`,
      'Saved RollinDD site and track records to Postgres.',
      'Replaced stale homepage tracks with the latest fetched playlist data.'
    ],
    nextSteps: ['Open /sites/rollindd to verify the homepage.'],
    riskNotes: ['No demo tracks were used or saved.']
  });
}
