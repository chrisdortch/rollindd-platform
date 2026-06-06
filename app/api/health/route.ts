import { NextResponse } from 'next/server';
import { getAdminAuthStatus } from '@/lib/admin-auth';
import { getDatabaseStatus } from '@/lib/persistence';

export const dynamic = 'force-dynamic';

export async function GET() {
  const database = await getDatabaseStatus();
  const admin = getAdminAuthStatus();

  return NextResponse.json({
    ok: true,
    app: 'rollindd-platform',
    mode: database.mode,
    database: {
      configured: database.configured,
      reachable: database.reachable,
      schemaReady: database.schemaReady
    },
    admin: {
      configured: admin.configured,
      required: admin.required,
      mode: admin.mode
    }
  });
}
