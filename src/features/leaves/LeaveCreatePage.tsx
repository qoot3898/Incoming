import { useMemo, type FormEvent } from 'react';
import { Alert, Checkbox, FormControlLabel, Grid2 as Grid, Stack, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { leavesApi, leavesKeys } from './api';
import { inclusiveDays } from './leaveFields';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusChip } from '@/components/common/StatusChip';
import { ErrorState, LoadingState } from '@/components/common/States';
import { PageContainer } from '@/components/layout/PageContainer';
import { WorkerPicker } from '@/components/forms/WorkerPicker';
import { useWorkerField } from '@/components/forms/usePrefilledWorker';
import { FormSelectField, FormTextField } from '@/components/forms/fields';
import { FormActions, FormCard, FormErrorAlert, FormSection, FullRow } from '@/components/forms/FormLayout';
import { UnsavedChangesGuard } from '@/components/forms/UnsavedChangesGuard';
import { useFormServerError } from '@/components/forms/useFormServerError';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { formatDate } from '@/utils/format';
import type { S } from '@/types/api';

const DEFAULTS = { type: '', fromDate: '', toDate: '', requiresTravel: false, notes: '' };
const FIELDS = [...Object.keys(DEFAULTS), 'worker'];
const FIELD_MAP = { employeeId: 'worker' };

export default function LeaveCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const workerField = useWorkerField();
  const { worker } = workerField;
  const history = useQuery({ queryKey: leavesKeys.history(worker?.employeeId ?? 0), queryFn: () => leavesApi.history(worker!.employeeId), enabled: !!worker });

  const schema = useMemo(
    () =>
      z
        .object({
          type: z.string().min(1, t('validation.required')),
          fromDate: z.string().min(1, t('validation.required')),
          toDate: z.string().min(1, t('validation.required')),
          requiresTravel: z.boolean(),
          notes: z.string().max(1000, t('validation.maxLength', { max: 1000 })),
        })
        .refine((v) => !v.fromDate || !v.toDate || v.toDate >= v.fromDate, { path: ['toDate'], message: t('validation.endBeforeStart') }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, watch, setError, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const days = inclusiveDays(watch('fromDate'), watch('toDate'));
  const { serverError, handleServerError, clearServerError } = useFormServerError(
    (field, message) => (field === 'worker' ? workerField.setServerMessage(message) : setError(field as keyof Values, { type: 'server', message })),
    FIELDS,
    FIELD_MAP,
  );
  const submit = useApiMutation((v: { id: number; body: S<'LeaveRequest'> }) => leavesApi.submit(v.id, v.body), {
    invalidate: [leavesKeys.all, ['workers'], ['tasks']],
    rethrow: true,
    success: t('leaves.submitted'),
    onSuccess: (r) => navigate(`/leaves/${r.id}`),
  });

  const onSubmit = (e: FormEvent) => {
    workerField.markAttempted();
    return handleSubmit(async (v) => {
      if (!worker) return;
      clearServerError();
      try {
        await submit.mutateAsync({ id: worker.employeeId, body: { type: v.type as S<'LeaveType'>, fromDate: v.fromDate, toDate: v.toDate, requiresTravel: v.requiresTravel, notes: v.notes.trim() || null } });
      } catch (err) {
        await handleServerError(err);
      }
    })(e);
  };

  return (
    <PageContainer>
      <PageHeader title={t('leaves.new')} breadcrumbs={[{ label: t('nav.items.leaves'), to: '/leaves' }]} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <FormCard>
            <form onSubmit={onSubmit} noValidate>
              <Stack spacing={3}>
                <FormErrorAlert value={serverError} />
                <FormSection title={t('forms.sections.worker')} columns={1}>
                  <WorkerPicker value={worker} onChange={workerField.setWorker} required error={workerField.error} />
                </FormSection>
                <FormSection title={t('forms.sections.details')} columns={3}>
                  <FullRow>
                    <FormSelectField control={control} name="type" label={t('leaves.type')} required options={enumOptions('LeaveType', ENUMS.LeaveType)} />
                  </FullRow>
                  <FormTextField control={control} name="fromDate" type="date" label={t('common.from')} required />
                  <FormTextField control={control} name="toDate" type="date" label={t('common.to')} required helperText={t('leaves.inclusiveHint')} />
                  <TextField label={t('common.days')} value={days ?? '—'} disabled />
                  <FullRow>
                    <Controller
                      name="requiresTravel"
                      control={control}
                      render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} label={t('leaves.requiresTravel')} />}
                    />
                  </FullRow>
                  <FullRow>
                    <FormTextField control={control} name="notes" label={t('common.notes')} multiline minRows={3} />
                  </FullRow>
                </FormSection>
                <Typography variant="caption" color="text.secondary">
                  {t('leaves.chainHint')}
                </Typography>
                <FormActions submitLabel={t('leaves.submit')} submitting={formState.isSubmitting} onCancel={() => navigate('/leaves')} />
              </Stack>
            </form>
          </FormCard>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <SectionCard title={t('leaves.previousLeaves')}>
            {!worker ? (
              <Typography variant="body2" color="text.secondary">
                {t('leaves.selectWorkerFirst')}
              </Typography>
            ) : history.data ? (
              <Stack spacing={1}>
                <Typography variant="body2">{t('leaves.takenSummary', { count: history.data.takenCount, days: history.data.takenDays })}</Typography>
                {history.data.openLeaveId && <Alert severity="warning">{t('leaves.hasOpenLeave')}</Alert>}
                {history.data.leaves.slice(0, 8).map((l) => (
                  <Stack key={l.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="body2">
                      {label('LeaveType', l.type)} · {formatDate(l.fromDate)} – {formatDate(l.toDate)} ({l.days})
                    </Typography>
                    <StatusChip enumName="LeaveStatus" value={l.status} />
                  </Stack>
                ))}
              </Stack>
            ) : history.error ? (
              <ErrorState error={history.error} onRetry={() => void history.refetch()} />
            ) : (
              <LoadingState minHeight={80} />
            )}
          </SectionCard>
        </Grid>
      </Grid>
      <UnsavedChangesGuard when={formState.isDirty && !formState.isSubmitting && !formState.isSubmitSuccessful} />
    </PageContainer>
  );
}
