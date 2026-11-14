import { useTranslation } from 'react-i18next';
import type { FieldConfig, FormDialogValidate } from '@/components/forms/FormDialog';
import { todayIso } from '@/utils/format';

/**
 * A health certificate received for a worker (TL-N14): `POST /workers/{id}/health-certificates`, multipart with
 * `receivedOn`, `issuedOn`, `expiresOn` (all required), `notes` and an optional `scan`. Renewing adds a new
 * document; the generic document endpoint no longer takes certificate dates.
 */
export interface HealthCertificateValues {
  receivedOn: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  notes: string | null;
  scan: File | null;
}

type DateFields = Pick<HealthCertificateValues, 'receivedOn' | 'issuedOn' | 'expiresOn'>;

/** The issue date is neither after the receipt nor on/after the expiry (same rule as registration, TL-N4). */
export function healthCertificateDateProblems(v: DateFields): Partial<Record<keyof DateFields, 'issuedAfterReceipt' | 'expiryAfterIssue'>> | null {
  if (!v.issuedOn) return null;
  if (v.receivedOn && v.issuedOn > v.receivedOn) return { issuedOn: 'issuedAfterReceipt' };
  if (v.expiresOn && v.expiresOn <= v.issuedOn) return { expiresOn: 'expiryAfterIssue' };
  return null;
}

/** Fields and cross-field validation of the renewal dialog (worker file). */
export function useHealthCertificateForm(): { fields: FieldConfig<HealthCertificateValues>[]; validate: FormDialogValidate<HealthCertificateValues> } {
  const { t } = useTranslation();
  const today = todayIso();
  return {
    fields: [
      { name: 'receivedOn', kind: 'date', label: t('onboarding.receivedOn'), required: true, max: today },
      { name: 'issuedOn', kind: 'date', label: t('onboarding.issuedOn'), required: true, half: true, max: today },
      { name: 'expiresOn', kind: 'date', label: t('onboarding.expiresOn'), required: true, half: true },
      { name: 'notes', kind: 'textarea', label: t('common.notes'), maxLength: 500 },
      { name: 'scan', kind: 'file', label: t('attachments.scan') },
    ],
    validate: (v) => healthCertificateValidation(v, t),
  };
}

export function healthCertificateValidation(v: DateFields, t: (key: string) => string) {
  const problems = healthCertificateDateProblems(v);
  if (!problems) return null;
  return {
    issuedOn: problems.issuedOn && t('onboarding.issuedAfterReceipt'),
    expiresOn: problems.expiresOn && t('validation.expiryAfterIssue'),
  };
}
