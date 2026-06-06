'use client';

import { useMemo, useState } from 'react';
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

function lyricLines(track: Track) {
  const lines = track.lyrics.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines.slice(0, 5) : ['Lyrics will appear here when available.'];
}

export function RollinSite({ site }: { site: Site }) {
  const sortedTracks = useMemo(
    () => [...site.tracks].sort((a, b) => a.sortOrder - b.sortOrder),
    [site.tracks]
  );
  const [query, setQuery] = useState('');
  const [exact, setExact] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track>(sortedTracks[0]);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'Art' | 'Lyrics' | 'Video'>('Lyrics');

  const tracks = useMemo(
    () => searchLyrics(sortedTracks, query, exact),
    [exact, query, sortedTracks]
  );

  const downloadableCount = sortedTracks.filter((track) => track.downloadable && track.mp3Url).length;
  const heroStyle = {
    '--hero-image': `url(${site.theme.hero.imageUrl})`
  } as CSSProperties;

  function openTrack(track: Track) {
    setSelectedTrack(track);
    setActiveTab(track.videoUrl ? 'Video' : 'Lyrics');
    setPlayerOpen(true);
  }

  return (
    <main className="shell" style={{
      '--bg': site.theme.palette.background,
      '--surface': site.theme.palette.surface,
      '--text': site.theme.palette.text,
      '--muted': site.theme.palette.muted,
      '--accent': site.theme.palette.accent,
      '--accent-2': site.theme.palette.accent2
    } as CSSProperties}>
      <header className="brand-row">
        <Link className="brand-lockup" href="/"><span className="logo-mark">R</span><span>ROLLINDD</span></Link>
        <nav className="nav-pills" aria-label="Site navigation">
          <Link className="pill" href="/admin">Admin</Link>
          <a className="admin-chip" href={site.sunoPlaylistUrl || '#'}>Playlist</a>
        </nav>
      </header>

      <section className="hero" style={heroStyle}>
        <div className="hero-content">
          <div className="kicker">{site.status}</div>
          <h1>{site.theme.hero.headline}</h1>
          <p className="lede">{site.tagline || site.theme.hero.subheadline}</p>
          <div className="cta-row">
            <button className="gold-button" onClick={() => openTrack(selectedTrack)}>Play Featured</button>
            <a className="ghost-button" href="#tracks">Browse Tracks</a>
            <button className="danger-button" disabled={downloadableCount === 0} title={downloadableCount ? 'Download available MP3s' : 'No downloadable MP3s available yet'}>
              Download MP3s
            </button>
          </div>
        </div>
      </section>

      <section className="search-card" aria-label="Lyrics search">
        <div className="section-row" style={{ marginTop: 0 }}>
          <h2>Lyric Search</h2>
          <button className={exact ? 'gold-button' : 'ghost-button'} onClick={() => setExact((value) => !value)}>
            Exact
          </button>
        </div>
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title or lyrics"
        />
        {query && (
          <div className="search-results" style={{ marginTop: 12 }}>
            {tracks.map((track) => (
              <button className="result-row" key={track.id} onClick={() => openTrack(track)}>
                <span className="result-art" style={{ backgroundImage: `url(${track.coverImageUrl})` }} />
                <span>
                  <strong>{track.title}</strong>
                  <span className="helper" style={{ display: 'block' }}>
                    <HighlightedSnippet snippet={snippetFor(track, query)} query={query} />
                  </span>
                </span>
                <span className="icon-button">{formatDuration(track.durationSeconds)}</span>
              </button>
            ))}
            {tracks.length === 0 && <p className="helper">No matching lyrics found.</p>}
          </div>
        )}
      </section>

      <section id="tracks" aria-label="Tracks">
        <div className="section-row">
          <h2>{site.title}</h2>
          <span className="badge">{sortedTracks.length} tracks</span>
        </div>
        <div className="grid">
          {tracks.map((track) => (
            <button className="track-card" key={track.id} onClick={() => openTrack(track)}>
              <span className="cover" style={{ backgroundImage: `url(${track.coverImageUrl})` }}>
                <span className="play-dot">Play</span>
              </span>
              <span className="track-title">{track.title}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedTrack && (
        <section className="mini-player" aria-label="Selected track">
          <div className="mini-thumb" style={{ backgroundImage: `url(${selectedTrack.coverImageUrl})` }} />
          <div>
            <strong>{selectedTrack.title}</strong>
            <div className="helper">{formatDuration(selectedTrack.durationSeconds)} · {selectedTrack.mediaStatus || 'partial'}</div>
          </div>
          <div className="player-controls">
            {selectedTrack.audioUrl && <audio src={selectedTrack.audioUrl} controls />}
            <button className="round-gold" onClick={() => setPlayerOpen(true)}>Play</button>
          </div>
        </section>
      )}

      <nav className="bottom-nav" aria-label="Site status">
        <span>{site.theme.search.exactMatchAvailable ? 'Exact Search' : 'Search'}</span>
        <span>{site.theme.grid.showArtistNames ? 'Artists Visible' : 'Artists Hidden'}</span>
        <span>{downloadableCount ? `${downloadableCount} Downloads` : 'Downloads Locked'}</span>
      </nav>

      {playerOpen && selectedTrack && (
        <section className="full-player" style={{ backgroundImage: `url(${selectedTrack.coverImageUrl})` }}>
          <div className="player-top">
            <div>
              <div className="kicker">{activeTab}</div>
              <h2>{selectedTrack.title}</h2>
            </div>
            <button className="icon-button" onClick={() => setPlayerOpen(false)}>Close</button>
          </div>

          {activeTab === 'Lyrics' && (
            <div className="lyric-stack">
              {lyricLines(selectedTrack).map((line, index) => (
                <div className={index === 1 ? 'lyric-current' : 'lyric-line'} key={`${selectedTrack.id}-${line}`}>
                  {line}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Art' && <div className="lyric-stack"><div className="lyric-current">{selectedTrack.title}</div></div>}
          {activeTab === 'Video' && (
            <div className="lyric-stack">
              {selectedTrack.videoUrl ? <video src={selectedTrack.videoUrl} controls playsInline /> : <div className="lyric-current">Video pending</div>}
            </div>
          )}

          <div className="player-bottom">
            {selectedTrack.audioUrl && <audio src={selectedTrack.audioUrl} controls style={{ width: '100%' }} />}
            <div className="progress"><span /></div>
            <div className="segment">
              {site.theme.player.tabs.map((tab) => (
                <button className={activeTab === tab ? 'active' : ''} key={tab} onClick={() => setActiveTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
