import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, app: 'rollindd-platform', mode: process.env.POSTGRES_URL ? 'db-ready' : 'demo-fallback' });
}
