import { createPool, sql } from '@vercel/postgres';
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

const requiredTables = ['sites', 'tracks', 'domains', 'commands', 'theme_generations'];

const schemaStatements = [
  'create extension if not exists pgcrypto',
  `create table if not exists sites (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null,
    primary_domain text unique,
    fallback_subdomain text,
    title text not null,
    tagline text,
    suno_playlist_url text,
    theme_json jsonb not null default '{}'::jsonb,
    status text not null default 'draft',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists tracks (
    id uuid primary key default gen_random_uuid(),
    site_id uuid not null references sites(id) on delete cascade,
    source_track_id text,
    source_url text,
    title text not null,
    hidden_artist_name text,
    cover_image_url text,
    video_url text,
    audio_url text,
    mp3_url text,
    duration_seconds integer,
    lyrics text,
    lyric_search_text text,
    sort_order integer not null default 0,
    media_status text not null default 'partial',
    downloadable boolean not null default false,
    fetched_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists domains (
    id uuid primary key default gen_random_uuid(),
    site_id uuid not null references sites(id) on delete cascade,
    domain text unique not null,
    type text not null default 'apex',
    vercel_status text not null default 'pending',
    dns_status text not null default 'unknown',
    verification_required boolean not null default false,
    verification_instructions text,
    canonical_redirect_to text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists commands (
    id uuid primary key default gen_random_uuid(),
    command_type text not null,
    raw_command_text text not null,
    parsed_json jsonb not null default '{}'::jsonb,
    status text not null default 'pending',
    site_id uuid references sites(id) on delete set null,
    risk_notes text,
    next_user_steps text,
    created_at timestamptz not null default now(),
    completed_at timestamptz
  )`,
  `create table if not exists theme_generations (
    id uuid primary key default gen_random_uuid(),
    site_id uuid not null references sites(id) on delete cascade,
    lyric_corpus_hash text,
    user_theme_prompt text,
    uploaded_image_refs jsonb not null default '[]'::jsonb,
    ai_analysis_json jsonb not null default '{}'::jsonb,
    theme_json jsonb not null default '{}'::jsonb,
    status text not null default 'draft',
    created_at timestamptz not null default now()
  )`,
  'create index if not exists sites_primary_domain_idx on sites(primary_domain)',
  'create index if not exists sites_fallback_subdomain_idx on sites(fallback_subdomain)',
  'create index if not exists tracks_site_sort_idx on tracks(site_id, sort_order)',
  'create index if not exists tracks_site_source_track_idx on tracks(site_id, source_track_id)',
  'create index if not exists commands_site_created_idx on commands(site_id, created_at desc)'
];

export async function getDatabaseStatus() {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      reachable: false,
      schemaReady: false,
      missingTables: requiredTables,
      mode: 'demo-fallback' as const,
      message: 'POSTGRES_URL is not configured; using demo fallback.'
    };
  }

  try {
    const result = await sql<{ table_name: string; exists: boolean }>`
      select table_name, to_regclass('public.' || table_name) is not null as exists
      from (values
        ('sites'),
        ('tracks'),
        ('domains'),
        ('commands'),
        ('theme_generations')
      ) as required(table_name)
    `;
    const missingTables = result.rows.filter((row) => !row.exists).map((row) => row.table_name);

    return {
      configured: true,
      reachable: true,
      schemaReady: missingTables.length === 0,
      missingTables,
      mode: missingTables.length === 0 ? 'database' as const : 'database-needs-schema' as const,
      message: missingTables.length
        ? `Database is reachable, but ${missingTables.join(', ')} table setup is missing.`
        : 'Database is reachable and the RollinDD schema is ready.'
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      schemaReady: false,
      missingTables: requiredTables,
      mode: 'database-error' as const,
      message: error instanceof Error ? error.message : 'Database connection failed.'
    };
  }
}

export async function applyDatabaseSchema() {
  if (!isDatabaseConfigured()) {
    throw new Error('POSTGRES_URL is not configured; using demo fallback.');
  }

  const pool = createPool();
  const applied: string[] = [];
  try {
    for (const statement of schemaStatements) {
      await pool.query(statement);
      applied.push(statement.split('\n')[0]);
    }
  } finally {
    await pool.end();
  }
  return applied;
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
