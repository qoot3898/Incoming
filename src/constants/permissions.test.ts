import { describe, expect, it } from 'vitest';
import { ACTION_PERMISSIONS, hasAnyPermission } from './permissions';

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
    for (const role of ['LaborGeneralManager', 'LaborPayroll']) {
      for (const action of Object.keys(ACTION_PERMISSIONS) as Action[]) expect(allowed(role, action)).toBe(false);
    }
  });
});
