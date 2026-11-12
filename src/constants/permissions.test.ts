import { describe, expect, it } from 'vitest';
import { ACTION_PERMISSIONS, NAV_PERMISSIONS, PERMISSIONS, hasAnyPermission } from './permissions';

const TL = (codes: string[]) => codes.map((c) => `TemporaryLabor.${c}`);

/** Role grants as read from the live API (`GET /roles/{id}`) on 2026-11-09. */
const ROLES: Record<string, string[]> = {
  LaborEntryRegistrar: TL(['ManageEmployeeData', 'RegisterWorkers', 'View']),
  LaborSectionOfficer: TL([
    'ActForSupervisor', 'ManageAttendance', 'ManageCandidates', 'ManageEvaluations', 'ManageLeaves', 'ManageOnboarding',
    'ManagePenalties', 'ManageRequests', 'ManageSettings', 'ManageTerminations', 'ManageTransfers', 'View', 'ViewAll', 'ViewReports',
  ]),
  LaborSupervisor: TL(['ActForSupervisor', 'ManageAttendance', 'ManageEvaluations', 'ManageLeaves', 'ManageTerminations', 'ManageTransfers', 'View', 'ViewReports']),
  LaborOperations: TL(['ApproveOperations', 'ManageCandidates', 'ManagePermits', 'ManageRequests', 'ManageTransfers', 'View', 'ViewReports']),
  LaborGeneralManager: TL(['ApproveGeneralManager', 'View', 'ViewAll', 'ViewReports']),
  LaborPayroll: TL(['ConfirmPayrollNotices', 'View', 'ViewAll', 'ViewReports']),
  /** TL-N12 (2026-11-12): created on the next start of an existing database. */
  LaborFingerprintSupervisor: TL(['FingerprintNotices', 'View', 'ViewAll']),
};

type Action = keyof typeof ACTION_PERMISSIONS;
const allowed = (role: string, action: Action) => hasAnyPermission(ROLES[role], ACTION_PERMISSIONS[action]);

describe('ACTION_PERMISSIONS', () => {
  it('the entry registrar only registers workers and corrects their data', () => {
    const granted = (Object.keys(ACTION_PERMISSIONS) as Action[]).filter((a) => allowed('LaborEntryRegistrar', a));
    expect(granted.sort()).toEqual(['correctIdentity', 'registerWorkers']);
  });

  it('penalties are proposed by the labor section only', () => {
    expect(allowed('LaborSectionOfficer', 'createPenalty')).toBe(true);
    for (const role of ['LaborEntryRegistrar', 'LaborSupervisor', 'LaborOperations', 'LaborGeneralManager', 'LaborPayroll']) {
      expect(allowed(role, 'createPenalty')).toBe(false);
    }
  });

  it('the supervisor starts leaves, transfers, evaluations and terminations but not requests or penalties', () => {
    expect(allowed('LaborSupervisor', 'createLeave')).toBe(true);
    expect(allowed('LaborSupervisor', 'createTransfer')).toBe(true);
    expect(allowed('LaborSupervisor', 'createEvaluation')).toBe(true);
    expect(allowed('LaborSupervisor', 'createTermination')).toBe(true);
    expect(allowed('LaborSupervisor', 'createStaffingRequest')).toBe(false);
    expect(allowed('LaborSupervisor', 'createPenalty')).toBe(false);
  });

  it('only Operations distributes workers and issues entry permits', () => {
    expect(allowed('LaborOperations', 'managePermits')).toBe(true);
    for (const role of ['LaborEntryRegistrar', 'LaborSectionOfficer', 'LaborSupervisor', 'LaborGeneralManager', 'LaborPayroll']) {
      expect(allowed(role, 'managePermits')).toBe(false);
    }
  });

  it('approver-only roles start nothing', () => {
    for (const role of ['LaborGeneralManager', 'LaborPayroll', 'LaborFingerprintSupervisor']) {
      for (const action of Object.keys(ACTION_PERMISSIONS) as Action[]) expect(allowed(role, action)).toBe(false);
    }
  });
});

describe('site capacity (TL-N7)', () => {
  it('no default labor role changes capacities, but settings managers can read them', () => {
    for (const role of Object.keys(ROLES)) expect(hasAnyPermission(ROLES[role], [PERMISSIONS.manageSiteCapacity])).toBe(false);
    expect(hasAnyPermission(ROLES.LaborSectionOfficer, NAV_PERMISSIONS.siteCapacities)).toBe(true);
    expect(hasAnyPermission(ROLES.LaborSupervisor, NAV_PERMISSIONS.siteCapacities)).toBe(false);
  });

  it('a user granted only the capacity permission sees the screen', () => {
    expect(hasAnyPermission(['TemporaryLabor.ManageSiteCapacity'], NAV_PERMISSIONS.siteCapacities)).toBe(true);
  });
});

describe('fingerprint notices (TL-N12)', () => {
  it('uses the code of the API', () => {
    expect(PERMISSIONS.fingerprintNotices).toBe('TemporaryLabor.FingerprintNotices');
  });

  it('only the fingerprint supervisor receives them by default, and that role starts no workflow', () => {
    for (const role of Object.keys(ROLES)) {
      expect(hasAnyPermission(ROLES[role], [PERMISSIONS.fingerprintNotices])).toBe(role === 'LaborFingerprintSupervisor');
    }
    // It can read transfers (the notice links to `transfers/{id}`) but not change them.
    expect(hasAnyPermission(ROLES.LaborFingerprintSupervisor, NAV_PERMISSIONS.transfers)).toBe(true);
    expect(allowed('LaborFingerprintSupervisor', 'createTransfer')).toBe(false);
  });
});

describe('candidate list (TL-N13)', () => {
  it('uses the code of the API', () => {
    expect(PERMISSIONS.manageCandidates).toBe('TemporaryLabor.ManageCandidates');
  });

  it('the labor section and Operations keep the list; the supervisor and the approvers do not', () => {
    for (const role of ['LaborSectionOfficer', 'LaborOperations']) expect(hasAnyPermission(ROLES[role], [PERMISSIONS.manageCandidates])).toBe(true);
    for (const role of ['LaborEntryRegistrar', 'LaborSupervisor', 'LaborGeneralManager', 'LaborPayroll', 'LaborFingerprintSupervisor']) {
      expect(hasAnyPermission(ROLES[role], [PERMISSIONS.manageCandidates])).toBe(false);
    }
  });
});

describe('user permissions (TL-N9)', () => {
  it('uses the codes of the API', () => {
    expect(PERMISSIONS.managePermissions).toBe('Users.ManagePermissions');
    expect(PERMISSIONS.manageSiteCapacity).toBe('TemporaryLabor.ManageSiteCapacity');
  });
});
