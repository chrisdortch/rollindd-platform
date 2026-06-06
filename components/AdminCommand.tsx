'use client';

import Link from 'next/link';
import { useState } from 'react';

const defaultCommand = `ROLLINDD LAUNCH

Site name: Neon Rain
Suno playlist: https://suno.com/playlist/example
Domain: neonrain.com
Theme instruction: cinematic cyberpunk heartbreak, rain, neon, spiritual resilience, gold-on-black luxury
Artist names: hide
Lyrics search: enabled
Exact match: enabled
Download all MP3s: capability_check
Budget mode: lowest cost
Autonomy: safe_max`;

export function AdminCommand() {
  const [command, setCommand] = useState(defaultCommand);
  const [url, setUrl] = useState('https://suno.com/playlist/example');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function runCommand() {
    setLoading(true);
    const response = await fetch('/api/central-command', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ command }) });
    const json = await response.json();
    setResult(JSON.stringify(json, null, 2));
    setLoading(false);
  }

  async function fetchPlaylist() {
    setLoading(true);
    const response = await fetch('/api/fetch-suno', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ playlistUrl: url }) });
    const json = await response.json();
    setResult(JSON.stringify(json, null, 2));
    setLoading(false);
  }

  return (
    <div className="shell">
      <header className="brand-row">
        <Link className="brand-lockup" href="/"><span className="logo-mark">R</span><span>ROLLINDD</span></Link>
        <Link className="pill" href="/">Preview Site</Link>
      </header>
      <section className="hero" style={{ minHeight: 280 }}>
        <div className="hero-content">
          <div className="kicker">Central Command</div>
          <h1>Build the site from vision.</h1>
          <p className="lede">Paste a RollinDD command, or paste a Suno playlist and press Fetch. This starter runs safely in preview/demo mode until GitHub, Vercel, database, and storage are connected.</p>
        </div>
      </section>
      <div className="two-col">
        <section className="command-panel">
          <div className="kicker">Suno Playlist URL</div>
          <div className="input-row" style={{ marginTop: 10 }}>
            <input value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="gold-button" onClick={fetchPlaylist} disabled={loading}>Fetch</button>
          </div>
          <p className="helper">Fetch attempts public metadata first, then falls back to demo data. No credentials or private account scraping.</p>
          <div className="status-grid">
            <div className="status-box">Cover Art<br/><strong>check</strong></div>
            <div className="status-box">Video<br/><strong>if available</strong></div>
            <div className="status-box">Audio<br/><strong>if available</strong></div>
            <div className="status-box">Lyrics<br/><strong>indexed</strong></div>
          </div>
        </section>
        <section className="command-panel">
          <div className="kicker">Settings</div>
          {['Embed cover/video/audio','Hide artist names','Enable lyric search','Exact match search','Lazy-load covers top-to-bottom'].map((item) => <div className="toggle-row" key={item}><span>{item}</span><span className="toggle on"><span /></span></div>)}
        </section>
      </div>
      <section className="command-panel">
        <div className="section-row" style={{ marginTop: 0 }}><h2>RollinDD Central Command</h2><button className="gold-button" onClick={runCommand} disabled={loading}>{loading ? 'Running...' : 'Run Safe Actions'}</button></div>
        <textarea rows={12} value={command} onChange={(e) => setCommand(e.target.value)} />
        <p className="helper">The command result will tell you completed actions, risk notes, and exact next steps.</p>
      </section>
      {result && <section className="command-panel"><h2>Result</h2><pre className="command-result">{result}</pre></section>}
    </div>
  );
}
