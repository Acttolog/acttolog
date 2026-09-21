import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** GET /api/auth/session — public shape only (name, email, picture, role). */
export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
}
