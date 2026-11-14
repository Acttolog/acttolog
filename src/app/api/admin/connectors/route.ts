import { NextResponse } from 'next/server';
import { requireIntel } from '@/lib/intelligence/guard';
import { writeAudit } from '@/lib/intelligence/audit';
import { getSessionUser } from '@/lib/auth/session';
import { probeConnectors } from '@/lib/intelligence/connectors';
import { integrationStatus } from '@/lib/system';

export const dynamic = 'force-dynamic';

/** GET /api/admin/connectors — runtime configuration rows + live connection probes. */
export async function GET() {
  const denied = await requireIntel('view');
  if (denied) return denied;
  return NextResponse.json({ config: integrationStatus(), probes: await probeConnectors() });
}

/** POST /api/admin/connectors — re-run probes and record the check in the audit log. */
export async function POST() {
  const denied = await requireIntel('manage_connectors');
  if (denied) return denied;
  const probes = await probeConnectors();
  await writeAudit({
    actor: await getSessionUser(),
    action: 'connectors.check',
    target: probes.map((p) => p.key).join(','),
    meta: { verified: probes.filter((p) => p.state === 'verified').length, failed: probes.filter((p) => p.state === 'failed').length },
  });
  return NextResponse.json({ config: integrationStatus(), probes });
}