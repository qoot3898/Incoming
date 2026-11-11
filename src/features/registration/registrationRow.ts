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
  healthCertificateIssueDate: string;
  healthCertificateExpiryDate: string;
  departmentId: string;
  /** TL-N2 (2026-11-09): the candidate's scans attached in the queue before registration. */
  passportScan: boolean;
  healthScan: boolean;
}

export type RowField = Exclude<keyof RegistrationRow, 'candidateId' | 'requestNumber' | 'passportScan' | 'healthScan'>;
/** A rule about a missing scan is reported on the scan, not on an input cell. */
export type IssueField = RowField | 'passportScan' | 'healthScan';

/** Column groups of the registration table, in display order. */
export const COLUMN_GROUPS: readonly { key: 'identity' | 'passport' | 'health' | 'placement'; fields: readonly IssueField[] }[] = [
  { key: 'identity', fields: ['name', 'nationalityId', 'gender', 'maritalStatus', 'birthDate', 'birthPlaceId', 'nationalNumber', 'idCardNumber', 'phoneNumber'] },
  { key: 'passport', fields: ['passportNumber', 'passportIssueDate', 'passportExpiryDate', 'passportScan'] },
  { key: 'health', fields: ['healthCertificateIssueDate', 'healthCertificateExpiryDate', 'healthScan'] },
  { key: 'placement', fields: ['departmentId'] },
];

type Scans = Pick<QueueItem, 'passportScanAttached' | 'healthCertificateScanAttached'>;

/**
 * Scans still missing before a candidate can be registered (TL-N2 as amended 2026-11-09): the health
 * certificate for everyone, the passport for a non-Libyan.
 */
export function missingScans(q: Scans, libyan: boolean): ('Passport' | 'HealthCertificate')[] {
  const missing: ('Passport' | 'HealthCertificate')[] = [];
  if (!libyan && !q.passportScanAttached) missing.push('Passport');
  if (!q.healthCertificateScanAttached) missing.push('HealthCertificate');
  return missing;
}

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
    healthCertificateIssueDate: '',
    healthCertificateExpiryDate: '',
    departmentId: dept ? String(dept) : '',
    passportScan: q.passportScanAttached,
    healthScan: q.healthCertificateScanAttached,
  };
}

export interface RowContext {
  /** The row's nationality is Libyan (national number instead of a passport, TL-12). */
  libyan: boolean;
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
  | 'scanMissing';

export interface RowIssue {
  field: IssueField;
  code: IssueCode;
  max?: number;
}

const blank = (v: string) => v.trim() === '';
type Add = (field: IssueField, code: IssueCode, max?: number) => void;

function identityIssues(r: RegistrationRow, ctx: RowContext, add: Add) {
  if (blank(r.name)) add('name', 'required');
  (['nationalityId', 'gender', 'maritalStatus', 'birthPlaceId', 'departmentId'] as const).forEach((f) => {
    if (!r[f]) add(f, 'required');
  });
  if (!/^\d*$/.test(r.nationalNumber.trim())) add('nationalNumber', 'digits');
  else if (ctx.libyan && blank(r.nationalNumber)) add('nationalNumber', 'required');
}

/** Passport for a non-Libyan (TL-12; no waiver since 2026-11-09) and the passport dates (TL-N4). */
function passportIssues(r: RegistrationRow, ctx: RowContext, add: Add) {
  const hasPassport = !blank(r.passportNumber);
  if (!ctx.libyan && !hasPassport) add('passportNumber', 'required');
  if (hasPassport) {
    datePairIssues(r.passportIssueDate, r.passportExpiryDate, ['passportIssueDate', 'passportExpiryDate'], ctx.today, add);
  } else {
    if (r.passportIssueDate) add('passportIssueDate', 'datesNeedPassport');
    if (r.passportExpiryDate) add('passportExpiryDate', 'datesNeedPassport');
  }
}

/** Both dates required, the issue date not after today, the expiry after the issue. Returns whether the pair is valid. */
function datePairIssues(issue: string, expiry: string, [issueField, expiryField]: [RowField, RowField], today: string, add: Add): boolean {
  let ok = true;
  const flag: Add = (field, code) => {
    ok = false;
    add(field, code);
  };
  if (!issue) flag(issueField, 'required');
  else if (issue > today) flag(issueField, 'notAfterToday');
  if (!expiry) flag(expiryField, 'required');
  else if (issue && expiry <= issue) flag(expiryField, 'expiryAfterIssue');
  return ok;
}

/** Health certificate with both dates, still valid on the registration day (TL-13). */
function healthIssues(r: RegistrationRow, ctx: RowContext, add: Add) {
  const fields: [RowField, RowField] = ['healthCertificateIssueDate', 'healthCertificateExpiryDate'];
  const ok = datePairIssues(r.healthCertificateIssueDate, r.healthCertificateExpiryDate, fields, ctx.today, add);
  if (ok && r.healthCertificateExpiryDate < ctx.today) add('healthCertificateExpiryDate', 'expiredOnRegistration');
}

/**
 * Client copy of the registration rules (frontend-guide §2, TL-12, TL-13, TL-N2 as amended 2026-11-09, TL-N4) so every
 * row's mistakes show before sending; the API re-checks everything and rejects the whole batch.
 */
export function rowIssues(r: RegistrationRow, ctx: RowContext): RowIssue[] {
  const issues: RowIssue[] = [];
  const add: Add = (field, code, max) => issues.push({ field, code, max });
  identityIssues(r, ctx, add);
  passportIssues(r, ctx, add);
  healthIssues(r, ctx, add);
  missingScans({ passportScanAttached: r.passportScan, healthCertificateScanAttached: r.healthScan }, ctx.libyan).forEach((kind) =>
    add(kind === 'Passport' ? 'passportScan' : 'healthScan', 'scanMissing'),
  );
  return issues;
}

const num = (v: string) => (v.trim() ? Number(v) : null);
const str = (v: string) => (v.trim() ? v.trim() : null);

export function toInput(r: RegistrationRow): S<'RegisterWorkerInput'> {
  const passportNumber = str(r.passportNumber);
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
