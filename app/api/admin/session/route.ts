import { NextRequest, NextResponse } from 'next/server';
import { adminSessionCookieName, adminSessionValue, getAdminAuthStatus, hasValidAdminSession, isValidAdminPin, isValidAdminSecret } from '@/lib/admin-auth';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 30
};

export async function GET(request: NextRequest) {
  const status = getAdminAuthStatus();
  return NextResponse.json({
    ...status,
    authenticated: !status.required || hasValidAdminSession(request)
  });
}

export async function POST(request: NextRequest) {
  const status = getAdminAuthStatus();
  const { pin, secret } = await request.json();

  if (!status.required) {
    return NextResponse.json({ authenticated: true, mode: status.mode });
  }

  const authorized = isValidAdminPin(String(pin || '')) || isValidAdminSecret(String(secret || ''));

  if (!authorized) {
    return NextResponse.json({ authenticated: false, error: 'Admin PIN is missing or invalid.' }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true, mode: status.mode });
  response.cookies.set(adminSessionCookieName, adminSessionValue(), cookieOptions);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(adminSessionCookieName, '', { ...cookieOptions, maxAge: 0 });
  return response;
}
