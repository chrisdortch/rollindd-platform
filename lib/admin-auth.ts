import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const adminHeaderName = 'x-rollindd-admin-secret';

function isProductionRuntime() {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}

export function getAdminAuthStatus() {
  const configured = Boolean(process.env.ROLLINDD_ADMIN_SECRET);
  const required = configured || isProductionRuntime();

  return {
    configured,
    required,
    headerName: adminHeaderName,
    mode: configured ? 'secret-configured' : required ? 'secret-required' : 'local-open',
    message: configured
      ? 'Admin write actions require the RollinDD admin secret.'
      : required
        ? 'ROLLINDD_ADMIN_SECRET is not configured; admin write actions are blocked.'
        : 'Admin write actions are open for local development.'
  };
}

function safeCompare(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  if (valueBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}

export function requireAdminSecret(request: NextRequest) {
  const status = getAdminAuthStatus();
  const expected = process.env.ROLLINDD_ADMIN_SECRET || '';

  if (!status.required) return null;

  if (!expected) {
    return NextResponse.json(
      {
        status: 'blocked',
        error: status.message,
        nextSteps: ['Set ROLLINDD_ADMIN_SECRET for production and preview in the RollinDD Vercel project.']
      },
      { status: 503 }
    );
  }

  const provided = request.headers.get(adminHeaderName) || '';
  if (!safeCompare(provided, expected)) {
    return NextResponse.json(
      {
        status: 'unauthorized',
        error: 'Admin secret is missing or invalid.'
      },
      { status: 401 }
    );
  }

  return null;
}
