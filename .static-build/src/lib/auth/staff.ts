import 'server-only';
import { NextResponse } from 'next/server';
import { getSessionUser, isStaff } from '@/lib/auth/session';

/** Staff-only API guard — real server-side authorization (spec §86). */
export async function requireStaff(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  if (!isStaff(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return null;
}
