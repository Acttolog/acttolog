import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode, googleConfigured } from '@/lib/auth/google';
import { createSessionCookie, resolveRole, sanitizeReturn } from '@/lib/auth/session';
import { getPrisma } from '@/lib/db';

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
      uid: await persistUser(profile, role),
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

/**
 * Saved items, admin lists and deletion requests all reference User.id via a
 * foreign key, so the Google identity has to exist in Postgres before a
 * session can own rows. Without a database the provider id stays the subject.
 */
async function persistUser(profile: { sub: string; email: string; name: string; picture?: string }, role: 'Owner' | 'Admin' | 'Member'): Promise<string> {
  const prisma = getPrisma();
  if (!prisma) return `g_${profile.sub}`;
  try {
    const dbRole = role === 'Owner' ? 'OWNER' : role === 'Admin' ? 'ADMIN' : 'MEMBER';
    const user = await prisma.user.upsert({
      where: { providerId: profile.sub },
      create: {
        providerId: profile.sub, email: profile.email, name: profile.name,
        picture: profile.picture, role: dbRole, lastLoginAt: new Date(),
      },
      update: {
        email: profile.email, name: profile.name, picture: profile.picture,
        role: dbRole, lastLoginAt: new Date(),
      },
    });
    return user.id;
  } catch (e) {
    console.error('google user upsert failed — session falls back to the provider id', e);
    return `g_${profile.sub}`;
  }
}
