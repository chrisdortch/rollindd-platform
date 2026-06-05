import { NextRequest, NextResponse } from 'next/server';
import { runCentralCommand } from '@/lib/command';

export async function POST(request: NextRequest) {
  const { command } = await request.json();
  if (!command || typeof command !== 'string') {
    return NextResponse.json({ status: 'failed', error: 'Missing command text.' }, { status: 400 });
  }
  const result = await runCentralCommand(command);
  return NextResponse.json(result);
}
