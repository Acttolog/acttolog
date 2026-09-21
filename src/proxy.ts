import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Edge proxy (Next 16 convention, formerly middleware) — first line of
 * defense for /my and /admin (spec §86). Real authorization is re-checked
 * server-side in every page/route handler; this only redirects
 * obviously-unauthenticated traffic.
 */

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'acttolog-dev-secret-do-not-use-in-production');

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('atl_session')?.value;

  let user: { sub?: string; role?: string; email?: string } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret(), { issuer: 'acttolog', audience: 'acttolog-web' });
      user = payload as { sub?: string; role?: string; email?: string };
    } catch {
      user = null;
    }
  }

  // Owner/Admin role resolution must mirror the server library: env-based, never client claims
  const owner = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  const email = (user?.email || '').toLowerCase();
  const isStaff = user && (email === owner || admins.includes(email) || (owner && email === owner));

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(url);
    }
    if (!isStaff && pathname !== '/admin/login') {
      const url = req.nextUrl.clone();
      url.pathname = '/forbidden';
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith('/my') && !user && pathname !== '/my') {
    // /my itself renders its own sign-in panel; deep tabs redirect home via sign-in flow
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/my/:path*', '/admin/:path*'],
};
