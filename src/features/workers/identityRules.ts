import type { S } from '@/types/api';

type Identity = Pick<S<'UpdateEmployeeIdentityRequest'>, 'passportNumber' | 'passportIssueDate' | 'passportExpiryDate' | 'nationalityId'>;
type Recorded = Pick<S<'LaborWorkerDetails'>, 'passportNumber' | 'passportIssueDate' | 'passportExpiryDate'>;

export type IdentityIssue = 'required' | 'expiryAfterIssue' | 'datesNeedPassport' | 'passportRemovalNotAllowed' | 'recordedDateKept';
export type IdentityIssues = Partial<Record<'passportNumber' | 'passportIssueDate' | 'passportExpiryDate', IdentityIssue>>;

export interface IdentityContext {
  /** Nationalities that give a national number instead of a passport (TL-12). */
  libyanIds: ReadonlySet<number>;
}

/** A new or changed passport needs both dates, in order (TL-N4). */
function passportDateIssues(v: Identity, w: Recorded, out: IdentityIssues) {
  const changed = (v.passportNumber ?? '') !== (w.passportNumber ?? '');
  if (!v.passportIssueDate && (changed || w.passportIssueDate)) out.passportIssueDate = 'required';
  if (!v.passportExpiryDate && (changed || w.passportExpiryDate)) out.passportExpiryDate = 'required';
  if (v.passportIssueDate && v.passportExpiryDate && v.passportExpiryDate <= v.passportIssueDate) out.passportExpiryDate = 'expiryAfterIssue';
}

/** No dates without a number; a foreigner's passport is never dropped (the waiver was removed 2026-11-09, TL-N2). */
function noPassportIssues(v: Identity, w: Recorded, ctx: IdentityContext, out: IdentityIssues) {
  if (v.passportIssueDate || v.passportExpiryDate) out.passportNumber = 'datesNeedPassport';
  const foreign = v.nationalityId !== null && v.nationalityId !== undefined && !ctx.libyanIds.has(Number(v.nationalityId));
  if (w.passportNumber && foreign) out.passportNumber = 'passportRemovalNotAllowed';
}

/**
 * Passport rules of an identity correction (`PUT /employees/{id}/identity`). The request replaces the
 * identity, so recorded dates are sent back and are never blanked.
 */
export function identityPassportIssues(v: Identity, w: Recorded, ctx: IdentityContext): IdentityIssues {
  const out: IdentityIssues = {};
  if (v.passportNumber) passportDateIssues(v, w, out);
  else noPassportIssues(v, w, ctx, out);
  if (w.passportIssueDate && !v.passportIssueDate) out.passportIssueDate = 'recordedDateKept';
  if (w.passportExpiryDate && !v.passportExpiryDate) out.passportExpiryDate = 'recordedDateKept';
  return out;
}
