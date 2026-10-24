import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

/**
 * ACTTOLOG session — secure httpOnly cookie JWT (spec §86).
 * Roles are resolved server-side on every verification; the client
 * never decides authorization (spec §52, §86).
 */

export interface SessionUser {
  uid: string;
  name: string;
  email: string;
  picture?: string;
  role: 'Owner' | 'Admin' | 'Member';
}

const COOKIE = 'atl_session';

/**
 * AUTH_SECRET is mandatory in production. The literal fallback is published in
 * this repository, so signing with it would let anyone mint a valid session
 * cookie for any `sub` — reading another user's saved items and clearing
 * members-only gates. Roles stay safe (resolveRole trusts email+env, never the
 * claim), but identity does not. Fail closed at boot instead.
 */
const DEV_FALLBACK = 'acttolog-dev-secret-do-not-use-in-production';
const secret = () => {
  const v = process.env.AUTH_SECRET;
  if (!v) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET is required in production — refusing to sign sessions with a public key');
    }
    return new TextEncoder().encode(DEV_FALLBACK);
  }
  if (v === DEV_FALLBACK && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is set to the published dev fallback — generate a new secret');
  }
  return new TextEncoder().encode(v);
};

export async function createSessionCookie(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ role: user.role, name: user.name, picture: user.picture || '', email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.uid)
    .setIssuedAt()
    .setIssuer('acttolog')
    .setAudience('acttolog-web')
    .setExpirationTime('7d')
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Verify + decode the session cookie. Returns null when absent/invalid. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: 'acttolog', audience: 'acttolog-web' });
    const email = String(payload.email || '');
    if (!payload.sub || !email) return null;
    return {
      uid: String(payload.sub),
      name: String(payload.name || ''),
      email,
      picture: payload.picture ? String(payload.picture) : undefined,
      role: resolveRole(email, payload.role),
    };
  } catch {
    return null;
  }
}

/** Owner is provisioned by environment — the private owner email is never exposed publicly (spec §5, §45, §52). */
export function resolveRole(email: string, claimed?: unknown): SessionUser['role'] {
  const owner = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
  const e = email.toLowerCase();
  if (owner && e === owner) return 'Owner';
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (admins.includes(e)) return 'Admin';
  // DB-backed role overrides (Editor/Contributor future) arrive via claimed role
  if (claimed === 'Admin' && admins.includes(e)) return 'Admin';
  return 'Member';
}

export const isStaff = (u: SessionUser | null): boolean => u?.role === 'Owner' || u?.role === 'Admin';

/** Only allow same-origin relative paths — no open redirects. */
export function sanitizeReturn(v: string | null | undefined): string {
  if (!v || !v.startsWith('/') || v.startsWith('//')) return '/my';
  return v.slice(0, 200);
}
