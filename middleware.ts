import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

/**
 * Verify platform admin session token and extract admin ID
 * Returns admin ID if valid, null otherwise
 */
async function verifyAdminSession(token: string): Promise<string | null> {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[v0][MIDDLEWARE] Supabase credentials missing');
      return null;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase
      .from('platform_admin_sessions')
      .select('admin_id, expires_at')
      .eq('token', token)
      .single();

    if (error || !data) {
      console.error('[v0][MIDDLEWARE] Session lookup failed:', { error: error?.message });
      return null;
    }

    // Check if session has expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);

    if (expiresAt < now) {
      console.log('[v0][MIDDLEWARE] Session expired');
      return null;
    }

    return data.admin_id;
  } catch (error) {
    console.error('[v0][MIDDLEWARE] Error verifying session:', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Protect platform admin routes that require authentication
  if (pathname.startsWith('/platform-admin') || pathname.startsWith('/api/platform-admin')) {
    // Check for platform admin session cookie
    const token = request.cookies.get('platform-admin-token')?.value;

    if (!token) {
      // For API routes, return 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // For page routes, redirect to login
      return NextResponse.redirect(new URL('/platform-admin-login', request.url));
    }

    // Verify the session token and get admin ID
    const adminId = await verifyAdminSession(token);

    if (!adminId) {
      // For API routes, return 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // For page routes, redirect to login
      return NextResponse.redirect(new URL('/platform-admin-login', request.url));
    }

    // Add admin ID to headers for API routes to access
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-admin-id', adminId);
    requestHeaders.set('x-platform-admin-token', token);

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
