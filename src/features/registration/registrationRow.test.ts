import { describe, expect, it } from 'vitest';
import { defaultsFor, missingScans, rowIssues, splitServerErrors, toInput, type RegistrationRow } from './registrationRow';

const TODAY = '2026-11-09';
const base: RegistrationRow = {
  candidateId: 41,
  requestNumber: 7,
  name: 'Worker',
  nationalityId: '3',
  gender: 'Male',
  maritalStatus: 'Single',
  birthDate: '',
  birthPlaceId: '3',
  nationalNumber: '',
  idCardNumber: '',
  phoneNumber: '',
  passportNumber: 'A1234567',
  passportIssueDate: '2024-03-01',
  passportExpiryDate: '2029-03-01',
  healthCertificateIssueDate: '2026-10-20',
  healthCertificateExpiryDate: '2027-10-20',
  departmentId: '5',
  passportScan: true,
  healthScan: true,
};
const foreigner = { libyan: false, today: TODAY };
const fields = (r: RegistrationRow, ctx = foreigner) => rowIssues(r, ctx).map((i) => `${i.field}:${i.code}`);

describe('registration row rules (TL-N2, TL-N4)', () => {
  it('accepts a complete foreign worker; the phone is optional', () => {
    expect(fields(base)).toEqual([]);
  });

  it('requires a passport with both dates for a non-Libyan', () => {
    expect(fields({ ...base, passportNumber: '', passportIssueDate: '', passportExpiryDate: '' })).toEqual(['passportNumber:required']);
    expect(fields({ ...base, passportIssueDate: '', passportExpiryDate: '' })).toEqual(['passportIssueDate:required', 'passportExpiryDate:required']);
  });

  it('checks passport date order and that the issue date is not in the future', () => {
    expect(fields({ ...base, passportIssueDate: '2026-12-01', passportExpiryDate: '2026-11-30' })).toEqual(['passportIssueDate:notAfterToday', 'passportExpiryDate:expiryAfterIssue']);
  });

  it('refuses passport dates without a passport number (Libyan without passport)', () => {
    const libyan = { ...foreigner, libyan: true };
    expect(fields({ ...base, nationalNumber: '119900112233', passportNumber: '' }, libyan)).toEqual(['passportIssueDate:datesNeedPassport', 'passportExpiryDate:datesNeedPassport']);
    expect(fields({ ...base, nationalNumber: '', passportNumber: '', passportIssueDate: '', passportExpiryDate: '' }, libyan)).toEqual(['nationalNumber:required']);
  });

  it('requires a health certificate valid on the registration day (TL-13)', () => {
    expect(fields({ ...base, healthCertificateIssueDate: '', healthCertificateExpiryDate: '' })).toEqual(['healthCertificateIssueDate:required', 'healthCertificateExpiryDate:required']);
    expect(fields({ ...base, healthCertificateIssueDate: '2025-01-01', healthCertificateExpiryDate: '2026-11-08' })).toEqual(['healthCertificateExpiryDate:expiredOnRegistration']);
    expect(fields({ ...base, healthCertificateExpiryDate: '2026-10-20' })).toEqual(['healthCertificateExpiryDate:expiryAfterIssue']);
  });

  it('needs the scans: health certificate for everyone, passport for a non-Libyan (2026-11-09)', () => {
    expect(fields({ ...base, passportScan: false, healthScan: false })).toEqual(['passportScan:scanMissing', 'healthScan:scanMissing']);
    const libyan = { ...foreigner, libyan: true };
    expect(fields({ ...base, nationalNumber: '119900112233', passportScan: false }, libyan)).toEqual([]);
    expect(fields({ ...base, nationalNumber: '119900112233', healthScan: false }, libyan)).toEqual(['healthScan:scanMissing']);
  });

  it('lists the missing scans of a queue row', () => {
    expect(missingScans({ passportScanAttached: false, healthCertificateScanAttached: false }, false)).toEqual(['Passport', 'HealthCertificate']);
    expect(missingScans({ passportScanAttached: false, healthCertificateScanAttached: true }, true)).toEqual([]);
    expect(missingScans({ passportScanAttached: true, healthCertificateScanAttached: false }, false)).toEqual(['HealthCertificate']);
  });

  it('requires the birth place and the department', () => {
    expect(fields({ ...base, birthPlaceId: '', departmentId: '' })).toEqual(['birthPlaceId:required', 'departmentId:required']);
  });

  it('builds the request without the removed waiver fields', () => {
    const input = toInput(base);
    expect(input).toMatchObject({ passportNumber: 'A1234567', passportIssueDate: '2024-03-01', phoneNumber: null });
    expect(input).not.toHaveProperty('passportWaived');
    expect(toInput({ ...base, passportNumber: '', passportIssueDate: '2024-03-01' })).toMatchObject({ passportNumber: null, passportIssueDate: null });
  });

  it('maps server errors to rows and fields', () => {
    const { rows, rest } = splitServerErrors({ 'workers[1].passportNumber': ['Duplicate'], 'workers[0]': ['Candidate taken'], confirmDuplicates: ['Confirm'] });
    expect(rows).toEqual({ 1: { passportNumber: 'Duplicate' }, 0: { _row: 'Candidate taken' } });
    expect(rest).toEqual(['Confirm']);
  });
});

describe('defaults from the candidate list (TL-N13)', () => {
  const options = { defaultDepartments: [], managementDepartments: [], defaultBirthPlaces: [] } as unknown as Parameters<typeof defaultsFor>[1];
  const item = (phone: string | null) =>
    ({ candidateId: 41, requestNumber: 7, name: 'Adam', nationalityId: 3, managementId: 1, jobId: 2, phone, passportScanAttached: false, healthCertificateScanAttached: false }) as unknown as Parameters<typeof defaultsFor>[0];

  it("suggests the candidate's phone as the employee's number", () => {
    expect(defaultsFor(item('0912345678'), options).phoneNumber).toBe('0912345678');
  });

  it('leaves the number empty when the candidate has none', () => {
    expect(defaultsFor(item(null), options).phoneNumber).toBe('');
  });
});
