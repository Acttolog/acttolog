import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, toIntelRole, capabilitiesFor, PERMISSIONS, INTEL_ROLES } from './rbac.ts';

test('owner and admin have every capability', () => {
  for (const cap of PERMISSIONS.OWNER) {
    assert.equal(can('OWNER', cap), true);
    assert.equal(can('ADMIN', cap), true);
  }
});

test('analyst can view/export/build/query/customize but not manage', () => {
  assert.equal(can('ANALYST', 'view'), true);
  assert.equal(can('ANALYST', 'export'), true);
  assert.equal(can('ANALYST', 'build_reports'), true);
  assert.equal(can('ANALYST', 'run_queries'), true);
  assert.equal(can('ANALYST', 'customize_dashboards'), true);
  assert.equal(can('ANALYST', 'manage_connectors'), false);
  assert.equal(can('ANALYST', 'manage_alerts'), false);
  assert.equal(can('ANALYST', 'manage_users'), false);
  assert.equal(can('ANALYST', 'view_audit'), false);
});

test('viewer can only view', () => {
  assert.deepEqual([...capabilitiesFor('VIEWER')], ['view']);
  assert.equal(can('VIEWER', 'export'), false);
  assert.equal(can('VIEWER', 'run_queries'), false);
  assert.equal(can('VIEWER', 'manage_users'), false);
});

test('null role (Member / unauthenticated) has no access', () => {
  assert.equal(toIntelRole('Member'), null);
  assert.equal(toIntelRole(''), null);
  assert.equal(toIntelRole(undefined), null);
  assert.equal(can(null, 'view'), false);
  assert.deepEqual([...capabilitiesFor(null)], []);
});

test('role mapping is case-insensitive and covers all intel roles', () => {
  assert.equal(toIntelRole('Owner'), 'OWNER');
  assert.equal(toIntelRole('admin'), 'ADMIN');
  assert.equal(toIntelRole('ANALYST'), 'ANALYST');
  assert.equal(toIntelRole('Viewer'), 'VIEWER');
  for (const r of INTEL_ROLES) assert.ok(PERMISSIONS[r].length > 0);
});

test('manage_users is restricted to owner/admin only', () => {
  const managers = INTEL_ROLES.filter((r) => can(r, 'manage_users'));
  assert.deepEqual(managers, ['OWNER', 'ADMIN']);
});