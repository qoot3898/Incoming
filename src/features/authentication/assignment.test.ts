import { describe, expect, it } from 'vitest';
import { assignmentState, needsAssignment } from './assignment';

const user = (status: 'NotRequired' | 'Required' | 'PendingReview' | 'Returned' | 'Approved', isSuperAdmin = false) => ({
  isSuperAdmin,
  assignment: { status, fileName: null, submittedAt: null, reviewedAt: null, reviewNote: null },
});

describe('assignment-letter gate (TL-N3)', () => {
  it('blocks the system until the letter is approved', () => {
    expect(needsAssignment(user('Required'))).toBe(true);
    expect(needsAssignment(user('PendingReview'))).toBe(true);
    expect(needsAssignment(user('Returned'))).toBe(true);
    expect(needsAssignment(user('Approved'))).toBe(false);
    expect(needsAssignment(user('NotRequired'))).toBe(false);
  });

  it('exempts super administrators and signed-out states', () => {
    expect(assignmentState(user('Required', true))).toBe('NotRequired');
    expect(needsAssignment(null)).toBe(false);
  });
});
