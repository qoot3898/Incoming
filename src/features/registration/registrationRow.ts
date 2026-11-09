import type { S } from '@/types/api';

type QueueItem = S<'RegistrationQueueItem'>;
type Options = S<'RegistrationOptions'>;

/** One worker being registered, as edited in the registration table (strings = raw input values). */
export interface RegistrationRow {
  candidateId: number;
  requestNumber: number;
  name: string;
  nationalityId: string;
  gender: string;
  maritalStatus: string;
  birthDate: string;
  birthPlaceId: string;
  nationalNumber: string;
  idCardNumber: string;
  phoneNumber: string;
  passportNumber: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  /** TL-N2: a non-Libyan registered without a passport (permission `RegisterWithoutPassport`). */
  passportWaived: boolean;
  passportWaiverReason: string;
  healthCertificateIssueDate: string;
  healthCertificateExpiryDate: string;
  departmentId: string;
}

export type RowField = Exclude<keyof RegistrationRow, 'candidateId' | 'requestNumber'>;

/** Column groups of the registration table, in display order. */
export const COLUMN_GROUPS: readonly { key: 'identity' | 'passport' | 'health' | 'placement'; fields: readonly RowField[] }[] = [
  { key: 'identity', fields: ['name', 'nationalityId', 'gender', 'maritalStatus', 'birthDate', 'birthPlaceId', 'nationalNumber', 'idCardNumber', 'phoneNumber'] },
  { key: 'passport', fields: ['passportNumber', 'passportIssueDate', 'passportExpiryDate', 'passportWaived'] },
  { key: 'health', fields: ['healthCertificateIssueDate', 'healthCertificateExpiryDate'] },
  { key: 'placement', fields: ['departmentId'] },
];

export const WAIVER_REASON_MAX = 500;

export function defaultsFor(q: QueueItem, o: Options): RegistrationRow {
  const dept =
    o.defaultDepartments.find((d) => d.managementId === q.managementId && d.jobId === q.jobId)?.departmentId ??
    o.managementDepartments.find((d) => d.managementId === q.managementId)?.departmentId;
  const birth = o.defaultBirthPlaces.find((b) => b.nationalityId === q.nationalityId)?.birthPlaceId;
  return {
    candidateId: q.candidateId,
    requestNumber: q.requestNumber,
    name: q.name ?? '',
    nationalityId: String(q.nationalityId),
    gender: 'Male',
    maritalStatus: 'Single',
    birthDate: '',
    birthPlaceId: birth ? String(birth) : '',
    nationalNumber: '',
    idCardNumber: '',
    phoneNumber: '',
    passportNumber: '',
    passportIssueDate: '',
    passportExpiryDate: '',
    passportWaived: false,
    passportWaiverReason: '',
    healthCertificateIssueDate: '',
    healthCertificateExpiryDate: '',
    departmentId: dept ? String(dept) : '',
  };
}

export interface RowContext {
  /** The row's nationality is Libyan (national number instead of a passport, TL-12). */
  libyan: boolean;
  /** The user may register without a passport (`canRegisterWithoutPassport`). */
  canWaive: boolean;
  /** Registration day, `YYYY-MM-DD`. */
  today: string;
}

export type IssueCode =
  | 'required'
  | 'digits'
  | 'maxLength'
  | 'notAfterToday'
  | 'expiryAfterIssue'
  | 'expiredOnRegistration'
  | 'datesNeedPassport'
  | 'waiverWithoutPassport'
  | 'waiverNotAllowed';

export interface RowIssue {
  field: RowField;
  code: IssueCode;
  max?: number;
}

const blank = (v: string) => v.trim() === '';

/**
 * Client copy of the registration rules (frontend-guide §2, TL-12, TL-13, TL-N2, TL-N4) so every
 * row's mistakes show before sending; the API re-checks everything and rejects the whole batch.
 */
