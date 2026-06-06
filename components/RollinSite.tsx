'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { BrandLockup } from '@/components/BrandLockup';
import type { Site, Track } from '@/lib/types';
import { searchLyrics } from '@/lib/search';

type ViewMode = 'showcase' | 'grid';
type AirPlayAudioElement = HTMLAudioElement & {
  webkitShowPlaybackTargetPicker?: () => void;
};

function formatDuration(seconds?: number) {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

function isExactSearch(query: string) {
  const trimmed = query.trim();
  return trimmed.length > 1 && trimmed.startsWith('"') && trimmed.endsWith('"');
}

function cleanWordLine(line: string) {
  const withoutDirections = line.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
  return withoutDirections;
}

function wordRows(track: Track) {
  const rows: Array<{ id: string; text: string; pause: boolean }> = [];

  track.lyrics.split(/\r?\n/).forEach((line, index) => {
    const text = cleanWordLine(line);
    const previous = rows[rows.length - 1];

    if (!text) {
      if (rows.length && !previous?.pause) rows.push({ id: `${track.id}-${index}`, text: '', pause: true });
      return;
    }

    rows.push({ id: `${track.id}-${index}`, text, pause: false });
  });

  return rows;
}

function downloadTrackHref(site: Site, track: Track) {
  return `/api/download-track?site=${encodeURIComponent(site.slug)}&track=${encodeURIComponent(track.id)}`;
}

function downloadAllHref(site: Site) {
  return `/api/download-all?site=${encodeURIComponent(site.slug)}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l10-6.5-10-6.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5h3v14H8z" />
      <path d="M13 5h3v14h-3z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.8v5.8" />
      <path d="M12 7.4h.01" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  );
}

function ShowcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M8 17h8" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4z" />
      <path d="M14 4h6v6h-6z" />
      <path d="M4 14h6v6H4z" />
      <path d="M14 14h6v6h-6z" />
    </svg>
  );
}

function AirPlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
      <path d="M8 17H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2" />
      <path d="m12 15 5 6H7l5-6Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function RollinSite({ site }: { site: Site }) {
  const sortedTracks = useMemo(
    () => [...site.tracks].sort((a, b) => a.sortOrder - b.sortOrder),
    [site.tracks]
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [query, setQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<Track | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIntentTrackId, setPlayIntentTrackId] = useState<string | null>(null);
  const [infoTrackId, setInfoTrackId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [airPlayAvailable, setAirPlayAvailable] = useState(false);

  const exact = isExactSearch(query);
  const tracks = useMemo(
    () => searchLyrics(sortedTracks, query, exact),
    [exact, query, sortedTracks]
  );
  const downloadableCount = sortedTracks.filter((track) => track.downloadable && track.mp3Url).length;
  const playableCount = sortedTracks.filter((track) => track.audioUrl).length;
  const selectedIndex = selectedTrack ? sortedTracks.findIndex((track) => track.id === selectedTrack.id) : -1;
  const infoTrack = sortedTracks.find((track) => track.id === infoTrackId);

  useEffect(() => {
    if (!infoTrackId) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setInfoTrackId(null);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [infoTrackId]);

  useEffect(() => {
    const audio = audioRef.current as AirPlayAudioElement | null;
    if (!audio) return;

    audio.setAttribute('x-webkit-airplay', 'allow');
    setAirPlayAvailable(typeof audio.webkitShowPlaybackTargetPicker === 'function');
  }, []);

  function playTrack(track: Track) {
    if (!track.audioUrl) return;
    setSelectedTrack(track);
    setPlayIntentTrackId(track.id);
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.src !== track.audioUrl) audio.src = track.audioUrl;
    audio.play().catch(() => undefined);
  }

  function pauseTrack() {
    audioRef.current?.pause();
    setIsPlaying(false);
    setPlayIntentTrackId(null);
  }

  function toggleTrack(track: Track) {
    if (selectedTrack?.id === track.id && (isPlaying || playIntentTrackId === track.id)) {
      pauseTrack();
      return;
    }

    playTrack(track);
  }

  function playAll() {
    const firstPlayable = sortedTracks.find((track) => track.audioUrl);
    if (firstPlayable) playTrack(firstPlayable);
  }

  function playNext() {
    if (!sortedTracks.length) return;
    const startIndex = selectedIndex >= 0 ? selectedIndex + 1 : 0;
    for (let offset = 0; offset < sortedTracks.length; offset += 1) {
      const nextTrack = sortedTracks[(startIndex + offset) % sortedTracks.length];
      if (nextTrack.audioUrl) {
        playTrack(nextTrack);
        return;
      }
    }
  }

  function openAirPlayPicker() {
    const audio = audioRef.current as AirPlayAudioElement | null;
    audio?.webkitShowPlaybackTargetPicker?.();
  }

  return (
    <main className="shell music-shell" style={{
      '--bg': site.theme.palette.background,
      '--surface': site.theme.palette.surface,
      '--text': site.theme.palette.text,
      '--muted': site.theme.palette.muted,
      '--accent': site.theme.palette.accent,
      '--accent-2': site.theme.palette.accent2
    } as CSSProperties}>
      <header className="site-toolbar">
        <div className="toolbar-main">
          <BrandLockup />
          <nav className="nav-pills" aria-label="Site navigation">
            <button className="pill action-pill" onClick={playAll} disabled={!playableCount} type="button">
              <PlayIcon /> Play All
            </button>
            <a className={downloadableCount ? 'download-button nav-download' : 'download-button nav-download disabled'} href={downloadableCount ? downloadAllHref(site) : undefined}>
              <DownloadIcon /> Download All
            </a>
            <Link className="pill" href="/admin">Admin</Link>
            <a className="admin-chip" href={site.sunoPlaylistUrl || '#'}>Suno</a>
          </nav>
        </div>
        <label className="toolbar-search">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Keyword or "exact words"'
          />
        </label>
      </header>

      <section id="tracks" className="library-section" aria-label="Productions">
        <div className="library-heading">
          <div>
            <div className="kicker">Library</div>
            <h1>{tracks.length === sortedTracks.length ? `${sortedTracks.length} Productions` : `${tracks.length} Matches`}</h1>
          </div>
          <div className="view-switch" aria-label="View options">
            <button
              className={viewMode === 'showcase' ? 'active' : ''}
              onClick={() => setViewMode('showcase')}
              aria-label="Showcase view"
              aria-pressed={viewMode === 'showcase'}
              type="button"
            >
              <ShowcaseIcon />
            </button>
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              type="button"
            >
              <GridIcon />
            </button>
          </div>
        </div>

        <div className={`production-grid is-${viewMode}`}>
          {tracks.map((track, index) => {
            const trackPlaying = selectedTrack?.id === track.id && (isPlaying || playIntentTrackId === track.id);
            const buttonLabel = `${trackPlaying ? 'Pause' : 'Play'} ${track.title}`;
            return (
              <article className={trackPlaying ? 'production-card playing' : 'production-card'} key={track.id}>
                <div className={track.videoUrl ? 'production-thumb has-video' : 'production-thumb'}>
                  {track.videoUrl ? (
                    <video
                      className="production-media"
                      src={track.videoUrl}
                      poster={track.coverImageUrl}
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    // Plain img preserves the remote artwork's natural aspect ratio.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="production-media" src={track.coverImageUrl} alt="" loading={index < 3 ? 'eager' : 'lazy'} />
                  )}
                  <button
                    className="thumb-play-surface"
                    onClick={() => toggleTrack(track)}
                    aria-label={buttonLabel}
                    type="button"
                    disabled={!track.audioUrl}
                  />
                  <div className="thumb-actions">
                    <button className="icon-button" onClick={() => toggleTrack(track)} aria-label={buttonLabel} type="button" disabled={!track.audioUrl}>
                      {trackPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <button className="icon-button" onClick={() => setInfoTrackId(track.id)} aria-label={`Open words for ${track.title}`} type="button">
                      <InfoIcon />
                    </button>
                    {track.mp3Url && (
                      <a className="icon-button" href={downloadTrackHref(site, track)} aria-label={`Download MP3 for ${track.title}`}>
                        <DownloadIcon />
                      </a>
                    )}
                  </div>
                  <div className="production-caption">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{track.title}</strong>
                    <em>{formatDuration(track.durationSeconds)}</em>
                  </div>
                </div>
              </article>
            );
          })}
          {tracks.length === 0 && <p className="empty-state">No matching words found.</p>}
        </div>
      </section>

      <section className="now-playing-dock" aria-label="Player">
        <div>
          <span>Now playing</span>
          <strong>{selectedTrack?.title || 'Choose a production'}</strong>
        </div>
        <div className="player-control-row">
          <audio
            ref={audioRef}
            src={selectedTrack?.audioUrl}
            controls
            preload="metadata"
            onEnded={() => {
              setPlayIntentTrackId(null);
              playNext();
            }}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onError={() => {
              setIsPlaying(false);
              setPlayIntentTrackId(null);
            }}
          />
          <button
            className="icon-button airplay-button"
            onClick={openAirPlayPicker}
            aria-label="Send audio to TV"
            type="button"
            disabled={!selectedTrack || !airPlayAvailable}
          >
            <AirPlayIcon />
          </button>
        </div>
      </section>

      {infoTrack && (
        <section className="words-overlay" role="dialog" aria-modal="true" aria-label={`Words for ${infoTrack.title}`}>
          {infoTrack.videoUrl ? (
            <video
              className="words-video-bg"
              src={infoTrack.videoUrl}
              poster={infoTrack.coverImageUrl}
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <div className="words-still-bg" style={{ backgroundImage: `url(${infoTrack.coverImageUrl})` }} />
          )}
          <div className="words-shade" />
          <div className="words-panel">
            <div className="words-header">
              <div>
                <div className="kicker">Production {String(infoTrack.sortOrder).padStart(2, '0')}</div>
                <h2>{infoTrack.title}</h2>
              </div>
              <button className="icon-button close-button" onClick={() => setInfoTrackId(null)} aria-label="Close" type="button">
                <CloseIcon />
              </button>
            </div>
            <div className="words-actions">
              <button className="pill action-pill" onClick={() => toggleTrack(infoTrack)} type="button" disabled={!infoTrack.audioUrl}>
                {selectedTrack?.id === infoTrack.id && (isPlaying || playIntentTrackId === infoTrack.id) ? <PauseIcon /> : <PlayIcon />}
                {selectedTrack?.id === infoTrack.id && (isPlaying || playIntentTrackId === infoTrack.id) ? 'Pause' : 'Play'}
              </button>
              {infoTrack.mp3Url && (
                <a className="download-button compact" href={downloadTrackHref(site, infoTrack)}>
                  <DownloadIcon /> MP3
                </a>
              )}
              {infoTrack.sourceUrl && <a className="pill" href={infoTrack.sourceUrl}>Suno</a>}
            </div>
            <div className="words-reader">
              {wordRows(infoTrack).map((line) => (
                line.pause
                  ? <div className="word-break" key={line.id} />
                  : <p key={line.id}>{line.text}</p>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
