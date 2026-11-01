import { useEffect, useState } from 'react';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { penaltiesApi, penaltiesKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { WorkerPicker } from '@/components/forms/WorkerPicker';
import { summaryToItem, usePrefilledWorker } from '@/components/forms/usePrefilledWorker';
import { ErrorState, LoadingState } from '@/components/common/States';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { formatDate } from '@/utils/format';
import type { ApiError } from '@/services/api/errors';
import type { S } from '@/types/api';

export default function PenaltyCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enumOptions = useEnumOptions();
  const [sp] = useSearchParams();
  const incidentId = Number(sp.get('incidentId')) || null;
  const [worker, setWorker] = usePrefilledWorker();
  const [serverError, setServerError] = useState<ApiError | null>(null);
  const draft = useQuery({ queryKey: [...penaltiesKeys.all, 'draft', incidentId], queryFn: () => penaltiesApi.incidentDraft(incidentId!), enabled: !!incidentId });

  const schema = z.object({
    violation: z.string().min(1, t('validation.required')),
    violationDates: z.string().trim().min(1, t('validation.required')).max(500),
    days: z.string().regex(/^\d*$/, t('validation.integer')),
    reportReference: z.string().max(200, t('validation.maxLength', { max: 200 })),
    description: z.string().trim().min(1, t('validation.required')).max(2000, t('validation.maxLength', { max: 2000 })),
  });
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, reset, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { violation: '', violationDates: '', days: '', reportReference: '', description: '' },
  });

  useEffect(() => {
    const d = draft.data;
    if (!d) return;
    setWorker(summaryToItem(d.worker));
    reset({ violation: 'AbsenceWithoutPermission', violationDates: d.violationDates ?? '', days: String(d.days), reportReference: d.reportReference ?? '', description: d.description ?? '' });
  }, [draft.data, reset, setWorker]);

  const propose = useApiMutation(penaltiesApi.propose, {
    invalidate: [penaltiesKeys.all, ['attendance'], ['tasks']],
    rethrow: true,
    success: t('penalties.proposed'),
    onSuccess: (r) => navigate(`/penalties/${r.id}`),
  });

  const onSubmit = handleSubmit(async (v) => {
    if (!worker) return;
    setServerError(null);
    try {
      await propose.mutateAsync({
        employeeId: worker.employeeId,
        absenceIncidentId: incidentId,
        violation: v.violation as S<'PenaltyViolation'>,
        violationDates: v.violationDates,
        days: v.days ? Number(v.days) : null,
        reportReference: v.reportReference || null,
        description: v.description,
      });
    } catch (e) {
      const err = e as ApiError;
      Object.entries(err.fieldErrors).forEach(([k, m]) => k in v && setError(k as keyof Values, { message: m.join(' ') }));
      setServerError(err);
    }
  });

  if (incidentId && draft.isLoading) return <LoadingState />;
  const text = (name: keyof Values, label: string, opts: { multiline?: boolean; required?: boolean; type?: string } = {}) => (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField {...field} label={label} required={opts.required} multiline={opts.multiline} minRows={opts.multiline ? 3 : undefined} type={opts.type} error={!!fieldState.error} helperText={fieldState.error?.message} />
      )}
    />
  );

  return (
    <Box>
      <PageHeader title={t('penalties.new')} subtitle={t('penalties.newHint')} breadcrumbs={[{ label: t('nav.items.penalties'), to: '/penalties' }]} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 820 }}>
        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={2}>
            {draft.error && <ErrorState error={draft.error} />}
            {draft.data && <Alert severity="info">{t('penalties.fromIncident', { from: formatDate(draft.data.firstDate), to: formatDate(draft.data.lastDate), days: draft.data.days })}</Alert>}
            {serverError && <Alert severity="error">{serverError.detail || serverError.title}</Alert>}
            <WorkerPicker value={worker} onChange={setWorker} required disabled={!!incidentId} />
            <Controller
              name="violation"
              control={control}
              render={({ field, fieldState }) => (
                <TextField select required label={t('penalties.violation')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message} disabled={!!incidentId}>
                  {enumOptions('PenaltyViolation', ENUMS.PenaltyViolation).map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' } }}>
              {text('violationDates', t('penalties.violationDates'), { required: true })}
              {text('days', t('common.days'), { type: 'number' })}
            </Box>
            {text('reportReference', t('penalties.reportReference'))}
            {text('description', t('penalties.description'), { multiline: true, required: true })}
            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained" disabled={!worker || formState.isSubmitting}>
                {t('penalties.propose')}
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
