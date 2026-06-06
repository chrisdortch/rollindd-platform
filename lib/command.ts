import type { CentralCommandResult, Site } from './types';
import { sampleSite } from './sample-data';
import { fetchSunoPlaylist } from './suno';
import { analyzeLyrics, generateThemeFromLyrics } from './theme';
import { isDatabaseConfigured, recordCommandRun, saveSiteWithTracks } from './persistence';

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return slug || sampleSite.slug;
}

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
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const commandLine = (lines[0] || '').toUpperCase();

  return {
    action: commandLine.includes('UPDATE')
      ? 'update'
      : commandLine.includes('DOMAIN')
        ? 'domain'
        : commandLine.includes('REFRESH')
          ? 'refresh'
          : commandLine.includes('VERIFY')
            ? 'verify_domain'
            : commandLine.includes('PROMOTE')
              ? 'promote_live'
              : 'launch',
    values: {
      site_name: valueFor(raw, 'Site name'),
      site: valueFor(raw, 'Site'),
      theme: valueFor(raw, 'Theme'),
      theme_instruction: valueFor(raw, 'Theme instruction'),
      suno_playlist: valueFor(raw, 'Suno playlist'),
      new_suno_playlist: valueFor(raw, 'New Suno playlist'),
      playlist: valueFor(raw, 'Playlist'),
      domain: valueFor(raw, 'Domain')
    }
  };
}

export async function runCentralCommand(raw: string): Promise<CentralCommandResult> {
  const parsed = parseCentralCommand(raw);
  const values = parsed.values as Record<string, string>;
  const databaseConfigured = isDatabaseConfigured();

  const themePrompt = values.theme_instruction || values.theme || '';
  const playlistUrl = values.new_suno_playlist || values.suno_playlist || values.playlist || '';
  const domain = values.domain || '';
  const siteTitle = values.site_name || values.site || sampleSite.title;
  const slug = slugify(siteTitle || domain || sampleSite.slug);
  const fetched = await fetchSunoPlaylist(playlistUrl);
  const tracks = fetched.tracks;

  if (!tracks.length) {
    const riskNotes = [
      fetched.message,
      'No demo playlist data was saved, so the existing homepage remains unchanged.',
      'Try the Suno playlist URL again, then run Central Command only after Fetch reports parsed tracks.'
    ];

    return {
      status: 'needs_user_action',
      persistence: 'demo-fallback',
      parsed: { ...parsed, sunoFetchMode: fetched.mode, sunoFetchMessage: fetched.message },
      completed: ['Parsed Central Command.', `Suno fetch did not return production records for ${playlistUrl || 'the provided URL'}.`],
      nextSteps: ['Use the Fetch button first and confirm it reports parsed tracks before saving.'],
      riskNotes
    };
  }

  const theme = generateThemeFromLyrics(tracks, themePrompt);
  const analysis = analyzeLyrics(tracks, themePrompt);

  const site: Site = {
    ...sampleSite,
    id: `preview-${slug}`,
    slug,
    title: siteTitle,
    sunoPlaylistUrl: playlistUrl || sampleSite.sunoPlaylistUrl,
    primaryDomain: domain || undefined,
    fallbackSubdomain: `${slug}.rollindd.com`,
    theme,
    tagline: theme.hero.subheadline,
    tracks,
    status: 'preview' as const
  };

  const completed = [
    'Parsed Central Command.',
    `Fetched playlist data in ${fetched.mode} mode.`,
    'Generated theme from lyric corpus and theme prompt.',
    `Built lyric search input from ${tracks.length} tracks.`,
    'Prepared site configuration in preview mode.',
    'Confirmed artist names are hidden by default.'
  ];

  const nextSteps = [
    `Open /sites/${slug} to review this site route.`,
    'Use /admin to run another Central Command update.',
    domain
      ? `When ready, assign ${domain} in Vercel and follow DNS verification.`
      : 'Choose the first custom domain when you are ready.'
  ];

  const riskNotes = [
    'Suno media fetching is adapter-based because public playlist data may not always expose MP3, video, or lyrics consistently.',
    'Download All MP3s should remain capability-checked until rights and file availability are confirmed.',
    'This command does not touch any non-RollinDD Vercel project or GitHub repository.',
    'No DNS, domain assignment, purchases, or downloadable media hosting actions were performed.'
  ];
  let persistence: CentralCommandResult['persistence'] = 'demo-fallback';
  let resultSite = site;
  let status: CentralCommandResult['status'] = 'needs_user_action';

  if (databaseConfigured) {
    try {
      resultSite = await saveSiteWithTracks(site);
      persistence = 'database';
      status = 'completed';
      completed.push('Saved site and track records to Postgres.');
      completed.push('Replaced stale track records with the latest fetched playlist data.');
      nextSteps.push(`Review the persisted site at /sites/${resultSite.slug}.`);
      if (domain) {
        riskNotes.push(`Stored ${domain} as the desired primary domain only; Vercel domain assignment still requires approval.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error.';
      riskNotes.push(`Database persistence was skipped after an error: ${message}`);
      nextSteps.push('Confirm POSTGRES_URL is valid and sql/schema.sql has been applied.');
    }
  } else {
    completed.push('Skipped database writes because POSTGRES_URL is not configured.');
    nextSteps.push('Connect Postgres and apply sql/schema.sql when you are ready for persistent multi-site storage.');
  }

  if (databaseConfigured) {
    try {
      await recordCommandRun({
        commandType: parsed.action,
        rawCommandText: raw,
        parsed: { ...parsed, lyricAnalysis: analysis, sunoFetchMode: fetched.mode },
        status,
        siteId: persistence === 'database' ? resultSite.id : undefined,
        riskNotes,
        nextSteps
      });
      if (persistence === 'database') completed.push('Recorded Central Command history.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown command history error.';
      riskNotes.push(`Command history was not saved: ${message}`);
    }
  }

  return {
    status,
    persistence,
    parsed: { ...parsed, lyricAnalysis: analysis, sunoFetchMode: fetched.mode, sunoFetchMessage: fetched.message },
    completed,
    nextSteps,
    riskNotes,
    site: resultSite
  };
}
