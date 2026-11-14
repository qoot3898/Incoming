import { describe, expect, it } from 'vitest';
import { healthCertificateDateProblems } from './healthCertificate';

describe('health certificate dates (TL-N4, TL-N14)', () => {
  it('accepts an issue date on or before the receipt and before the expiry', () => {
    expect(healthCertificateDateProblems({ receivedOn: '2026-11-14', issuedOn: '2026-11-14', expiresOn: '2027-11-14' })).toBeNull();
  });

  it('refuses an issue date after the receipt', () => {
    expect(healthCertificateDateProblems({ receivedOn: '2026-11-10', issuedOn: '2026-11-12', expiresOn: '2027-11-12' })).toEqual({ issuedOn: 'issuedAfterReceipt' });
  });

  it('refuses an expiry on or before the issue date', () => {
    expect(healthCertificateDateProblems({ receivedOn: '2026-11-14', issuedOn: '2026-11-01', expiresOn: '2026-11-01' })).toEqual({ expiresOn: 'expiryAfterIssue' });
  });

  it('says nothing until the issue date is filled in (the required rule speaks first)', () => {
    expect(healthCertificateDateProblems({ receivedOn: '2026-11-14', issuedOn: null, expiresOn: null })).toBeNull();
  });
});
