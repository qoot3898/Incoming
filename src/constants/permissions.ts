/**
 * Permission gating for navigation (codes from `GET /api/v1/roles/permissions`).
 * An item is shown when the user is super admin or holds ANY of the listed codes
 * (a code ending with `*` matches a prefix). An empty list shows the item to everyone.
 * Hiding is a convenience only — the API enforces every permission.
 */
const TL = 'TemporaryLabor';

/** Codes checked directly by screens (besides navigation). */
export const PERMISSIONS = {
  view: `${TL}.View`,
  manageSettings: `${TL}.ManageSettings`,
  /** TL-N1: list complaints and record their review (section manager by default). */
  manageComplaints: `${TL}.ManageComplaints`,
  /** TL-N2: register a non-Libyan worker without a passport (no default role; super admins implicitly). */
  registerWithoutPassport: `${TL}.RegisterWithoutPassport`,
  /** TL-N3: review users' assignment letters (system administrator by default). */
  reviewAssignments: 'Users.ReviewAssignments',
  /** TL-N6: users' activity on the system (audit log). */
  auditView: 'Audit.View',
  usersView: 'Users.View',
} as const;

export const NAV_PERMISSIONS: Record<string, readonly string[]> = {
  tasks: [`${TL}.View`],
  workers: [`${TL}.View`],
  staffing: [`${TL}.View`],
  candidates: [`${TL}.View`],
  registration: [`${TL}.RegisterWorkers`],
  permits: [`${TL}.ManagePermits`, `${TL}.View`],
  onboarding: [`${TL}.View`],
  payroll: [`${TL}.ManageOnboarding`, `${TL}.ConfirmPayrollNotices`],
  attendance: [`${TL}.View`],
  incidents: [`${TL}.ManageAttendance`],
  leaves: [`${TL}.View`],
  penalties: [`${TL}.View`],
  transfers: [`${TL}.View`],
  evaluations: [`${TL}.View`],
  terminations: [`${TL}.View`],
  complaints: [PERMISSIONS.manageComplaints],
  reports: [`${TL}.ViewReports`],
  users: ['Users.View'],
  assignments: [PERMISSIONS.reviewAssignments],
  roles: ['Roles.View'],
  directories: [`${TL}.ManageSettings`],
  laborSettings: [`${TL}.ManageSettings`],
  settings: ['Settings.View'],
  audit: ['Audit.View'],
  integration: [`${TL}.Integration`, `${TL}.MigrateWorkers`],
  backups: ['System.Backup'],
};

const permissionSets = new WeakMap<readonly (string | null)[], Set<string | null>>();

/** Set view of the user's permissions, built once per permissions array (it is checked for every nav item). */
function permissionSet(userPermissions: readonly (string | null)[]) {
  let set = permissionSets.get(userPermissions);
  if (!set) {
    set = new Set(userPermissions);
    permissionSets.set(userPermissions, set);
  }
  return set;
}

export function hasAnyPermission(userPermissions: readonly (string | null)[], codes: readonly string[]): boolean {
  const owned = permissionSet(userPermissions);
  return codes.some((code) =>
    code.endsWith('*') ? userPermissions.some((p) => p?.startsWith(code.slice(0, -1))) : owned.has(code),
  );
}
