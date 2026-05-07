import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// JWT secret must be set via environment variable
if (!process.env.JWT_SECRET) {
  throw new Error('[CONFIG] JWT_SECRET is not set. Please add it to your .env.local file.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const publicPaths = ['/login', '/manifest.json', '/robots.txt'];
const publicApiPaths = ['/api/auth/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without authentication
  if (publicPaths.some(p => pathname === p)) {
    const resp = NextResponse.next();
    resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    resp.headers.set('Pragma', 'no-cache');
    resp.headers.set('Expires', '0');
    return resp;
  }

  // Allow static files (icons, manifest, favicon, robots, etc.)
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon-') ||
    pathname.startsWith('/logo') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.webp')
  ) {
    const resp = NextResponse.next();
    // Cache static assets but with revalidation to pick up new builds
    if (pathname.startsWith('/_next/static/')) {
      resp.headers.set('Cache-Control', 'public, max-age=3600, must-revalidate');
    } else {
      resp.headers.set('Cache-Control', 'no-store');
    }
    return resp;
  }

  // Allow public API endpoints
  if (publicApiPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for session cookie
  const token = request.cookies.get('bs-session')?.value;

  if (!token) {
    // No token — redirect pages to login, return 401 for API
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the JWT token
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = (payload as Record<string, unknown>).role as string | undefined;

    // Admin routes: only admin role can access
    if (pathname.startsWith('/admin') && role !== 'admin') {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/';
      return NextResponse.redirect(homeUrl);
    }

    // If authenticated user visits /login, redirect to home
    if (pathname === '/login') {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/';
      return NextResponse.redirect(homeUrl);
    }

    const resp = NextResponse.next();
    resp.headers.set('Cache-Control', 'no-store');
    return resp;
  } catch {
    // Token is invalid or expired
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('bs-session', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
