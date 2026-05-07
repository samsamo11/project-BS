import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// JWT secret must be set via environment variable
if (!process.env.JWT_SECRET) {
  throw new Error('[CONFIG] JWT_SECRET is not set. Please add it to your .env.local file.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const publicPaths = ['/login', '/manifest.json', '/robots.txt'];
const publicApiPaths = ['/api/auth/login'];

// Add no-cache headers to ALL responses to prevent stale content
function withNoCache(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without authentication
  if (publicPaths.some(p => pathname === p)) {
    return withNoCache(NextResponse.next());
  }

  // Allow Next.js internals and static files — but add cache-busting headers
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
    return NextResponse.next();
  }

  // Allow public API endpoints
  if (publicApiPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Strip cache-busting query params (?_t=, ?_v=) before processing
  // These are added by the login page to prevent cached responses
  const cleanPathname = pathname.replace(/\?.*$/, '');

  // Check for session cookie
  const token = request.cookies.get('bs-session')?.value;

  if (!token) {
    // No token — redirect pages to login, return 401 for API
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', cleanPathname);
    // Strip cache-busting params from redirect URL
    const resp = NextResponse.redirect(loginUrl);
    return withNoCache(resp);
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

    return withNoCache(NextResponse.next());
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
    return withNoCache(response);
  }
}

// IMPORTANT: Match ALL routes including _next/static to add cache-control headers
// This prevents the browser from serving stale JavaScript bundles
export const config = {
  matcher: [
    '/((?!_next/image).*)',  // Match everything EXCEPT _next/image (which has its own optimization)
  ],
};
