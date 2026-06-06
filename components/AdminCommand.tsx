'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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

type PlatformStatus = {
  mode: string;
  database: {
    configured: boolean;
    reachable: boolean;
    schemaReady: boolean;
    missingTables: string[];
    message: string;
  };
  admin: {
    configured: boolean;
    required: boolean;
    headerName: string;
    mode: string;
    message: string;
  };
  release: {
    environment: string;
    branch: string;
    commit: string;
    deploymentUrl: string;
  };
  checks: Array<{ label: string; status: 'ready' | 'attention' | 'blocked'; detail: string }>;
  nextActions: string[];
};

type CommandResult = {
  status?: string;
  persistence?: string;
  completed?: string[];
  nextSteps?: string[];
  riskNotes?: string[];
  site?: {
    slug?: string;
    title?: string;
    primaryDomain?: string;
    tracks?: unknown[];
  };
};

type SchemaResult = {
  ok?: boolean;
  status?: string;
  applied?: string[];
  error?: string;
  nextSteps?: string[];
  after?: PlatformStatus['database'];
};

export function AdminCommand() {
  const [command, setCommand] = useState(defaultCommand);
  const [url, setUrl] = useState('https://suno.com/playlist/example');
  const [result, setResult] = useState<CommandResult | null>(null);
  const [schemaResult, setSchemaResult] = useState<SchemaResult | null>(null);
  const [rawResult, setRawResult] = useState('');
  const [adminSecret, setAdminSecret] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem('rollindd-admin-secret') || '';
  });
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  const adminSecretRequired = Boolean(platformStatus?.admin.required);
  const canUseAdminActions = !adminSecretRequired || adminSecret.trim().length > 0;

  async function refreshStatus() {
    setStatusLoading(true);
    try {
      const response = await fetch('/api/platform-status');
      const json = await response.json();
      setPlatformStatus(json);
    } catch (error) {
      setPlatformStatus({
        mode: 'unknown',
        database: {
          configured: false,
          reachable: false,
          schemaReady: false,
          missingTables: [],
          message: error instanceof Error ? error.message : 'Status check failed.'
        },
        admin: {
          configured: false,
          required: true,
          headerName: 'x-rollindd-admin-secret',
          mode: 'unknown',
          message: 'Admin status check failed.'
        },
        release: { environment: '', branch: '', commit: '', deploymentUrl: '' },
        checks: [{ label: 'Platform status', status: 'blocked', detail: 'Status check failed.' }],
        nextActions: ['Refresh the admin page and retry the status check.']
      });
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadInitialStatus() {
      try {
        const response = await fetch('/api/platform-status');
        const json = await response.json();
        if (mounted) setPlatformStatus(json);
      } catch (error) {
        if (mounted) {
          setPlatformStatus({
            mode: 'unknown',
            database: {
              configured: false,
              reachable: false,
              schemaReady: false,
              missingTables: [],
              message: error instanceof Error ? error.message : 'Status check failed.'
            },
            admin: {
              configured: false,
              required: true,
              headerName: 'x-rollindd-admin-secret',
              mode: 'unknown',
              message: 'Admin status check failed.'
            },
            release: { environment: '', branch: '', commit: '', deploymentUrl: '' },
            checks: [{ label: 'Platform status', status: 'blocked', detail: 'Status check failed.' }],
            nextActions: ['Refresh the admin page and retry the status check.']
          });
        }
      } finally {
        if (mounted) setStatusLoading(false);
      }
    }

    void loadInitialStatus();
    return () => {
      mounted = false;
    };
  }, []);

  function adminHeaders(): Record<string, string> {
    return adminSecret.trim() ? { 'x-rollindd-admin-secret': adminSecret.trim() } : {};
  }

  function rememberAdminSecret(value: string) {
    setAdminSecret(value);
    if (typeof window !== 'undefined') window.sessionStorage.setItem('rollindd-admin-secret', value);
  }

  async function runCommand() {
    setLoading(true);
    try {
      const response = await fetch('/api/central-command', { method: 'POST', headers: { 'content-type': 'application/json', ...adminHeaders() }, body: JSON.stringify({ command }) });
      const json = await response.json();
      setResult(json);
      setRawResult(JSON.stringify(json, null, 2));
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  }

  async function applySchema() {
    setSchemaLoading(true);
    try {
      const response = await fetch('/api/admin/apply-schema', { method: 'POST', headers: adminHeaders() });
      const json = await response.json();
      setSchemaResult(json);
      setRawResult(JSON.stringify(json, null, 2));
      await refreshStatus();
    } finally {
      setSchemaLoading(false);
    }
  }

  async function fetchPlaylist() {
    setLoading(true);
    try {
      const response = await fetch('/api/fetch-suno', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ playlistUrl: url }) });
      const json = await response.json();
      setResult(null);
      setRawResult(JSON.stringify(json, null, 2));
    } finally {
      setLoading(false);
    }
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
      <section className="command-panel">
        <div className="section-row" style={{ marginTop: 0 }}>
          <div>
            <div className="kicker">Platform Readiness</div>
            <h2>{platformStatus?.mode === 'database' ? 'Database mode is ready.' : 'Demo fallback is active.'}</h2>
          </div>
          <button className="ghost-button" onClick={refreshStatus} disabled={statusLoading}>{statusLoading ? 'Checking...' : 'Recheck'}</button>
        </div>
        {platformStatus && (
          <>
            <div className="readiness-grid">
              {platformStatus.checks.map((check) => (
                <div className="readiness-card" key={check.label}>
                  <div className={`status-line status-${check.status}`}><span />{check.status}</div>
                  <h3>{check.label}</h3>
                  <p>{check.detail}</p>
                </div>
              ))}
            </div>
            <div className="release-row">
              <span className="mono-chip">{platformStatus.release.environment || 'local'}</span>
              {platformStatus.release.branch && <span className="mono-chip">{platformStatus.release.branch}</span>}
              {platformStatus.release.commit && <span className="mono-chip">{platformStatus.release.commit}</span>}
              <span className="mono-chip">{platformStatus.database.schemaReady ? 'schema ready' : 'schema pending'}</span>
              <span className="mono-chip">{platformStatus.admin.configured ? 'admin secret set' : 'admin secret missing'}</span>
            </div>
            {!platformStatus.database.schemaReady && (
              <div className="next-action-box">
                {platformStatus.nextActions.map((item) => <span key={item}>{item}</span>)}
              </div>
            )}
          </>
        )}
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
        <div className="section-row" style={{ marginTop: 0 }}>
          <div>
            <div className="kicker">Admin Access</div>
            <h2>{platformStatus?.admin.configured ? 'Admin key required.' : 'Admin key is not configured.'}</h2>
          </div>
          <button className="ghost-button" onClick={() => rememberAdminSecret('')} disabled={!adminSecret}>Clear</button>
        </div>
        <div className="input-row">
          <input type="password" value={adminSecret} onChange={(event) => rememberAdminSecret(event.target.value)} placeholder="ROLLINDD_ADMIN_SECRET" />
          <button className="ghost-button" onClick={applySchema} disabled={schemaLoading || !platformStatus?.database.configured || platformStatus.database.schemaReady || !canUseAdminActions}>
            {schemaLoading ? 'Applying...' : 'Apply Schema'}
          </button>
        </div>
        <p className="helper">{platformStatus?.admin.message}</p>
        {schemaResult && (
          <div className="detail-list">
            <strong>Schema</strong>
            <span>{schemaResult.error || schemaResult.after?.message || schemaResult.status || 'Schema action finished.'}</span>
            {schemaResult.applied?.length ? <span>{schemaResult.applied.length} statements applied.</span> : null}
          </div>
        )}
      </section>
      <section className="command-panel">
        <div className="section-row" style={{ marginTop: 0 }}><h2>RollinDD Central Command</h2><button className="gold-button" onClick={runCommand} disabled={loading || !canUseAdminActions}>{loading ? 'Running...' : 'Run Safe Actions'}</button></div>
        <textarea rows={12} value={command} onChange={(e) => setCommand(e.target.value)} />
        <p className="helper">The command result will tell you completed actions, risk notes, and exact next steps.</p>
      </section>
      {(result || rawResult) && (
        <section className="command-panel">
          <h2>Result</h2>
          {result && (
            <div className="result-summary">
              <div className="status-box">Status<br/><strong>{result.status || 'unknown'}</strong></div>
              <div className="status-box">Persistence<br/><strong>{result.persistence || 'n/a'}</strong></div>
              <div className="status-box">Site<br/><strong>{result.site?.slug || 'preview'}</strong></div>
              <div className="status-box">Tracks<br/><strong>{result.site?.tracks?.length || 0}</strong></div>
            </div>
          )}
          {result?.completed?.length ? <div className="detail-list"><strong>Completed</strong>{result.completed.map((item) => <span key={item}>{item}</span>)}</div> : null}
          {result?.nextSteps?.length ? <div className="detail-list"><strong>Next Steps</strong>{result.nextSteps.map((item) => <span key={item}>{item}</span>)}</div> : null}
          {result?.riskNotes?.length ? <div className="detail-list"><strong>Risk Notes</strong>{result.riskNotes.map((item) => <span key={item}>{item}</span>)}</div> : null}
          <pre className="command-result">{rawResult}</pre>
        </section>
      )}
    </div>
  );
}
