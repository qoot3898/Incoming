/**
 * TL-N8: a replacement request names one different leaving worker per requested place, so the number
 * of leaving workers equals the request's count. A need request (open need / new site) names nobody.
 */
export type LeaversProblem = 'required' | 'count';

export function leaversProblem(reason: string, count: number, leaverIds: readonly number[]): LeaversProblem | null {
  if (reason !== 'Replacement') return null;
  if (leaverIds.length === 0) return 'required';
  // A non-numeric or zero count is reported by the count field itself.
  if (Number.isInteger(count) && count >= 1 && leaverIds.length !== count) return 'count';
  return null;
}

/** The API's `leavingEmployeeIds`: the chosen workers for a replacement, `null` for a need request. */
export function leavingEmployeeIds(reason: string, leavers: readonly { employeeId: number }[]): number[] | null {
  return reason === 'Replacement' ? leavers.map((l) => l.employeeId) : null;
}

/**
 * The requested count as the form holds it (a number input gives text while typing): a whole number
 * from 1, otherwise `undefined` until the field itself is valid.
 */
export function parseCount(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : undefined;
}
