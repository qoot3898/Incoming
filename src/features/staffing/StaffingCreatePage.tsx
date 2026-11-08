import { useMemo } from 'react';
import { Alert, Stack } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { staffingApi, staffingKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { WorkerPicker } from '@/components/forms/WorkerPicker';
import { FormSelectField, FormTextField } from '@/components/forms/fields';
import { FormActions, FormCard, FormErrorAlert, FormSection, FullRow } from '@/components/forms/FormLayout';
import { UnsavedChangesGuard } from '@/components/forms/UnsavedChangesGuard';
import { useFormServerError } from '@/components/forms/useFormServerError';
import { useScopeOptions } from '@/features/shared/options';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import type { S } from '@/types/api';

type Worker = S<'LaborWorkerListItem'>;

const DEFAULTS = {
  trackId: '',
  workSiteId: '',
  jobId: '',
  count: 1,
  reason: '',
  leavingWorker: null as Worker | null,
  requiredStartDate: '',
  justification: '',
  requestedBy: '',
};
/** API field → form field, for server validation messages. */
const FIELD_MAP = { leavingEmployeeId: 'leavingWorker' };

export default function StaffingCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enumOptions = useEnumOptions();

  const schema = useMemo(
    () =>
      z
        .object({
          trackId: z.string().min(1, t('validation.required')),
          workSiteId: z.string().min(1, t('validation.required')),
          jobId: z.string().min(1, t('validation.required')),
          count: z.coerce.number({ invalid_type_error: t('validation.number') }).int(t('validation.integer')).min(1, t('validation.min', { min: 1 })),
          reason: z.string().min(1, t('validation.required')),
          leavingWorker: z.custom<Worker | null>(),
          requiredStartDate: z.string().min(1, t('validation.required')),
          justification: z.string().trim().min(1, t('validation.required')).max(1000, t('validation.maxLength', { max: 1000 })),
          requestedBy: z.string().max(200, t('validation.maxLength', { max: 200 })),
        })
        .superRefine((v, ctx) => {
          // FR-02: a replacement request names the leaving worker.
          if (v.reason === 'Replacement' && !v.leavingWorker) ctx.addIssue({ code: 'custom', path: ['leavingWorker'], message: t('staffing.leavingRequired') });
        }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, watch, setValue, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });
  const trackId = watch('trackId');
  const reason = watch('reason');
  const opts = useScopeOptions(trackId);
  const { serverError, handleServerError, clearServerError } = useFormServerError(
    (field, message) => setError(field as keyof Values, { type: 'server', message }),
    Object.keys(DEFAULTS),
    FIELD_MAP,
  );

  const mutation = useApiMutation(staffingApi.submit, {
    invalidate: [staffingKeys.all],
    rethrow: true,
    success: t('staffing.submitted'),
    onSuccess: () => navigate('/staffing-requests'),
  });

  const onSubmit = handleSubmit(async (v) => {
    clearServerError();
    try {
      await mutation.mutateAsync({
        trackId: Number(v.trackId),
        workSiteId: Number(v.workSiteId),
        jobId: Number(v.jobId),
        count: v.count,
        reason: v.reason as S<'StaffingReason'>,
        leavingEmployeeId: v.reason === 'Replacement' ? (v.leavingWorker?.employeeId ?? null) : null,
        requiredStartDate: v.requiredStartDate,
        justification: v.justification,
        requestedBy: v.requestedBy || null,
      });
    } catch (e) {
      await handleServerError(e);
    }
  });

  return (
    <PageContainer width="form">
      <PageHeader title={t('staffing.new')} breadcrumbs={[{ label: t('nav.items.staffing'), to: '/staffing-requests' }]} />
      <FormCard>
        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={3}>
            {opts.scopeEmpty && <Alert severity="warning">{t('common.scopeEmpty')}</Alert>}
            <FormErrorAlert value={serverError} />
            <FormSection title={t('staffing.sections.position')}>
              <FormSelectField
                control={control}
                name="trackId"
                label={t('fields.track')}
                required
                options={opts.tracks}
                onValueChange={(v) => {
                  // Sites depend on the track (dependent dropdown).
                  setValue('trackId', v, { shouldValidate: true, shouldDirty: true });
                  setValue('workSiteId', '', { shouldDirty: true });
                }}
              />
              <FormSelectField control={control} name="workSiteId" label={t('fields.workSite')} required options={opts.sites} disabled={!trackId} helperText={!trackId ? t('forms.chooseTrackFirst') : undefined} />
              <FormSelectField control={control} name="jobId" label={t('fields.job')} required options={opts.jobs} />
              <FormTextField control={control} name="count" type="number" label={t('staffing.count')} required slotProps={{ htmlInput: { min: 1 } }} />
            </FormSection>
            <FormSection title={t('staffing.sections.request')}>
              <FormSelectField control={control} name="reason" label={t('staffing.reason')} required options={enumOptions('StaffingReason', ENUMS.StaffingReason)} />
              <FormTextField control={control} name="requiredStartDate" type="date" label={t('staffing.requiredStartDate')} required />
              {reason === 'Replacement' && (
                <FullRow>
                  <Controller
                    name="leavingWorker"
                    control={control}
                    render={({ field, fieldState }) => <WorkerPicker value={field.value} onChange={field.onChange} label={t('staffing.leavingWorker')} required error={fieldState.error?.message} />}
                  />
                </FullRow>
              )}
              <FullRow>
                <FormTextField control={control} name="justification" label={t('staffing.justification')} required multiline minRows={3} />
              </FullRow>
              <FullRow>
                <FormTextField control={control} name="requestedBy" label={t('staffing.requestedBy')} helperText={t('staffing.requestedByHint')} />
              </FullRow>
            </FormSection>
            <FormActions submitLabel={t('staffing.submit')} submitting={formState.isSubmitting} onCancel={() => navigate('/staffing-requests')} />
          </Stack>
        </form>
      </FormCard>
      <UnsavedChangesGuard when={formState.isDirty && !formState.isSubmitting && !formState.isSubmitSuccessful} />
    </PageContainer>
  );
}
