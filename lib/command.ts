import type { CentralCommandResult } from './types';
import { sampleSite, sampleTracks } from './sample-data';
import { generateThemeFromLyrics, analyzeLyrics } from './theme';

export function parseCentralCommand(raw: string) {
  const lines = raw.split('
').map((line) => line.trim()).filter(Boolean);
  const first = lines[0]?.toUpperCase() || '';
  const values: Record<string, string | boolean> = {};
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(':');
    if (idx > -1) {
      const key = line.slice(0, idx).trim().toLowerCase().replace(/\s+/g, '_');
      const value = line.slice(idx + 1).trim();
      values[key] = value;
    }
  }
  const inline = raw.match(/ROLLINDD\s+(LAUNCH|UPDATE|DOMAIN|REFRESH|VERIFY|PROMOTE)(.*)/i);
  if (inline?.[2]) {
    for (const part of inline[2].split(/\s+/)) {
      const [key, ...rest] = part.split('=');
      if (key && rest.length) values[key.toLowerCase()] = rest.join('=').replace(/^"|"$/g, '');
    }
  }
  return {
    action: first.includes('UPDATE') ? 'update' : first.includes('DOMAIN') ? 'domain' : first.includes('REFRESH') ? 'refresh' : first.includes('VERIFY') ? 'verify_domain' : first.includes('PROMOTE') ? 'promote_live' : 'launch',
    values
  };
}

export async function runCentralCommand(raw: string): Promise<CentralCommandResult> {
  const parsed = parseCentralCommand(raw);
  const themePrompt = String(parsed.values.theme_instruction || parsed.values.theme || parsed.values.themeprompt || '');
  const playlistUrl = String(parsed.values.suno_playlist || parsed.values.playlist || parsed.values.playlisturl || '');
  const domain = String(parsed.values.domain || '');
  const theme = generateThemeFromLyrics(sampleTracks, themePrompt);
  const analysis = analyzeLyrics(sampleTracks, themePrompt);
  const site = { ...sampleSite, sunoPlaylistUrl: playlistUrl || sampleSite.sunoPlaylistUrl, primaryDomain: domain || undefined, theme, tagline: theme.hero.subheadline };
  const completed = [
    'Parsed Central Command.',
    'Generated theme from current lyric corpus and theme prompt.',
    'Built local lyric search index for this site.',
    'Prepared site configuration in preview mode.',
    'Confirmed artist names are hidden by default.'
  ];
  const nextSteps = [
    'Create the empty GitHub repo named chrisdortch/rollindd-platform, then tell ChatGPT: ROLLINDD REPO READY.',
    'Create/import a new Vercel project named rollindd-platform connected only to that repo.',
    'Add Neon Postgres later for persistence; this starter runs in sample/demo mode until POSTGRES_URL exists.',
    domain ? `When ready, assign ${domain} in Vercel and follow DNS verification.` : 'Choose the first custom domain when you are ready.'
  ];
  const riskNotes = [
    'Suno media fetching is adapter-based because public playlist data may not always expose MP3/video/lyrics consistently.',
    'Download All MP3s should remain capability-checked until rights and file availability are confirmed.',
    'This command does not touch any existing Vercel project or GitHub repository.'
  ];
  return { status: 'needs_user_action', parsed: { ...parsed, lyricAnalysis: analysis }, completed, nextSteps, riskNotes, site };
}
