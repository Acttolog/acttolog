import { Icon } from './Icon';

/** Status badge (prototype `sBadge`). */
export function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    published: 'b-ok', draft: 'b-mut', in_review: 'b-warn', approved: 'b-info',
    scheduled: 'b-vi', archived: 'b-mut', rejected: 'b-err',
  };
  if (!status) return null;
  return <span className={`badge ${map[status] || 'b-mut'}`}>{status.replace('_', ' ')}</span>;
}

/** Darkroom verification badge (prototype `vBadge`). */
export function VerifyBadge({ verification }: { verification?: string }) {
  if (verification === 'verified') return <span className="badge b-ok">Verified</span>;
  if (verification === 'needs-review') return <span className="badge b-warn">Needs review</span>;
  if (verification === 'broken' || verification === 'suspicious') return <span className={`badge b-err`}>{verification}</span>;
  return null;
}

/** Access badge (prototype `aBadge`). */
export function AccessBadge({ access, membersLabel = 'Members only', publicLabel = 'Public' }: {
  access?: string; membersLabel?: string; publicLabel?: string;
}) {
  return access === 'members'
    ? <span className="badge b-vi"><Icon name="lock" size={11} />{membersLabel}</span>
    : <span className="badge b-mut">{publicLabel}</span>;
}
