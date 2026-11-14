import 'server-only';
import type { Prisma } from '@prisma/client';
import { getPrisma } from '@/lib/db';
import type { SessionUser } from '@/lib/auth/session';
import { redactMeta } from './redact';

/**
 * Append an audit record for a sensitive intelligence operation.
 *
 * - No-op when the database is unconfigured (honest, never silently fakes a row).
 * - actorId is only set when it is a real User.id; the `g_` provider fallback has
 *   no DB row, so we keep the email snapshot instead of violating the FK.
 * - Never throws: an audit failure must not break the primary operation.
 */
export async function writeAudit(opts: {
  actor?: SessionUser | null;
  action: string;
  target?: string | null;
  meta?: unknown;
}): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;
  const uid = opts.actor?.uid;
  const actorId = uid && !uid.startsWith('g_') ? uid : null;
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        actorEmail: opts.actor?.email ?? null,
        action: opts.action,
        target: opts.target ?? null,
        meta: (redactMeta(opts.meta) ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // swallow — auditing is best-effort and must not fail the request
  }
}