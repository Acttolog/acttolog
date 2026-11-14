/**
 * Intelligence RBAC — pure permission matrix (brief §25).
 *
 * Framework-free and unit-tested. Server enforcement lives in guard.ts; this
 * module only decides *what a role may do*, never reads a session itself.
 *
 * OWNER/ADMIN map from the existing session roles. ANALYST/VIEWER are provisioned
 * in the Prisma Role enum and become active once DB-backed role resolution is
 * wired; until then resolveRole() only emits Owner/Admin/Member, so the matrix is
 * ready but those two roles cannot yet log in. No capability is granted by the
 * client — every API checks `can()` server-side.
 */

export type IntelRole = 'OWNER' | 'ADMIN' | 'ANALYST' | 'VIEWER';

export type Capability =
  | 'view' // view dashboards / permitted datasets
  | 'export' // CSV / PDF / XLSX of authorized data
  | 'build_reports' // create reports + personal dashboards
  | 'run_queries' // execute approved queries
  | 'customize_dashboards' // drag / resize layouts
  | 'manage_connectors' // connector registry + health checks
  | 'manage_alerts' // alert rules + automations
  | 'manage_users' // RBAC administration
  | 'view_audit'; // read the audit trail

export const INTEL_ROLES: IntelRole[] = ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'];

const ALL: Capability[] = [
  'view',
  'export',
  'build_reports',
  'run_queries',
  'customize_dashboards',
  'manage_connectors',
  'manage_alerts',
  'manage_users',
  'view_audit',
];

export const PERMISSIONS: Record<IntelRole, readonly Capability[]> = {
  OWNER: ALL,
  ADMIN: ALL,
  ANALYST: ['view', 'export', 'build_reports', 'run_queries', 'customize_dashboards'],
  VIEWER: ['view'],
};

/** Map a session/DB role string to an intelligence role, or null when unauthorized. */
export function toIntelRole(role: string | null | undefined): IntelRole | null {
  switch ((role || '').toLowerCase()) {
    case 'owner':
      return 'OWNER';
    case 'admin':
      return 'ADMIN';
    case 'analyst':
      return 'ANALYST';
    case 'viewer':
      return 'VIEWER';
    default:
      return null; // Member and anything else: no intelligence access
  }
}

export function can(role: IntelRole | null, capability: Capability): boolean {
  if (!role) return false;
  return PERMISSIONS[role].includes(capability);
}

export function capabilitiesFor(role: IntelRole | null): readonly Capability[] {
  return role ? PERMISSIONS[role] : [];
}