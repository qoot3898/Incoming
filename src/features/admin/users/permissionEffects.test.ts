import { describe, expect, it } from 'vitest';
import { changedCount, finalEffect, groupByModule, isEffective, needsHolding, toRequest, toRows, withEdit, type PermissionRef } from './permissionEffects';

const ROWS: PermissionRef[] = [
  { code: 'TemporaryLabor.View', direct: 'Deny' },
  { code: 'TemporaryLabor.ManageComplaints', direct: 'Grant' },
  { code: 'TemporaryLabor.ManageLeaves', direct: null },
  { code: 'Users.View', direct: null },
];

describe('isEffective (TL-N9)', () => {
  it('holds a permission from a role or a direct grant', () => {
    expect(isEffective(true, null)).toBe(true);
    expect(isEffective(false, 'Grant')).toBe(true);
    expect(isEffective(false, null)).toBe(false);
  });

  it('lets a denial beat every grant, including the role', () => {
    expect(isEffective(true, 'Deny')).toBe(false);
    expect(isEffective(false, 'Deny')).toBe(false);
  });
});

describe('needsHolding', () => {
  it('needs the permission to grant it or to lift its denial', () => {
    expect(needsHolding(null, 'Grant')).toBe(true);
    expect(needsHolding('Deny', 'Grant')).toBe(true);
    expect(needsHolding('Deny', null)).toBe(true);
  });

  it('never needs it to deny, to withdraw a grant or to leave things as they are', () => {
    expect(needsHolding(null, 'Deny')).toBe(false);
    expect(needsHolding('Grant', 'Deny')).toBe(false);
    expect(needsHolding('Grant', null)).toBe(false);
    expect(needsHolding('Grant', 'Grant')).toBe(false);
    expect(needsHolding('Deny', 'Deny')).toBe(false);
    expect(needsHolding(null, null)).toBe(false);
  });
});

describe('edits', () => {
  it('starts from the saved effects', () => {
    expect(toRequest(ROWS, {})).toEqual({ granted: ['TemporaryLabor.ManageComplaints'], denied: ['TemporaryLabor.View'] });
  });

  it('applies a change and drops it again when it matches the saved effect', () => {
    const lifted = withEdit({}, ROWS[0], null);
    expect(finalEffect(ROWS[0], lifted)).toBeNull();
    expect(changedCount(lifted)).toBe(1);
    expect(changedCount(withEdit(lifted, ROWS[0], 'Deny'))).toBe(0);
  });

  it('sends both complete lists, so clearing everything returns the user to the roles', () => {
    let edits = withEdit({}, ROWS[0], null);
    edits = withEdit(edits, ROWS[1], null);
    expect(toRequest(ROWS, edits)).toEqual({ granted: [], denied: [] });
    edits = withEdit(edits, ROWS[2], 'Deny');
    edits = withEdit(edits, ROWS[3], 'Grant');
    expect(toRequest(ROWS, edits)).toEqual({ granted: ['Users.View'], denied: ['TemporaryLabor.ManageLeaves'] });
  });
});

describe('groupByModule', () => {
  it('keeps the API order of modules and permissions', () => {
    const rows = [
      { module: 'TemporaryLabor', moduleName: 'Labor', code: 'a' },
      { module: 'Users', moduleName: 'Users', code: 'b' },
      { module: 'TemporaryLabor', moduleName: 'Labor', code: 'c' },
    ];
    expect(groupByModule(rows).map((g) => [g.module, g.rows.map((r) => r.code)])).toEqual([
      ['TemporaryLabor', ['a', 'c']],
      ['Users', ['b']],
    ]);
  });
});

describe('toRows', () => {
  it('fills in missing text and drops a row without a code', () => {
    const base = { name: null, description: null, module: 'Users', moduleName: null, isSensitive: false, roles: ['Admin', ''], direct: null, isEffective: true };
    const rows = toRows([
      { ...base, code: 'Users.View' },
      { ...base, code: null },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ code: 'Users.View', name: 'Users.View', moduleName: 'Users', roles: ['Admin'] });
  });
});
