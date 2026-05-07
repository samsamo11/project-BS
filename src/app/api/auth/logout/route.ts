import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'no-store' },
  });
  response.cookies.set('bs-session', '', {
    httpOnly: true,
    secure: false, // Must match the login cookie setting
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