export function rowIssues(r: RegistrationRow, ctx: RowContext): RowIssue[] {
  const issues: RowIssue[] = [];
  const add = (field: RowField, code: IssueCode, max?: number) => issues.push({ field, code, max });

  if (blank(r.name)) add('name', 'required');
  if (!r.nationalityId) add('nationalityId', 'required');
  if (!r.gender) add('gender', 'required');
  if (!r.maritalStatus) add('maritalStatus', 'required');
  if (!r.birthPlaceId) add('birthPlaceId', 'required');
  if (!r.departmentId) add('departmentId', 'required');
  if (!/^\d*$/.test(r.nationalNumber.trim())) add('nationalNumber', 'digits');
  else if (ctx.libyan && blank(r.nationalNumber)) add('nationalNumber', 'required');

  const waived = r.passportWaived && !ctx.libyan;
  const hasPassport = !blank(r.passportNumber);
  if (waived) {
    if (!ctx.canWaive) add('passportWaived', 'waiverNotAllowed');
    if (blank(r.passportWaiverReason)) add('passportWaiverReason', 'required');
    else if (r.passportWaiverReason.trim().length > WAIVER_REASON_MAX) add('passportWaiverReason', 'maxLength', WAIVER_REASON_MAX);
    if (hasPassport) add('passportNumber', 'waiverWithoutPassport');
  } else if (!ctx.libyan && !hasPassport) {
    add('passportNumber', 'required');
  }

  if (hasPassport && !waived) {
    if (!r.passportIssueDate) add('passportIssueDate', 'required');
    else if (r.passportIssueDate > ctx.today) add('passportIssueDate', 'notAfterToday');
    if (!r.passportExpiryDate) add('passportExpiryDate', 'required');
    else if (r.passportIssueDate && r.passportExpiryDate <= r.passportIssueDate) add('passportExpiryDate', 'expiryAfterIssue');
  } else {
    if (r.passportIssueDate) add('passportIssueDate', 'datesNeedPassport');
    if (r.passportExpiryDate) add('passportExpiryDate', 'datesNeedPassport');
  }

  if (!r.healthCertificateIssueDate) add('healthCertificateIssueDate', 'required');
  else if (r.healthCertificateIssueDate > ctx.today) add('healthCertificateIssueDate', 'notAfterToday');
  if (!r.healthCertificateExpiryDate) add('healthCertificateExpiryDate', 'required');
  else if (r.healthCertificateIssueDate && r.healthCertificateExpiryDate <= r.healthCertificateIssueDate) add('healthCertificateExpiryDate', 'expiryAfterIssue');
  else if (r.healthCertificateExpiryDate < ctx.today) add('healthCertificateExpiryDate', 'expiredOnRegistration');

  return issues;
}

const num = (v: string) => (v.trim() ? Number(v) : null);
const str = (v: string) => (v.trim() ? v.trim() : null);

export function toInput(r: RegistrationRow, ctx: Pick<RowContext, 'libyan'>): S<'RegisterWorkerInput'> {
  const waived = r.passportWaived && !ctx.libyan;
  const passportNumber = waived ? null : str(r.passportNumber);
  return {
    candidateId: r.candidateId,
    name: r.name.trim(),
    nationalityId: num(r.nationalityId),
    gender: r.gender as S<'Gender'>,
    maritalStatus: r.maritalStatus as S<'MaritalStatus'>,
    birthDate: str(r.birthDate),
    birthPlaceId: num(r.birthPlaceId),
    passportNumber,
    passportIssueDate: passportNumber ? str(r.passportIssueDate) : null,
    passportExpiryDate: passportNumber ? str(r.passportExpiryDate) : null,
    passportWaived: waived,
    passportWaiverReason: waived ? str(r.passportWaiverReason) : null,
    nationalNumber: num(r.nationalNumber),
    idCardNumber: str(r.idCardNumber),
    phoneNumber: str(r.phoneNumber),
    healthCertificateIssueDate: str(r.healthCertificateIssueDate),
    healthCertificateExpiryDate: str(r.healthCertificateExpiryDate),
    departmentId: num(r.departmentId),
  };
}

const ROW_KEY = /^workers\[(\d+)\](?:\.(\w+))?$/;

/**
 * Splits the API's field errors (`Workers[3].PassportNumber`, camelCased by `toApiError`) into
 * per-row, per-field messages; anything else is returned in `rest` for the form alert.
 */
export function splitServerErrors(fieldErrors: Record<string, string[]>): { rows: Record<number, Partial<Record<string, string>>>; rest: string[] } {
  const rows: Record<number, Partial<Record<string, string>>> = {};
  const rest: string[] = [];
  Object.entries(fieldErrors).forEach(([key, messages]) => {
    const m = ROW_KEY.exec(key);
    if (!m) {
      rest.push(...messages);
      return;
    }
    const index = Number(m[1]);
    const field = m[2] ?? '_row';
    rows[index] = { ...rows[index], [field]: messages.join(' ') };
  });
  return { rows, rest };
}
