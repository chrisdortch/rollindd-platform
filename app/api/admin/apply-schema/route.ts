import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSecret } from '@/lib/admin-auth';
import { applyDatabaseSchema, getDatabaseStatus } from '@/lib/persistence';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResponse = requireAdminSecret(request);
  if (authResponse) return authResponse;

  const before = await getDatabaseStatus();
  if (!before.configured) {
    return NextResponse.json(
      {
        status: 'blocked',
        error: before.message,
        before,
        nextSteps: ['Connect Postgres to the RollinDD Vercel project, then retry Apply Schema.']
      },
      { status: 400 }
    );
  }

  const applied = await applyDatabaseSchema();
  const after = await getDatabaseStatus();

  return NextResponse.json({
    ok: after.schemaReady,
    status: after.schemaReady ? 'ready' : 'attention',
    applied,
    before,
    after,
    nextSteps: after.schemaReady
      ? ['Run Central Command from /admin to save site and track records.']
      : ['Confirm POSTGRES_URL points to the RollinDD database and retry Apply Schema.']
  });
}
