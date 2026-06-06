import { NextResponse } from 'next/server';
import { getDatabaseStatus } from '@/lib/persistence';

export const dynamic = 'force-dynamic';

function releaseInfo() {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || '';

  return {
    environment: process.env.VERCEL_ENV || 'local',
    branch: process.env.VERCEL_GIT_COMMIT_REF || '',
    commit: commitSha ? commitSha.slice(0, 7) : '',
    deploymentUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
  };
}

export async function GET() {
  const database = await getDatabaseStatus();
  const mode = database.schemaReady ? 'database' : 'demo-fallback';

  return NextResponse.json({
    ok: true,
    app: 'rollindd-platform',
    mode,
    database,
    release: releaseInfo(),
    checks: [
      {
        label: 'Production app',
        status: 'ready',
        detail: 'RollinDD is deployed and serving requests.'
      },
      {
        label: 'Database persistence',
        status: database.schemaReady ? 'ready' : 'attention',
        detail: database.message
      },
      {
        label: 'Central Command safety',
        status: 'ready',
        detail: 'Commands prepare RollinDD preview data only; no DNS, domain, purchase, or non-RollinDD project actions are automatic.'
      }
    ],
    nextActions: database.schemaReady
      ? ['Run Central Command from /admin to save site and track records.']
      : ['Connect Vercel Postgres to this project.', 'Apply sql/schema.sql to the database.', 'Recheck /admin for database readiness.']
  });
}
