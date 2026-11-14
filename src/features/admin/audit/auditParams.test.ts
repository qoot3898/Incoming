import { describe, expect, it } from 'vitest';
import { AUDIT_DEFAULTS, AUDIT_SORTS, exportParams, searchParams } from './auditParams';

describe('audit search parameters', () => {
  it('sends an hour only together with its day (the API requires From with FromTime and To with ToTime)', () => {
    expect(searchParams({ From: '2026-11-01', FromTime: '09:00', ToTime: '11:30', Page: 1, PageSize: 25 })).toMatchObject({
      From: '2026-11-01',
      FromTime: '09:00',
      ToTime: undefined,
    });
  });

  it('leaves out the default order and repeats the chosen action codes', () => {
    const q = searchParams({ ...AUDIT_DEFAULTS, ActionCodes: 'Auth.LoginSucceeded,Auth.Logout', Page: 2, PageSize: 50 });
    expect(q.Sort).toBeUndefined();
    expect(q.IncludeChanges).toBeUndefined();
    expect(q.ActionCodes).toEqual(['Auth.LoginSucceeded', 'Auth.Logout']);
    expect(searchParams({ Sort: 'Actor' }).Sort).toBe('Actor');
  });

  it('exports the same filters without paging or the changes switch', () => {
    const q = exportParams({ Outcome: 'Denied', From: '2026-11-01', FromTime: '08:00', Sort: 'Oldest', IncludeChanges: true, Page: 3, PageSize: 100 });
    expect(q).toMatchObject({ Outcome: 'Denied', From: '2026-11-01', FromTime: '08:00', Sort: 'Oldest' });
    expect(q).not.toHaveProperty('Page');
    expect(q).not.toHaveProperty('PageSize');
    expect(q).not.toHaveProperty('IncludeChanges');
  });

  it('offers every order but the default one as an explicit choice', () => {
    expect(AUDIT_SORTS).toEqual(['Oldest', 'Actor', 'Action']);
  });
});
