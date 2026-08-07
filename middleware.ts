import { jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';
import { getJwtSecret, SESSION_COOKIE_NAME } from '@/lib/jwt';

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
    return typeof payload.userId === 'string' && typeof payload.email === 'string';
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const authenticated = await hasValidSession(request);
  const isProtectedRoute = pathname === '/notes' || pathname.startsWith('/notes/');
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  if (isProtectedRoute && !authenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('from', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && authenticated) {
    const notesUrl = request.nextUrl.clone();
    notesUrl.pathname = '/notes';
    notesUrl.search = '';
    return NextResponse.redirect(notesUrl);
  }

  return NextResponse.next();
}

export const config = { matcher: ['/notes/:path*', '/login', '/signup'] };
