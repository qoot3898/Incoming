import type { S } from '@/types/api';

export type AssignmentState = NonNullable<S<'AssignmentState'>>;

/** States in which the user may work on the system (TL-N3). */
const CLEARED: ReadonlySet<AssignmentState> = new Set(['Approved', 'NotRequired']);

/**
 * The user's position on the assignment-letter gate. Super admins are exempt (they approve the
 * first letters); a response without the field (older API) is treated as cleared.
 */
export function assignmentState(user: Pick<S<'CurrentUserResponse'>, 'isSuperAdmin' | 'assignment'> | null | undefined): AssignmentState {
  if (!user || user.isSuperAdmin) return 'NotRequired';
  return user.assignment?.status ?? 'NotRequired';
}

/** True while the user must upload a letter or wait for its approval before using the system. */
export function needsAssignment(user: Pick<S<'CurrentUserResponse'>, 'isSuperAdmin' | 'assignment'> | null | undefined): boolean {
  return !CLEARED.has(assignmentState(user));
}

/** Routes that stay reachable before the letter is approved (the account's own operations). */
export const ASSIGNMENT_ROUTE = '/assignment';
export const ASSIGNMENT_OPEN_ROUTES: readonly string[] = [ASSIGNMENT_ROUTE, '/change-password'];
