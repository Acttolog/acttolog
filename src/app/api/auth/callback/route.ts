import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode, googleConfigured } from '@/lib/auth/google';
import { createSessionCookie, resolveRole, sanitizeReturn } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** GET /api/auth/callback — completes the Google OAuth code flow. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const store = await cookies();

  const fail = (why: string) =>
    NextResponse.redirect(new URL(`/?auth=error&reason=${encodeURIComponent(why)}`, url.origin));

  if (error === 'access_denied') return NextResponse.redirect(new URL('/', url.origin));
  if (!code || !state) return fail('missing_code');
  if (!googleConfigured()) return fail('oauth_not_configured');

  // CSRF: the state must match this browser's state cookie
  const expected = store.get('atl_oauth_state')?.value;
  store.delete('atl_oauth_state');
  if (!expected || expected !== state) return fail('state_mismatch');

  const returnTo = sanitizeReturn(store.get('atl_return_to')?.value ?? null);
  store.delete('atl_return_to');

  try {
    const profile = await exchangeCode(code, new URL('/api/auth/callback', url.origin).toString());
    const role = resolveRole(profile.email);
    await createSessionCookie({
      uid: `g_${profile.sub}`,
      name: profile.name,
      email: profile.email,
      picture: profile.picture,
      role,
    });
    return NextResponse.redirect(new URL(returnTo, url.origin));
  } catch (e) {
    console.error('oauth callback failed', e);
    return fail('token_verification_failed');
  }
}
