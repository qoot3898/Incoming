import { describe, expect, it } from 'vitest';
import { identityPassportIssues } from './identityRules';

const ctx = { libyanIds: new Set([1]) };
const recorded = { passportNumber: 'A1', passportIssueDate: '2024-01-01', passportExpiryDate: '2029-01-01' };
const none = { passportNumber: null, passportIssueDate: null, passportExpiryDate: null };

describe('identity correction passport rules (TL-N2, TL-N4)', () => {
  it('keeps an unchanged record valid', () => {
    expect(identityPassportIssues({ ...recorded, nationalityId: 3 }, recorded, ctx)).toEqual({});
  });

  it('requires both dates for a new passport, in order', () => {
    expect(identityPassportIssues({ passportNumber: 'B2', passportIssueDate: null, passportExpiryDate: null, nationalityId: 3 }, none, ctx)).toEqual({
      passportIssueDate: 'required',
      passportExpiryDate: 'required',
    });
    expect(identityPassportIssues({ passportNumber: 'B2', passportIssueDate: '2025-01-01', passportExpiryDate: '2024-01-01', nationalityId: 3 }, none, ctx)).toEqual({
      passportExpiryDate: 'expiryAfterIssue',
    });
  });

  it('never blanks recorded dates', () => {
    expect(identityPassportIssues({ ...recorded, passportIssueDate: null, nationalityId: 3 }, recorded, ctx).passportIssueDate).toBe('recordedDateKept');
  });

  it("never drops a foreigner's passport; a Libyan's may go", () => {
    const dropped = { ...none, nationalityId: 3 };
    expect(identityPassportIssues(dropped, { ...recorded, passportIssueDate: null, passportExpiryDate: null }, ctx).passportNumber).toBe('passportRemovalNotAllowed');
    expect(identityPassportIssues({ ...none, nationalityId: 1 }, { ...recorded, passportIssueDate: null, passportExpiryDate: null }, ctx)).toEqual({});
  });
});
