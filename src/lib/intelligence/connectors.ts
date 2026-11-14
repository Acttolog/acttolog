import 'server-only';

import { getPrisma } from '@/lib/db';

/**
 * Live connector connection checks (spec §48 honesty contract).
 * A connector is only ever reported "verified" after a real server-side probe
 * succeeds. Configuration presence (env vars) is NOT a connection check.
 */

export type ProbeState = 'verified' | 'failed' | 'not_configured' | 'no_probe';

export interface ConnectorProbe {
  key: string;
  label: string;
  state: ProbeState;
  detail: string;
  checkedAt: string | null;
  latencyMs: number | null;
}

const now = () => new Date().toISOString();

async function probeDatabase(): Promise<ConnectorProbe> {
  const base = { key: 'database', label: 'PostgreSQL / Supabase' };
  const prisma = getPrisma();
  if (!prisma) {
    return { ...base, state: 'not_configured', detail: 'DATABASE_URL is not set — no connection attempted.', checkedAt: now(), latencyMs: null };
  }
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ...base, state: 'verified', detail: 'SELECT 1 succeeded against the configured database.', checkedAt: now(), latencyMs: Date.now() - t0 };
  } catch (err) {
    return { ...base, state: 'failed', detail: `Connection probe failed: ${err instanceof Error ? err.message : 'unknown error'}`, checkedAt: now(), latencyMs: Date.now() - t0 };
  }
}

async function probeOpenAI(): Promise<ConnectorProbe> {
  const base = { key: 'openai', label: 'OpenAI (Acttolog AI)' };
  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.trim()) {
    return { ...base, state: 'not_configured', detail: 'OPENAI_API_KEY is not set — no connection attempted.', checkedAt: now(), latencyMs: null };
  }
  const t0 = Date.now();
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(6000),
    });
    const latencyMs = Date.now() - t0;
    if (res.ok) {
      return { ...base, state: 'verified', detail: 'Authenticated /v1/models request succeeded.', checkedAt: now(), latencyMs };
    }
    return { ...base, state: 'failed', detail: `Provider returned HTTP ${res.status} — credentials rejected or unavailable.`, checkedAt: now(), latencyMs };
  } catch (err) {
    return { ...base, state: 'failed', detail: `Connection probe failed: ${err instanceof Error ? err.message : 'unknown error'}`, checkedAt: now(), latencyMs: Date.now() - t0 };
  }
}

/** Run every implemented server-side probe. Connectors without a probe are omitted. */
export async function probeConnectors(): Promise<ConnectorProbe[]> {
  return Promise.all([probeDatabase(), probeOpenAI()]);
}