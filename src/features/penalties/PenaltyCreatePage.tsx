import { useMemo, type FormEvent } from 'react';
import { Alert, Stack } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { penaltiesApi, penaltiesKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { WorkerPicker } from '@/components/forms/WorkerPicker';
import { summaryToItem, useWorkerField } from '@/components/forms/usePrefilledWorker';
import { FormSelectField, FormTextField } from '@/components/forms/fields';
import { FormActions, FormCard, FormErrorAlert, FormSection, FullRow } from '@/components/forms/FormLayout';
import { UnsavedChangesGuard } from '@/components/forms/UnsavedChangesGuard';
import { useFormServerError } from '@/components/forms/useFormServerError';
import { ErrorState, LoadingState } from '@/components/common/States';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { formatDate, todayIso } from '@/utils/format';
import type { S } from '@/types/api';

type Draft = S<'PenaltyIncidentDraft'>;

const EMPTY = { violation: '', violationDates: '', days: '', reportReference: '', description: '', issuedBy: '', issuedOn: '' };
const FIELDS = [...Object.keys(EMPTY), 'worker'];
const FIELD_MAP = { employeeId: 'worker' };

/**
 * Proposal form (FR-36). When opened from an absence incident (`?incidentId=`), the incident
 * draft is loaded first and becomes the form's initial values — no effect re-seeds the form.
 */
export default function PenaltyCreatePage() {
  const { t } = useTranslation();
  const [sp] = useSearchParams();
  const incidentId = Number(sp.get('incidentId')) || null;
  const draft = useQuery({ queryKey: [...penaltiesKeys.all, 'draft', incidentId], queryFn: () => penaltiesApi.incidentDraft(incidentId!), enabled: !!incidentId });

  return (
    <PageContainer width="form">
      <PageHeader title={t('penalties.new')} breadcrumbs={[{ label: t('nav.items.penalties'), to: '/penalties' }]} />
      {incidentId && draft.isLoading ? (
        <LoadingState />
      ) : incidentId && draft.error ? (
        <ErrorState error={draft.error} onRetry={() => void draft.refetch()} />
      ) : (
        <PenaltyForm incidentId={incidentId} draft={draft.data} />
      )}
    </PageContainer>
  );
}

function PenaltyForm({ incidentId, draft }: { incidentId: number | null; draft?: Draft }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enumOptions = useEnumOptions();
  const workerField = useWorkerField();
  // The incident fixes the worker; otherwise the (optionally prefilled) picker decides.
  const worker = draft ? summaryToItem(draft.worker) : workerField.worker;

  const schema = useMemo(
    () =>
      z.object({
        violation: z.string().min(1, t('validation.required')),
        violationDates: z.string().trim().min(1, t('validation.required')).max(500, t('validation.maxLength', { max: 500 })),
        days: z.string().regex(/^\d*$/, t('validation.integer')),
        reportReference: z.string().max(200, t('validation.maxLength', { max: 200 })),
        description: z.string().trim().min(1, t('validation.required')).max(2000, t('validation.maxLength', { max: 2000 })),
        // TL-N5: who issued the penalty and when — distinct from the entering user and time.
        issuedBy: z.string().trim().min(1, t('validation.required')).max(100, t('validation.maxLength', { max: 100 })),
        issuedOn: z
          .string()
          .min(1, t('validation.required'))
          .refine((v) => v <= todayIso(), t('validation.notAfterToday')),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: draft
      ? { ...EMPTY, violation: 'AbsenceWithoutPermission', violationDates: draft.violationDates ?? '', days: String(draft.days), reportReference: draft.reportReference ?? '', description: draft.description ?? '' }
      : EMPTY,
  });
  const { serverError, handleServerError, clearServerError } = useFormServerError(
    (field, message) => (field === 'worker' ? workerField.setServerMessage(message) : setError(field as keyof Values, { type: 'server', message })),
    FIELDS,
    FIELD_MAP,
  );

  const propose = useApiMutation(penaltiesApi.propose, {
    invalidate: [penaltiesKeys.all, ['attendance'], ['tasks']],
    rethrow: true,
    success: t('penalties.proposed'),
    onSuccess: (r) => navigate(`/penalties/${r.id}`),
  });

  const onSubmit = (e: FormEvent) => {
    workerField.markAttempted();
    return handleSubmit(async (v) => {
      if (!worker) return;
      clearServerError();
      try {
        await propose.mutateAsync({
          employeeId: worker.employeeId,
          absenceIncidentId: incidentId,
          violation: v.violation as S<'PenaltyViolation'>,
          violationDates: v.violationDates,
          days: v.days ? Number(v.days) : null,
          reportReference: v.reportReference || null,
          description: v.description,
          issuedBy: v.issuedBy,
          issuedOn: v.issuedOn,
        });
      } catch (err) {
        await handleServerError(err);
      }
    })(e);
  };

  return (
    <FormCard>
      <form onSubmit={onSubmit} noValidate>
        <Stack spacing={3}>
          {draft && <Alert severity="info">{t('penalties.fromIncident', { from: formatDate(draft.firstDate), to: formatDate(draft.lastDate), days: draft.days })}</Alert>}
          <FormErrorAlert value={serverError} />
          <FormSection title={t('forms.sections.worker')} columns={1}>
            <WorkerPicker value={worker} onChange={workerField.setWorker} required disabled={!!incidentId} error={workerField.error} />
          </FormSection>
          <FormSection title={t('forms.sections.details')}>
            <FullRow>
              <FormSelectField control={control} name="violation" label={t('penalties.violation')} required disabled={!!incidentId} options={enumOptions('PenaltyViolation', ENUMS.PenaltyViolation)} />
            </FullRow>
            <FormTextField control={control} name="violationDates" label={t('penalties.violationDates')} required />
            <FormTextField control={control} name="days" type="number" label={t('common.days')} slotProps={{ htmlInput: { min: 0 } }} />
            <FullRow>
              <FormTextField control={control} name="reportReference" label={t('penalties.reportReference')} />
            </FullRow>
            <FullRow>
              <FormTextField control={control} name="description" label={t('penalties.description')} required multiline minRows={3} />
            </FullRow>
          </FormSection>
          <FormSection title={t('penalties.sections.issuance')}>
            <FormTextField control={control} name="issuedBy" label={t('penalties.issuedBy')} required helperText={t('penalties.issuedByHint')} slotProps={{ htmlInput: { maxLength: 100 } }} />
            <FormTextField control={control} name="issuedOn" type="date" label={t('penalties.issuedOn')} required slotProps={{ htmlInput: { max: todayIso() } }} />
          </FormSection>
          <FormActions submitLabel={t('penalties.propose')} submitting={formState.isSubmitting} onCancel={() => navigate(incidentId ? '/attendance/incidents' : '/penalties')} />
        </Stack>
      </form>
      <UnsavedChangesGuard when={formState.isDirty && !formState.isSubmitting && !formState.isSubmitSuccessful} />
    </FormCard>
  );
}
