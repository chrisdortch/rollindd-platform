import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/persistence';

export async function GET() {
  return NextResponse.json({ ok: true, app: 'rollindd-platform', mode: isDatabaseConfigured() ? 'db-ready' : 'demo-fallback' });
}
