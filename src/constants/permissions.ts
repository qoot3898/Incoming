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
  /** TL-N3: review users' assignment letters (system administrator by default). */
  reviewAssignments: 'Users.ReviewAssignments',
  /** TL-N6: users' activity on the system (audit log). */
  auditView: 'Audit.View',
  usersView: 'Users.View',
  /**
   * TL-N7: change a site's capacity and open the attached decisions. No default role holds it; the
   * super admin has it implicitly and grants it to a role or a user.
   */
  manageSiteCapacity: `${TL}.ManageSiteCapacity`,
  /** TL-N9: grant or deny a user permissions directly (system administrator in new databases). */
  managePermissions: 'Users.ManagePermissions',
  /**
   * TL-N13: keep the candidate list (add, edit, withdraw, restore, nominate on a request). Whoever holds it sees the
   * whole list; anyone else sees only candidates nominated on a request within their scope.
   */
  manageCandidates: `${TL}.ManageCandidates`,
  /**
   * TL-N12: «إشعارات البصمة» — receives an in-system notice (link `transfers/{id}`) when a transfer changes where a
   * worker's fingerprint must be registered. Held by the default role LaborFingerprintSupervisor; it needs no screen
   * of its own (the notice opens the request), so nothing in the UI is gated on it.
   */
  fingerprintNotices: `${TL}.FingerprintNotices`,
} as const;

/**
 * Who may START each workflow (create pages and their entry buttons). Codes and role grants read from
 * the live API (`GET /roles/permissions`, `GET /roles/{id}`) on 2026-11-09. A button is hidden — and the
 * create route shows "no access" — when the user holds none of the codes. The API still decides every action.
 */
export const ACTION_PERMISSIONS = {
  createStaffingRequest: [`${TL}.ManageRequests`],
  registerWorkers: [`${TL}.RegisterWorkers`],
  /** Distribution queue: assign the site and issue / cancel entry permits (Operations). */
  managePermits: [`${TL}.ManagePermits`],
  createLeave: [`${TL}.ManageLeaves`],
  createTransfer: [`${TL}.ManageTransfers`],
  createPenalty: [`${TL}.ManagePenalties`],
  createEvaluation: [`${TL}.ManageEvaluations`],
  createTermination: [`${TL}.ManageTerminations`],
  correctIdentity: [`${TL}.ManageEmployeeData`],
} as const satisfies Record<string, readonly string[]>;

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
  /** TL-N7: the list and the history are open to the settings managers too; only changing needs `manageSiteCapacity`. */
  siteCapacities: [`${TL}.ManageSettings`, PERMISSIONS.manageSiteCapacity],
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
