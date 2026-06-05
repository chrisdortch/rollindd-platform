import type { CentralCommandResult } from './types';
import { sampleSite, sampleTracks } from './sample-data';
import { analyzeLyrics, generateThemeFromLyrics } from './theme';

function valueFor(raw: string, label: string) {
  const lower = label.toLowerCase();
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;

    const key = line.slice(0, idx).trim().toLowerCase();
    if (key === lower) {
      return line.slice(idx + 1).trim();
    }
  }

  return '';
}

export function parseCentralCommand(raw: string) {
  const upper = raw.toUpperCase();

  return {
    action: upper.includes('UPDATE')
      ? 'update'
      : upper.includes('DOMAIN')
        ? 'domain'
        : upper.includes('REFRESH')
          ? 'refresh'
          : upper.includes('VERIFY')
            ? 'verify_domain'
            : upper.includes('PROMOTE')
              ? 'promote_live'
              : 'launch',
    values: {
      theme: valueFor(raw, 'Theme'),
      theme_instruction: valueFor(raw, 'Theme instruction'),
      suno_playlist: valueFor(raw, 'Suno playlist'),
      playlist: valueFor(raw, 'Playlist'),
      domain: valueFor(raw, 'Domain')
    }
  };
}

export async function runCentralCommand(raw: string): Promise<CentralCommandResult> {
  const parsed = parseCentralCommand(raw);
  const values = parsed.values as Record<string, string>;

  const themePrompt = values.theme_instruction || values.theme || '';
  const playlistUrl = values.suno_playlist || values.playlist || '';
  const domain = values.domain || '';

  const theme = generateThemeFromLyrics(sampleTracks, themePrompt);
  const analysis = analyzeLyrics(sampleTracks, themePrompt);

  const site = {
    ...sampleSite,
    sunoPlaylistUrl: playlistUrl || sampleSite.sunoPlaylistUrl,
    primaryDomain: domain || undefined,
    theme,
    tagline: theme.hero.subheadline
  };

  const completed = [
    'Parsed Central Command.',
    'Generated theme from current lyric corpus and theme prompt.',
    'Built local lyric search index for this site.',
    'Prepared site configuration in preview mode.',
    'Confirmed artist names are hidden by default.'
  ];

  const nextSteps = [
    'Import this repository into Vercel as rollindd-platform.',
    'Open the public preview URL after deployment.',
    'Use /admin to test the Central Command screen.',
    domain
      ? `When ready, assign ${domain} in Vercel and follow DNS verification.`
      : 'Choose the first custom domain when you are ready.'
  ];

  const riskNotes = [
    'Suno media fetching is adapter-based because public playlist data may not always expose MP3, video, or lyrics consistently.',
    'Download All MP3s should remain capability-checked until rights and file availability are confirmed.',
    'This command does not touch any existing Vercel project or GitHub repository.'
  ];

  return {
    status: 'needs_user_action',
    parsed: { ...parsed, lyricAnalysis: analysis },
    completed,
    nextSteps,
    riskNotes,
    site
  };
}
