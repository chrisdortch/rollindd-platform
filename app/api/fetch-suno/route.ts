import { NextRequest, NextResponse } from 'next/server';
import { fetchSunoPlaylist } from '@/lib/suno';
import { analyzeLyrics, generateThemeFromLyrics } from '@/lib/theme';

export async function POST(request: NextRequest) {
  const { playlistUrl, themePrompt } = await request.json();
  const fetched = await fetchSunoPlaylist(String(playlistUrl || ''));
  const lyricAnalysis = analyzeLyrics(fetched.tracks, String(themePrompt || ''));
  const theme = generateThemeFromLyrics(fetched.tracks, String(themePrompt || ''));
  return NextResponse.json({ ...fetched, lyricAnalysis, theme });
}
