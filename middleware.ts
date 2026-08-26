import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // We check for a session cookie that we will set upon login
  const session = request.cookies.get('innovax_session');
  const path = request.nextUrl.pathname;

  // Define our protected and auth routes
  const isProtected = path.startsWith('/dashboard') || path.startsWith('/admin');
  const isAuthPage = path === '/login' || path === '/register';

  // 1. If trying to access secure pages without a session -> Kick to Login
  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. If trying to go to login/register while already logged in -> Kick to Dashboard
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Ensure middleware only runs on specific routes to save performance
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login', '/register'],
};