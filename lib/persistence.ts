import { sql } from '@vercel/postgres';
import type { Site, ThemeConfig, Track } from './types';

type SiteRow = {
  id: string;
  slug: string;
  primary_domain: string | null;
  fallback_subdomain: string | null;
  title: string;
  tagline: string | null;
  suno_playlist_url: string | null;
  theme_json: ThemeConfig;
  status: Site['status'];
};

type TrackRow = {
  id: string;
  source_track_id: string | null;
  source_url: string | null;
  title: string;
  hidden_artist_name: string | null;
  cover_image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  mp3_url: string | null;
  duration_seconds: number | null;
  lyrics: string | null;
  sort_order: number;
  media_status: Track['mediaStatus'];
  downloadable: boolean;
};

export function isDatabaseConfigured() {
  return Boolean(process.env.POSTGRES_URL);
}

function toSite(row: SiteRow, tracks: Track[]): Site {
  return {
    id: row.id,
    slug: row.slug,
    primaryDomain: row.primary_domain || undefined,
    fallbackSubdomain: row.fallback_subdomain || undefined,
    title: row.title,
    tagline: row.tagline || '',
    sunoPlaylistUrl: row.suno_playlist_url || undefined,
    theme: row.theme_json,
    tracks,
    status: row.status
  };
}

function toTrack(row: TrackRow): Track {
  return {
    id: row.source_track_id || row.id,
    title: row.title,
    hiddenArtistName: row.hidden_artist_name || undefined,
    coverImageUrl: row.cover_image_url || '',
    videoUrl: row.video_url || undefined,
    audioUrl: row.audio_url || undefined,
    mp3Url: row.mp3_url || undefined,
    durationSeconds: row.duration_seconds || undefined,
    lyrics: row.lyrics || '',
    sortOrder: row.sort_order,
    downloadable: row.downloadable,
    sourceUrl: row.source_url || undefined,
    mediaStatus: row.media_status || 'partial'
  };
}

async function getTracksForSite(siteId: string) {
  const result = await sql<TrackRow>`
    select *
    from tracks
    where site_id = ${siteId}
    order by sort_order asc, created_at asc
  `;

  return result.rows.map(toTrack);
}

export async function getSiteBySlugFromDatabase(slug: string) {
  const result = await sql<SiteRow>`
    select *
    from sites
    where slug = ${slug}
    limit 1
  `;

  const site = result.rows[0];
  if (!site) return undefined;
  return toSite(site, await getTracksForSite(site.id));
}

export async function getSiteByHostFromDatabase(host: string) {
  const slug = host.split('.')[0];
  const result = await sql<SiteRow>`
    select *
    from sites
    where primary_domain = ${host}
      or fallback_subdomain = ${host}
      or slug = ${slug}
    order by
      case
        when primary_domain = ${host} then 1
        when fallback_subdomain = ${host} then 2
        else 3
      end
    limit 1
  `;

  const site = result.rows[0];
  if (!site) return undefined;
  return toSite(site, await getTracksForSite(site.id));
}

export async function saveSiteWithTracks(site: Site) {
  const siteResult = await sql<SiteRow>`
    insert into sites (
      slug,
      primary_domain,
      fallback_subdomain,
      title,
      tagline,
      suno_playlist_url,
      theme_json,
      status,
      updated_at
    )
    values (
      ${site.slug},
      ${site.primaryDomain || null},
      ${site.fallbackSubdomain || null},
      ${site.title},
      ${site.tagline},
      ${site.sunoPlaylistUrl || null},
      ${JSON.stringify(site.theme)}::jsonb,
      ${site.status},
      now()
    )
    on conflict (slug) do update set
      primary_domain = excluded.primary_domain,
      fallback_subdomain = excluded.fallback_subdomain,
      title = excluded.title,
      tagline = excluded.tagline,
      suno_playlist_url = excluded.suno_playlist_url,
      theme_json = excluded.theme_json,
      status = excluded.status,
      updated_at = now()
    returning *
  `;

  const savedSite = siteResult.rows[0];
  for (const track of site.tracks) {
    const existing = await sql<{ id: string }>`
      select id
      from tracks
      where site_id = ${savedSite.id}
        and source_track_id = ${track.id}
      limit 1
    `;

    if (existing.rows[0]) {
      await sql`
        update tracks set
          source_url = ${track.sourceUrl || null},
          title = ${track.title},
          hidden_artist_name = ${track.hiddenArtistName || null},
          cover_image_url = ${track.coverImageUrl},
          video_url = ${track.videoUrl || null},
          audio_url = ${track.audioUrl || null},
          mp3_url = ${track.mp3Url || null},
          duration_seconds = ${track.durationSeconds || null},
          lyrics = ${track.lyrics},
          lyric_search_text = ${`${track.title} ${track.lyrics}`.toLowerCase()},
          sort_order = ${track.sortOrder},
          media_status = ${track.mediaStatus || 'partial'},
          downloadable = ${Boolean(track.downloadable)},
          fetched_at = now(),
          updated_at = now()
        where id = ${existing.rows[0].id}
      `;
    } else {
      await sql`
        insert into tracks (
          site_id,
          source_track_id,
          source_url,
          title,
          hidden_artist_name,
          cover_image_url,
          video_url,
          audio_url,
          mp3_url,
          duration_seconds,
          lyrics,
          lyric_search_text,
          sort_order,
          media_status,
          downloadable,
          fetched_at
        )
        values (
          ${savedSite.id},
          ${track.id},
          ${track.sourceUrl || null},
          ${track.title},
          ${track.hiddenArtistName || null},
          ${track.coverImageUrl},
          ${track.videoUrl || null},
          ${track.audioUrl || null},
          ${track.mp3Url || null},
          ${track.durationSeconds || null},
          ${track.lyrics},
          ${`${track.title} ${track.lyrics}`.toLowerCase()},
          ${track.sortOrder},
          ${track.mediaStatus || 'partial'},
          ${Boolean(track.downloadable)},
          now()
        )
      `;
    }
  }

  return toSite(savedSite, await getTracksForSite(savedSite.id));
}

export async function recordCommandRun(input: {
  commandType: string;
  rawCommandText: string;
  parsed: Record<string, unknown>;
  status: string;
  siteId?: string;
  riskNotes: string[];
  nextSteps: string[];
}) {
  await sql`
    insert into commands (
      command_type,
      raw_command_text,
      parsed_json,
      status,
      site_id,
      risk_notes,
      next_user_steps,
      completed_at
    )
    values (
      ${input.commandType},
      ${input.rawCommandText},
      ${JSON.stringify(input.parsed)}::jsonb,
      ${input.status},
      ${input.siteId || null},
      ${input.riskNotes.join('\n')},
      ${input.nextSteps.join('\n')},
      now()
    )
  `;
}
