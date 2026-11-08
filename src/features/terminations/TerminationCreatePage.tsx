import { useMemo, type FormEvent } from 'react';
import { Stack } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { terminationsApi, terminationsKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { RefusalHint } from '@/components/common/RefusalHint';
import { WorkerPicker } from '@/components/forms/WorkerPicker';
import { useWorkerField } from '@/components/forms/usePrefilledWorker';
import { FormSelectField, FormTextField } from '@/components/forms/fields';
import { FormActions, FormCard, FormErrorAlert, FormSection, FullRow } from '@/components/forms/FormLayout';
import { UnsavedChangesGuard } from '@/components/forms/UnsavedChangesGuard';
import { useFormServerError } from '@/components/forms/useFormServerError';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { addDays } from '@/features/attendance/codes';
import { formatDate, todayIso } from '@/utils/format';
import type { S } from '@/types/api';

const FIELDS = ['initiatedBy', 'reason', 'requestDate', 'resignationNoticeDate', 'reasonDetails', 'absenceIncidentId', 'evaluationId', 'worker'];
const FIELD_MAP = { employeeId: 'worker' };

export default function TerminationCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const [sp] = useSearchParams();
  const workerField = useWorkerField();
  const { worker } = workerField;
  const sources = useQuery({ queryKey: [...terminationsKeys.all, 'sources', worker?.employeeId], queryFn: () => terminationsApi.sources(worker!.employeeId), enabled: !!worker });
  const presetIncident = sp.get('incidentId') ?? '';

  const schema = useMemo(
    () =>
      z
        .object({
          initiatedBy: z.string().min(1, t('validation.required')),
          reason: z.string().min(1, t('validation.required')),
          requestDate: z.string().min(1, t('validation.required')),
          resignationNoticeDate: z.string(),
          reasonDetails: z.string().max(1000, t('validation.maxLength', { max: 1000 })),
          absenceIncidentId: z.string(),
          evaluationId: z.string(),
        })
        .superRefine((v, ctx) => {
          if (v.reason === 'Resignation' && !v.resignationNoticeDate) ctx.addIssue({ code: 'custom', path: ['resignationNoticeDate'], message: t('terminations.noticeDateRequired') });
        }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, watch, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { initiatedBy: '', reason: presetIncident ? 'Absence' : '', requestDate: todayIso(), resignationNoticeDate: '', reasonDetails: '', absenceIncidentId: presetIncident, evaluationId: '' },
  });
  const reason = watch('reason');
  const noticeDate = watch('resignationNoticeDate');
  const s = sources.data;
  const { serverError, handleServerError, clearServerError } = useFormServerError(
    (field, message) => (field === 'worker' ? workerField.setServerMessage(message) : setError(field as keyof Values, { type: 'server', message })),
    FIELDS,
    FIELD_MAP,
  );
  const submit = useApiMutation(terminationsApi.submit, {
    invalidate: [terminationsKeys.all, ['workers'], ['tasks'], ['attendance']],
    rethrow: true,
    success: t('terminations.submitted'),
    onSuccess: (r) => navigate(`/terminations/${r.id}`),
  });

  const onSubmit = (e: FormEvent) => {
    workerField.markAttempted();
    return handleSubmit(async (v) => {
      if (!worker) return;
      clearServerError();
      try {
        await submit.mutateAsync({
          employeeId: worker.employeeId,
          initiatedBy: v.initiatedBy as S<'TerminationInitiator'>,
          reason: v.reason as S<'TerminationReason'>,
          requestDate: v.requestDate,
          resignationNoticeDate: v.reason === 'Resignation' ? v.resignationNoticeDate : null,
          reasonDetails: v.reasonDetails.trim() || null,
          absenceIncidentId: v.reason === 'Absence' && v.absenceIncidentId ? Number(v.absenceIncidentId) : null,
          evaluationId: v.reason === 'NoLongerNeeded' && v.evaluationId ? Number(v.evaluationId) : null,
        });
      } catch (err) {
        await handleServerError(err);
      }
    })(e);
  };

  return (
    <PageContainer width="form">
      <PageHeader title={t('terminations.new')} breadcrumbs={[{ label: t('nav.items.terminations'), to: '/terminations' }]} />
      <FormCard>
        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={3}>
            <FormErrorAlert value={serverError} />
            <FormSection title={t('forms.sections.worker')} columns={1}>
              <WorkerPicker value={worker} onChange={workerField.setWorker} required error={workerField.error} />
              {s?.refusal && <RefusalHint text={s.refusal} />}
            </FormSection>
            <FormSection title={t('forms.sections.details')}>
              <FormSelectField control={control} name="initiatedBy" label={t('terminations.initiator')} required options={enumOptions('TerminationInitiator', ENUMS.TerminationInitiator)} />
              <FormSelectField control={control} name="reason" label={t('terminations.reason')} required options={enumOptions('TerminationReason', ENUMS.TerminationReason)} />
              <FormTextField control={control} name="requestDate" type="date" label={t('terminations.requestDate')} required />
              {/* Conditional fields: shown only for the reason they belong to (FR-46). */}
              {reason === 'Resignation' && (
                <FormTextField
                  control={control}
                  name="resignationNoticeDate"
                  type="date"
                  label={t('terminations.noticeDate')}
                  required
                  helperText={noticeDate && s ? t('terminations.lastWorkingDay', { date: formatDate(addDays(noticeDate, s.resignationNoticeDays)), days: s.resignationNoticeDays }) : undefined}
                />
              )}
              {reason === 'Absence' && (
                <FormSelectField
                  control={control}
                  name="absenceIncidentId"
                  label={t('terminations.incident')}
                  options={(s?.incidents ?? []).map((i) => ({ value: i.id, label: `${formatDate(i.firstDate)} – ${formatDate(i.lastDate)} (${i.days} ${t('common.days')})` }))}
                  helperText={!worker ? t('forms.chooseWorkerFirst') : undefined}
                />
              )}
              {reason === 'NoLongerNeeded' && (
                <FormSelectField
                  control={control}
                  name="evaluationId"
                  label={t('terminations.evaluation')}
                  options={(s?.evaluations ?? []).map((ev) => ({ value: ev.id, label: `${formatDate(ev.evaluationDate)} — ${label('EvaluationResult', ev.result)}` }))}
                  helperText={!worker ? t('forms.chooseWorkerFirst') : undefined}
                />
              )}
              <FullRow>
                <FormTextField control={control} name="reasonDetails" label={t('terminations.reasonDetails')} multiline minRows={3} />
              </FullRow>
            </FormSection>
            <FormActions submitLabel={t('terminations.submit')} destructive submitting={formState.isSubmitting} disabled={!!s?.refusal} onCancel={() => navigate('/terminations')} />
          </Stack>
        </form>
      </FormCard>
      <UnsavedChangesGuard when={formState.isDirty && !formState.isSubmitting && !formState.isSubmitSuccessful} />
    </PageContainer>
  );
}
