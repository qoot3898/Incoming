import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldConfig } from '@/components/forms/FormDialog';
import { useScopeOptions } from '@/features/shared/options';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import type { S } from '@/types/api';

/** What the user enters for a candidate (TL-N13): the fields of `CandidateInput`, shared by add, edit and the request form. */
export type CandidateValues = S<'CandidateInput'>;

/** Field limits of the API (frontend-guide §14). */
export const CANDIDATE_LIMITS = { name: 50, nominatedBy: 100, phone: 50, notes: 500 } as const;

/** The parties that recruit candidates. */
export const RECRUITERS = ['LaborSection', 'Operations'] as const;

/**
 * Form fields for a candidate. `name`, `nationalityId` and `recruitedBy` are required; the phone, the job the
 * candidate is for (it narrows the list when picking for a request), who nominated him and notes are optional.
 */
export function useCandidateFields(): FieldConfig<CandidateValues>[] {
  const { t } = useTranslation();
  const enumOptions = useEnumOptions();
  const { nationalities, jobs } = useScopeOptions();
  return useMemo(
    () => [
      { name: 'name', kind: 'text', label: t('fields.name'), required: true, maxLength: CANDIDATE_LIMITS.name },
      { name: 'nationalityId', kind: 'select', label: t('fields.nationality'), required: true, half: true, options: nationalities },
      { name: 'recruitedBy', kind: 'select', label: t('candidates.recruitedBy'), required: true, half: true, options: enumOptions('LaborParty', RECRUITERS) },
      { name: 'phone', kind: 'text', label: t('candidates.phone'), half: true, maxLength: CANDIDATE_LIMITS.phone },
      { name: 'jobId', kind: 'select', label: t('candidates.candidateJob'), half: true, options: jobs },
      { name: 'nominatedBy', kind: 'text', label: t('candidates.nominatedBy'), maxLength: CANDIDATE_LIMITS.nominatedBy },
      { name: 'notes', kind: 'textarea', label: t('common.notes'), maxLength: CANDIDATE_LIMITS.notes },
    ],
    [t, enumOptions, nationalities, jobs],
  );
}
