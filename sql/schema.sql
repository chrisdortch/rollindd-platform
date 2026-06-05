-- RollinDD starter schema for Neon/Vercel Postgres.
-- Apply after creating the database. The starter app runs without this in demo mode.

create table if not exists sites (
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
);

create table if not exists tracks (
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
);

create table if not exists domains (
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
);

create table if not exists commands (
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
);

create table if not exists theme_generations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  lyric_corpus_hash text,
  user_theme_prompt text,
  uploaded_image_refs jsonb not null default '[]'::jsonb,
  ai_analysis_json jsonb not null default '{}'::jsonb,
  theme_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);
