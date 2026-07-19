import { type NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/platform-admin-auth.edge';

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

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Protect platform admin routes that require authentication
  if (pathname.startsWith('/platform-admin')) {
    // Check for platform admin session cookie
    const token = request.cookies.get('platform-admin-token')?.value;

    if (!token) {
      // Redirect to platform admin login
      return NextResponse.redirect(new URL('/platform-admin-login', request.url));
    }

    // Verify token is valid and not expired
    const session = await verifySession(token);
    if (!session) {
      // Token is invalid or expired, redirect to login
      const response = NextResponse.redirect(new URL('/platform-admin-login', request.url));
      // Clear the invalid cookie
      response.cookies.delete('platform-admin-token');
      return response;
    }

    // Session is valid, add admin info to request headers for later use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-admin-id', session.adminId);
    requestHeaders.set('x-admin-email', session.email);

    // Create a new request with the admin headers
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
