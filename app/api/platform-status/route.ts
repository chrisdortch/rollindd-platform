import { NextResponse } from 'next/server';
import { getAdminAuthStatus } from '@/lib/admin-auth';
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
  const admin = getAdminAuthStatus();
  const mode = database.schemaReady ? 'database' : 'demo-fallback';
  const nextActions = [
    ...(!admin.configured && admin.required ? ['Set ROLLINDD_ADMIN_SECRET for production and preview.'] : []),
    ...(database.schemaReady
      ? ['Run Central Command from /admin to save site and track records.']
      : database.configured
        ? ['Apply sql/schema.sql from /admin.', 'Recheck /admin for database readiness.']
        : ['Connect Vercel Postgres to this project.', 'Apply sql/schema.sql from /admin.', 'Recheck /admin for database readiness.'])
  ];

  return NextResponse.json({
    ok: true,
    app: 'rollindd-platform',
    mode,
    database,
    admin,
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
        status: admin.configured ? 'ready' : admin.required ? 'blocked' : 'attention',
        detail: admin.message
      }
    ],
    nextActions
  });
}
