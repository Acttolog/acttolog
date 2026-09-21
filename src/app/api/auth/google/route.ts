import { NextResponse } from 'next/server';
import { googleAuthUrl, googleConfigured } from '@/lib/auth/google';
import { sanitizeReturn } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** GET /api/auth/google?returnTo=/academy — begins the Google OAuth code flow. */
export async function GET(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL('/contact?oauth=not_configured', req.url));
  }
  const url = new URL(req.url);
  const returnTo = sanitizeReturn(url.searchParams.get('returnTo'));

  const state = crypto.randomUUID();
  const redirectUri = new URL('/api/auth/callback', url.origin).toString();

  const res = NextResponse.redirect(googleAuthUrl(state, redirectUri));
  // CSRF: state is bound to this browser via a short-lived httpOnly cookie
  res.cookies.set('atl_oauth_state', state, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600,
  });
  res.cookies.set('atl_return_to', returnTo, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600,
  });
  return res;
}
