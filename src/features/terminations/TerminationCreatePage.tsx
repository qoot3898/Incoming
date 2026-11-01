import { useState } from 'react';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { terminationsApi, terminationsKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { RefusalHint } from '@/components/common/RefusalHint';
import { WorkerPicker } from '@/components/forms/WorkerPicker';
import { usePrefilledWorker } from '@/components/forms/usePrefilledWorker';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { addDays } from '@/features/attendance/codes';
import { formatDate, todayIso } from '@/utils/format';
import type { ApiError } from '@/services/api/errors';
import type { S } from '@/types/api';

export default function TerminationCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const [sp] = useSearchParams();
  const [worker, setWorker] = usePrefilledWorker();
  const [serverError, setServerError] = useState<ApiError | null>(null);
  const sources = useQuery({ queryKey: [...terminationsKeys.all, 'sources', worker?.employeeId], queryFn: () => terminationsApi.sources(worker!.employeeId), enabled: !!worker });
  const presetIncident = sp.get('incidentId') ?? '';

  const schema = z
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
    });
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, watch, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { initiatedBy: '', reason: presetIncident ? 'Absence' : '', requestDate: todayIso(), resignationNoticeDate: '', reasonDetails: '', absenceIncidentId: presetIncident, evaluationId: '' },
  });
  const reason = watch('reason');
  const noticeDate = watch('resignationNoticeDate');
  const s = sources.data;
  const submit = useApiMutation(terminationsApi.submit, {
    invalidate: [terminationsKeys.all, ['workers'], ['tasks'], ['attendance']],
    rethrow: true,
    success: t('terminations.submitted'),
    onSuccess: (r) => navigate(`/terminations/${r.id}`),
  });

  const onSubmit = handleSubmit(async (v) => {
    if (!worker) return;
    setServerError(null);
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
    } catch (e) {
      const err = e as ApiError;
      Object.entries(err.fieldErrors).forEach(([k, m]) => k in v && setError(k as keyof Values, { message: m.join(' ') }));
      setServerError(err);
    }
  });

  const select = (name: keyof Values, lbl: string, options: { value: string | number; label: string }[], required = false) => (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField select required={required} label={lbl} {...field} error={!!fieldState.error} helperText={fieldState.error?.message}>
          {!required && (
            <MenuItem value="">
              <em>{t('common.none')}</em>
            </MenuItem>
          )}
          {options.map((o) => (
            <MenuItem key={String(o.value)} value={String(o.value)}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );

  return (
    <Box>
      <PageHeader title={t('terminations.new')} subtitle={t('terminations.newHint')} breadcrumbs={[{ label: t('nav.items.terminations'), to: '/terminations' }]} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 860 }}>
        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={2}>
            {serverError && <Alert severity="error">{serverError.detail || serverError.title}</Alert>}
            <WorkerPicker value={worker} onChange={setWorker} required />
            {s?.refusal && <RefusalHint text={s.refusal} />}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              {select('initiatedBy', t('terminations.initiator'), enumOptions('TerminationInitiator', ENUMS.TerminationInitiator), true)}
              {select('reason', t('terminations.reason'), enumOptions('TerminationReason', ENUMS.TerminationReason), true)}
              <Controller name="requestDate" control={control} render={({ field, fieldState }) => <TextField type="date" required label={t('terminations.requestDate')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message} slotProps={{ inputLabel: { shrink: true } }} />} />
              {reason === 'Resignation' && (
                <Controller
                  name="resignationNoticeDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      type="date"
                      required
                      label={t('terminations.noticeDate')}
                      {...field}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message ?? (noticeDate && s ? t('terminations.lastWorkingDay', { date: formatDate(addDays(noticeDate, s.resignationNoticeDays)), days: s.resignationNoticeDays }) : undefined)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  )}
                />
              )}
              {reason === 'Absence' &&
                select(
                  'absenceIncidentId',
                  t('terminations.incident'),
                  (s?.incidents ?? []).map((i) => ({ value: i.id, label: `${formatDate(i.firstDate)} – ${formatDate(i.lastDate)} (${i.days} ${t('common.days')})` })),
                )}
              {reason === 'NoLongerNeeded' &&
                select(
                  'evaluationId',
                  t('terminations.evaluation'),
                  (s?.evaluations ?? []).map((e) => ({ value: e.id, label: `${formatDate(e.evaluationDate)} — ${label('EvaluationResult', e.result)}` })),
                )}
            </Box>
            <Controller name="reasonDetails" control={control} render={({ field, fieldState }) => <TextField multiline minRows={3} label={t('terminations.reasonDetails')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained" color="error" disabled={!worker || !!s?.refusal || formState.isSubmitting}>
                {t('terminations.submit')}
              </Button>
              <Button color="inherit" onClick={() => navigate(-1)}>
                {t('common.cancel')}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
