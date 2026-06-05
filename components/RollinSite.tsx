 'use client';

import { useMemo, useState } from 'react';
import type { Site, Track } from '@/lib/types';
import { highlightSnippet, searchLyrics, snippetFor } from '@/lib/search';

function formatTime(seconds?: number) {
  if (!seconds) return '3:47';
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function RollinSite({ site }: { site: Site }) {
  const [query, setQuery] = useState('');
  const [exact, setExact] = useState(true);
  const [selected, setSelected] = useState<Track | null>(null);
  const [nowPlaying, setNowPlaying] = useState<Track>(site.tracks[1] || site.tracks[0]);
  const results = useMemo(() => searchLyrics(site.tracks, query, exact), [site.tracks, query, exact]);
  const style = {
    '--accent': site.theme.palette.accent,
    '--accent-2': site.theme.palette.accent2,
    '--hero-image': `url(${site.theme.hero.imageUrl})`
  } as React.CSSProperties;

  function playTrack(track: Track) {
    setNowPlaying(track);
    setSelected(track);
  }

  return (
    <main className="shell" style={style}>
      <header className="brand-row">
        <a className="brand-lockup" href="/">
          <span className="logo-mark">R</span>
          <span>ROLLINDD</span>
        </a>
        <nav className="nav-pills">
          <a className="pill" href="#search">Search</a>
          <a className="admin-chip" href="/admin">Admin</a>
          <button className="icon-button" aria-label="Menu">☰</button>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="kicker">Playlist Premiere</div>
          <h1>{site.theme.hero.headline}</h1>
          <p className="lede">{site.tagline}</p>
          <div className="cta-row">
            <button className="gold-button" onClick={() => playTrack(site.tracks[0])}>▶ Play Featured</button>
            <a className="ghost-button" href="#playlist">Explore Collection</a>
          </div>
        </div>
      </section>

      <section id="search" className="search-card">
        <div className="section-row" style={{ marginTop: 0 }}>
          <div>
            <div className="kicker">Lyric Search</div>
            <h2>Find songs by the words that matter.</h2>
          </div>
          <label className="pill" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            Exact Match
            <input type="checkbox" checked={exact} onChange={(e) => setExact(e.target.checked)} aria-label="Exact match" />
          </label>
        </div>
        <input className="search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lyrics inside this playlist..." />
        {query && (
          <div style={{ marginTop: 16 }}>
            <div className="badge">{results.length} {exact ? 'exact' : 'matching'} result{results.length === 1 ? '' : 's'}</div>
            <div className="search-results" style={{ marginTop: 12 }}>
              {results.slice(0, 4).map((track) => (
                <button key={track.id} className="result-row" onClick={() => playTrack(track)}>
                  <div className="result-art" style={{ backgroundImage: `url(${track.coverImageUrl})` }} />
                  <div style={{ textAlign: 'left' }}>
                    <h3>{track.title}</h3>
                    <p className="helper" dangerouslySetInnerHTML={{ __html: highlightSnippet(snippetFor(track, query), query) }} />
                  </div>
                  <span className="icon-button">▶</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section id="playlist">
        <div className="section-row">
          <h2>{site.title}</h2>
          <span className="badge">{site.tracks.length} Tracks</span>
        </div>
        <div className="grid">
          {site.tracks.map((track) => (
            <button key={track.id} className="track-card" onClick={() => playTrack(track)}>
              <div className="cover" style={{ backgroundImage: `url(${track.coverImageUrl})` }}>
                <span className="play-dot">▶</span>
              </div>
              <div className="track-title">{track.sortOrder}. {track.title}</div>
            </button>
          ))}
        </div>
      </section>

      <div className="mini-player">
        <div className="mini-thumb" style={{ backgroundImage: `url(${nowPlaying.coverImageUrl})` }} />
        <div>
          <strong>{nowPlaying.title}</strong>
          <div className="helper" style={{ marginTop: 2, color: 'var(--accent-2)' }}>Now Playing</div>
        </div>
        <div className="player-controls">
          <button className="icon-button">⏮</button>
          <button className="round-gold" onClick={() => setSelected(nowPlaying)}>Ⅱ</button>
          <button className="icon-button">⏭</button>
        </div>
      </div>

      <div className="bottom-nav">
        <span>⌂<br/>Home</span>
        <span>⌕<br/>Search</span>
        <span>♡<br/>Favorites</span>
        <a className="admin-chip" href="/admin">▣ Admin</a>
      </div>

      {selected && (
        <section className="full-player" style={{ backgroundImage: `url(${selected.coverImageUrl})` }}>
          <div className="player-top">
            <button className="icon-button" onClick={() => setSelected(null)}>⌄</button>
            <div className="brand-lockup"><span className="logo-mark">R</span><span>ROLLINDD</span></div>
            <button className="icon-button">•••</button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <h2>{selected.title}</h2>
            <div className="kicker" style={{ marginTop: 10 }}>Lyrics Overlay</div>
          </div>
          <div className="lyric-stack">
            {selected.lyrics.split('
').filter(Boolean).slice(0, 7).map((line, index) => (
              <div key={line + index} className={index === 3 ? 'lyric-current' : 'lyric-line'}>{line}</div>
            ))}
          </div>
          <div className="player-bottom">
            <div className="progress"><span /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>1:24</span><span>{formatTime(selected.durationSeconds)}</span></div>
            <div className="player-controls" style={{ justifyContent: 'center', margin: '20px 0' }}>
              <button className="icon-button">⤨</button><button className="icon-button">⏮</button><button className="round-gold">Ⅱ</button><button className="icon-button">⏭</button><button className="icon-button">⟳</button>
            </div>
            <div className="segment"><button>Art</button><button className="active">Lyrics</button><button>Video</button></div>
          </div>
        </section>
      )}
    </main>
  );
}
