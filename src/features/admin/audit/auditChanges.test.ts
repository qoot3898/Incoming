import { describe, expect, it } from 'vitest';
import { auditValueText, parseAuditChanges } from './auditChanges';
import { auditLink } from './auditLinks';

describe('audit changes', () => {
  it('reads updated fields as old/new pairs and creations/deletions as single values', () => {
    const changes = parseAuditChanges([
      { entity: 'User', id: 12, operation: 'Updated', values: { FullName: { old: 'A', new: 'B' } } },
      { entity: 'UserRole', id: '5', operation: 'Created', values: { RoleId: 3 } },
      { entity: 'UserRole', id: '4', operation: 'Deleted', values: { RoleId: 2 } },
    ]);
    expect(changes).toEqual([
      { entity: 'User', id: '12', operation: 'Updated', fields: [{ field: 'FullName', old: 'A', new: 'B' }] },
      { entity: 'UserRole', id: '5', operation: 'Created', fields: [{ field: 'RoleId', new: 3 }] },
      { entity: 'UserRole', id: '4', operation: 'Deleted', fields: [{ field: 'RoleId', old: 2 }] },
    ]);
  });

  it('accepts a JSON string or a detail object, and ignores anything else', () => {
    expect(parseAuditChanges('[{"entity":"X","id":1,"operation":"Updated","values":{"A":{"old":1,"new":2}}}]')[0].fields).toEqual([{ field: 'A', old: 1, new: 2 }]);
    expect(parseAuditChanges({ id: 3, changes: [{ entity: 'X', id: 1, operation: 'Created', values: {} }] })).toHaveLength(1);
    expect(parseAuditChanges('not json')).toEqual([]);
    expect(parseAuditChanges(null)).toEqual([]);
  });

  it('formats values', () => {
    expect(auditValueText(null)).toBe('—');
    expect(auditValueText({ a: 1 })).toBe('{"a":1}');
    expect(auditValueText(false)).toBe('false');
  });

  it('builds deep links to one user or one record', () => {
    expect(auditLink({ ActorUserId: 12, ActionCodes: ['Auth.LoginFailed'] })).toBe('/admin/audit?ActorUserId=12&ActionCodes=Auth.LoginFailed');
    expect(auditLink({ EntityType: 'User', EntityId: '12', IncludeChanges: true })).toBe('/admin/audit?EntityType=User&EntityId=12&IncludeChanges=true');
    expect(auditLink({})).toBe('/admin/audit');
  });
});
