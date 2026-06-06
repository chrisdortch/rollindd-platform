'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { Site, Track } from '@/lib/types';
import { searchLyrics, snippetFor } from '@/lib/search';

function formatDuration(seconds?: number) {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedSnippet({ snippet, query }: { snippet: string; query: string }) {
  const q = query.trim().replace(/^"/, '').replace(/"$/, '');
  if (!q) return <>{snippet}</>;

  const parts = snippet.split(new RegExp(`(${escapeRegExp(q)})`, 'ig'));
  return (
    <>
      {parts.map((part, index) => (
        part.toLowerCase() === q.toLowerCase() ? <mark key={`${part}-${index}`}>{part}</mark> : part
      ))}
    </>
  );
}

function lyricRows(track: Track) {
  return track.lyrics.split(/\r?\n/).map((line, index) => ({
    id: `${track.id}-${index}`,
    text: line.trim(),
    direction: /^\[.*\]$/.test(line.trim())
  }));
}

function downloadTrackHref(site: Site, track: Track) {
  return `/api/download-track?site=${encodeURIComponent(site.slug)}&track=${encodeURIComponent(track.id)}`;
}

function downloadAllHref(site: Site) {
  return `/api/download-all?site=${encodeURIComponent(site.slug)}`;
}

export function RollinSite({ site }: { site: Site }) {
  const sortedTracks = useMemo(
    () => [...site.tracks].sort((a, b) => a.sortOrder - b.sortOrder),
    [site.tracks]
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [query, setQuery] = useState('');
  const [exact, setExact] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | undefined>(sortedTracks[0]);
  const [queueActive, setQueueActive] = useState(false);
  const [autoPlayRequested, setAutoPlayRequested] = useState(false);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  const tracks = useMemo(
    () => searchLyrics(sortedTracks, query, exact),
    [exact, query, sortedTracks]
  );
  const downloadableCount = sortedTracks.filter((track) => track.downloadable && track.mp3Url).length;
  const selectedIndex = selectedTrack ? sortedTracks.findIndex((track) => track.id === selectedTrack.id) : -1;
  const heroStyle = { '--hero-image': `url(${selectedTrack?.coverImageUrl || site.theme.hero.imageUrl})` } as CSSProperties;

  useEffect(() => {
    if (!autoPlayRequested || !audioRef.current) return;
    audioRef.current.play().catch(() => undefined);
    setAutoPlayRequested(false);
  }, [autoPlayRequested, selectedTrack]);

  function playTrack(track: Track, queue = false) {
    setSelectedTrack(track);
    setQueueActive(queue);
    setAutoPlayRequested(true);
  }

  function playAll() {
    const firstPlayable = sortedTracks.find((track) => track.audioUrl);
    if (firstPlayable) playTrack(firstPlayable, true);
  }

  function playNext() {
    if (!sortedTracks.length) return;
    const nextTrack = sortedTracks[(selectedIndex + 1) % sortedTracks.length];
    playTrack(nextTrack, queueActive);
  }

  function handleEnded() {
    if (queueActive) playNext();
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
        <Link className="brand-lockup" href="/"><span className="logo-mark">R</span><span>ROLLINDD</span></Link>
        <label className="toolbar-search">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, lyric, mood"
          />
        </label>
        <button className={exact ? 'tool-button active' : 'tool-button'} onClick={() => setExact((value) => !value)}>
          Exact
        </button>
        <nav className="nav-pills" aria-label="Site navigation">
          <Link className="pill" href="/admin">Admin</Link>
          <a className="admin-chip" href={site.sunoPlaylistUrl || '#'}>Suno</a>
        </nav>
      </header>

      <section className="library-hero" style={heroStyle}>
        <div className="now-art" style={{ backgroundImage: `url(${selectedTrack?.coverImageUrl || site.theme.hero.imageUrl})` }} />
        <div className="now-copy">
          <div className="kicker">{site.status}</div>
          <h1>{site.title}</h1>
          <p className="lede">{site.tagline || site.theme.hero.subheadline}</p>
          <div className="now-title">
            <span>Now selected</span>
            <strong>{selectedTrack?.title || 'Choose a track'}</strong>
          </div>
          <div className="cta-row">
            <button className="gold-button" onClick={() => selectedTrack && playTrack(selectedTrack)}>Play Selected</button>
            <button className="ghost-button" onClick={playAll} disabled={!downloadableCount}>Play All</button>
            <a className={downloadableCount ? 'download-button' : 'download-button disabled'} href={downloadableCount ? downloadAllHref(site) : undefined}>
              Download All
            </a>
          </div>
          <audio
            ref={audioRef}
            src={selectedTrack?.audioUrl}
            controls
            preload="metadata"
            onEnded={handleEnded}
          />
        </div>
      </section>

      <section id="tracks" className="library-section" aria-label="Tracks">
        <div className="library-heading">
          <div>
            <div className="kicker">Library</div>
            <h2>{tracks.length === sortedTracks.length ? `${sortedTracks.length} Songs` : `${tracks.length} Matches`}</h2>
          </div>
          <span className="badge">{downloadableCount} MP3 downloads</span>
        </div>

        <div className="track-list">
          {tracks.map((track, index) => {
            const selected = selectedTrack?.id === track.id;
            const expanded = expandedTrackId === track.id;
            return (
              <article className={selected ? 'track-row selected' : 'track-row'} key={track.id}>
                <button className="row-play" onClick={() => playTrack(track, queueActive)} aria-label={`Play ${track.title}`}>
                  <span className="row-thumb" style={{ backgroundImage: `url(${track.coverImageUrl})` }} />
                  <span className="row-play-symbol">{selected ? 'Playing' : 'Play'}</span>
                </button>
                <div className="track-main">
                  <div className="track-meta">
                    <span className="track-number">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{track.title}</h3>
                      <p>
                        {formatDuration(track.durationSeconds)} · {track.mediaStatus || 'partial'}
                        {query && <span> · <HighlightedSnippet snippet={snippetFor(track, query)} query={query} /></span>}
                      </p>
                    </div>
                  </div>
                  <div className="track-actions">
                    <button className="ghost-button compact" onClick={() => setExpandedTrackId(expanded ? null : track.id)}>
                      {expanded ? 'Hide Info' : 'More Info'}
                    </button>
                    {track.mp3Url && (
                      <a className="download-button compact" href={downloadTrackHref(site, track)}>
                        MP3
                      </a>
                    )}
                  </div>
                </div>
                {expanded && (
                  <div className="track-detail">
                    <div className="detail-toolbar">
                      {track.sourceUrl && <a className="pill" href={track.sourceUrl}>Suno Track</a>}
                      {track.videoUrl && <a className="pill" href={track.videoUrl}>Video</a>}
                    </div>
                    <div className="lyrics-reader">
                      {lyricRows(track).map((line) => (
                        line.text
                          ? <p className={line.direction ? 'lyric-direction' : ''} key={line.id}>{line.text}</p>
                          : <div className="lyric-break" key={line.id} />
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          {tracks.length === 0 && <p className="empty-state">No matching lyrics found.</p>}
        </div>
      </section>

      <section className="apple-music-note">
        <strong>Apple Music</strong>
        <span>Download All includes every MP3, a playlist file, and import instructions. After download, unzip it and import the folder or `RollinDD.m3u` into Apple Music.</span>
      </section>
    </main>
  );
}
