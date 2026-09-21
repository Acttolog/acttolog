import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** POST /api/auth/signout */
export async function POST(req: Request) {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
