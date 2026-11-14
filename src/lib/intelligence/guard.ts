import 'server-only';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { can, toIntelRole, type Capability } from './rbac';

/**
 * Capability-scoped intelligence guard. Returns a NextResponse to short-circuit
 * the route when unauthorized, or null when the caller may proceed. Authorization
 * is decided here on the server — never by the client (brief §25, §52, §86).
 */
export async function requireIntel(capability: Capability): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  const role = toIntelRole(user.role);
  if (!role) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!can(role, capability)) {
    return NextResponse.json({ error: 'forbidden', capability }, { status: 403 });
  }
  return null;
}