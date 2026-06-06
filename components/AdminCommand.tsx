'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandLockup } from '@/components/BrandLockup';

const defaultPlaylistUrl = 'https://suno.com/playlist/782a2eb4-404b-47c3-b992-d5c2be81a5a0';

const defaultCommand = `ROLLINDD LAUNCH

Site name: RollinDD
Suno playlist: ${defaultPlaylistUrl}
Domain: rollindd-platform.vercel.app
Theme instruction: fearlessness, love, wisdom, patience, collaboration, competition, luminous cinematic resilience
Artist names: hide
Words search: enabled
Quoted line search: enabled
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
    pinEnabled?: boolean;
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

type SessionStatus = {
  authenticated: boolean;
  configured?: boolean;
  required?: boolean;
  mode?: string;
  message?: string;
};

export function AdminCommand() {
  const [command, setCommand] = useState(defaultCommand);
  const [url, setUrl] = useState(defaultPlaylistUrl);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [schemaResult, setSchemaResult] = useState<SchemaResult | null>(null);
  const [rawResult, setRawResult] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState('');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  const adminSecretRequired = platformStatus?.admin.required ?? true;
  const adminUnlocked = Boolean(platformStatus && (!adminSecretRequired || sessionStatus?.authenticated));
  const showAdminGate = statusLoading || !adminUnlocked;
  const canUseAdminActions = adminUnlocked;

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
        const [statusResponse, sessionResponse] = await Promise.all([
          fetch('/api/platform-status'),
          fetch('/api/admin/session')
        ]);
        const json = await statusResponse.json();
        const sessionJson = await sessionResponse.json();
        if (mounted) setPlatformStatus(json);
        if (mounted) setSessionStatus(sessionJson);
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

  async function refreshSession() {
    const response = await fetch('/api/admin/session');
    const json = await response.json();
    setSessionStatus(json);
    return json as SessionStatus;
  }

  async function unlockAdmin() {
    setSessionLoading(true);
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin: adminPin })
      });
      const json = await response.json();
      setSessionStatus(json);
      if (response.ok) {
        setAdminPin('');
        setAdminError('');
      } else {
        setAdminError(json.error || 'That PIN did not unlock admin.');
      }
      setRawResult(JSON.stringify(json, null, 2));
    } finally {
      setSessionLoading(false);
    }
  }

  async function lockAdmin() {
    setSessionLoading(true);
    try {
      await fetch('/api/admin/session', { method: 'DELETE' });
      setAdminPin('');
      setAdminError('');
      await refreshSession();
    } finally {
      setSessionLoading(false);
    }
  }

  async function runCommand() {
    setLoading(true);
    try {
      const response = await fetch('/api/central-command', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ command }) });
      const json = await response.json();
      setResult(json);
      setRawResult(JSON.stringify(json, null, 2));
      await refreshStatus();
      await refreshSession();
    } finally {
      setLoading(false);
    }
  }

  async function applySchema() {
    setSchemaLoading(true);
    try {
      const response = await fetch('/api/admin/apply-schema', { method: 'POST' });
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
      const response = await fetch('/api/fetch-suno', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          playlistUrl: url,
          themePrompt: 'fearlessness, love, wisdom, patience, collaboration, competition, luminous cinematic resilience',
          save: true
        })
      });
      const json = await response.json();
      setResult(json);
      setRawResult(JSON.stringify(json, null, 2));
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  }

  if (showAdminGate) {
    return (
      <main className="admin-gate-shell">
        <section className="admin-gate-card" aria-label="Admin access">
          <BrandLockup />
          <div className="admin-key-icon" aria-hidden="true">
            <span />
          </div>
          <div>
            <div className="kicker">Admin Access</div>
            <h1>{statusLoading ? 'Checking access.' : 'Enter admin PIN.'}</h1>
            <p className="lede">
              {statusLoading
                ? 'Confirming the RollinDD admin session.'
                : 'Unlock Central Command to fetch, save, and publish productions.'}
            </p>
          </div>
          <div className="admin-gate-form">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={adminPin}
              onChange={(event) => {
                setAdminPin(event.target.value);
                setAdminError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && adminPin.trim() && !sessionLoading) void unlockAdmin();
              }}
              placeholder="PIN"
              aria-label="Admin PIN"
              disabled={statusLoading}
            />
            <button className="gold-button" onClick={unlockAdmin} disabled={statusLoading || sessionLoading || !adminPin.trim()}>
              {sessionLoading ? 'Unlocking...' : 'Unlock'}
            </button>
          </div>
          {adminError && <p className="admin-error">{adminError}</p>}
          <Link className="pill admin-preview-link" href="/">Preview Site</Link>
        </section>
      </main>
    );
  }

  return (
    <div className="shell">
      <header className="brand-row">
        <BrandLockup />
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
              <span className="mono-chip">{platformStatus.admin.configured ? 'admin access set' : 'admin access missing'}</span>
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
          <p className="helper">Fetch reads the public Suno playlist and saves the parsed productions to the RollinDD homepage. If Suno parsing fails, existing homepage data is left unchanged.</p>
          <div className="status-grid">
            <div className="status-box">Cover Art<br/><strong>check</strong></div>
            <div className="status-box">Video<br/><strong>if available</strong></div>
            <div className="status-box">Audio<br/><strong>if available</strong></div>
            <div className="status-box">Words<br/><strong>indexed</strong></div>
          </div>
        </section>
        <section className="command-panel">
          <div className="kicker">Settings</div>
          {['Embed cover/video/audio','Hide artist names','Enable word search','Quoted line search','Lazy-load covers top-to-bottom'].map((item) => <div className="toggle-row" key={item}><span>{item}</span><span className="toggle on"><span /></span></div>)}
        </section>
      </div>
      <section className="command-panel">
        <div className="section-row" style={{ marginTop: 0 }}>
          <div>
            <div className="kicker">Admin Access</div>
            <h2>{adminUnlocked ? 'Admin session is unlocked.' : platformStatus?.admin.pinEnabled ? 'Enter admin PIN.' : 'Admin PIN is not configured.'}</h2>
          </div>
          <button className="ghost-button" onClick={lockAdmin} disabled={sessionLoading || (!adminPin && !sessionStatus?.authenticated)}>Lock</button>
        </div>
        <div className="input-row">
          <input type="password" inputMode="numeric" pattern="[0-9]*" value={adminPin} onChange={(event) => setAdminPin(event.target.value)} placeholder={adminUnlocked ? 'Admin session active' : 'PIN'} />
          <button className="ghost-button" onClick={unlockAdmin} disabled={sessionLoading || !adminPin.trim()}>
            {sessionLoading ? 'Unlocking...' : 'Unlock'}
          </button>
          <button className="ghost-button" onClick={applySchema} disabled={schemaLoading || !platformStatus?.database.configured || platformStatus.database.schemaReady || !canUseAdminActions}>
            {schemaLoading ? 'Applying...' : 'Apply Schema'}
          </button>
        </div>
        <p className="helper">{adminUnlocked ? 'This browser can run admin actions without repasting anything.' : platformStatus?.admin.message}</p>
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
