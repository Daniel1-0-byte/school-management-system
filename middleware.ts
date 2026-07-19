import { type NextRequest, NextResponse } from 'next/server';

// Routes that do NOT require authentication
const publicRoutes = [
  '/platform-admin-login',
  '/api/platform-admin/login',
  '/api/platform-admin/verify-2fa',
  '/api/platform-admin/logout',
];

// Check if a path is public (no authentication required)
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  console.log('[v0] Middleware processing:', { pathname });

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    console.log('[v0] Public route, allowing access');
    return NextResponse.next();
  }

  // Protect platform admin routes that require authentication
  if (pathname.startsWith('/platform-admin') || pathname.startsWith('/api/platform-admin')) {
    // Check for platform admin session cookie
    const token = request.cookies.get('platform-admin-token')?.value;

    console.log('[v0] Platform admin route accessed:', { 
      pathname, 
      tokenExists: !!token,
      isApiRoute: pathname.startsWith('/api/')
    });

    if (!token) {
      console.log('[v0] No token found, denying access');
      // For API routes, return 401
      if (pathname.startsWith('/api/')) {
        console.log('[v0] Returning 401 for API route');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // For page routes, redirect to login
      console.log('[v0] Redirecting to login for page route');
      return NextResponse.redirect(new URL('/platform-admin-login', request.url));
    }

    console.log('[v0] Token found, adding to headers');

    // For API routes, add the token to headers so the route handler can verify it
    // For page routes, the middleware simply passes through (authentication can be checked server-side)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-platform-admin-token', token);

    // Create a new request with the token header
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
