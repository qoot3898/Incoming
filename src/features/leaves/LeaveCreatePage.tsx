import { useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, Grid2 as Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
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
import { WorkerPicker } from '@/components/forms/WorkerPicker';
import { usePrefilledWorker } from '@/components/forms/usePrefilledWorker';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { formatDate } from '@/utils/format';
import type { ApiError } from '@/services/api/errors';
import type { S } from '@/types/api';

export default function LeaveCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const [worker, setWorker] = usePrefilledWorker();
  const [serverError, setServerError] = useState<ApiError | null>(null);
  const history = useQuery({ queryKey: leavesKeys.history(worker?.employeeId ?? 0), queryFn: () => leavesApi.history(worker!.employeeId), enabled: !!worker });

  const schema = z
    .object({
      type: z.string().min(1, t('validation.required')),
      fromDate: z.string().min(1, t('validation.required')),
      toDate: z.string().min(1, t('validation.required')),
      requiresTravel: z.boolean(),
      notes: z.string().max(1000, t('validation.maxLength', { max: 1000 })),
    })
    .refine((v) => !v.fromDate || !v.toDate || v.toDate >= v.fromDate, { path: ['toDate'], message: t('validation.endBeforeStart') });
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, watch, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { type: '', fromDate: '', toDate: '', requiresTravel: false, notes: '' },
  });
  const days = inclusiveDays(watch('fromDate'), watch('toDate'));
  const submit = useApiMutation((v: { id: number; body: S<'LeaveRequest'> }) => leavesApi.submit(v.id, v.body), {
    invalidate: [leavesKeys.all, ['workers'], ['tasks']],
    rethrow: true,
    success: t('leaves.submitted'),
    onSuccess: (r) => navigate(`/leaves/${r.id}`),
  });

  const onSubmit = handleSubmit(async (v) => {
    if (!worker) return;
    setServerError(null);
    try {
      await submit.mutateAsync({ id: worker.employeeId, body: { type: v.type as S<'LeaveType'>, fromDate: v.fromDate, toDate: v.toDate, requiresTravel: v.requiresTravel, notes: v.notes.trim() || null } });
    } catch (e) {
      const err = e as ApiError;
      Object.entries(err.fieldErrors).forEach(([k, m]) => k in v && setError(k as keyof Values, { message: m.join(' ') }));
      setServerError(err);
    }
  });

  return (
    <Box>
      <PageHeader title={t('leaves.new')} subtitle={t('leaves.newHint')} breadcrumbs={[{ label: t('nav.items.leaves'), to: '/leaves' }]} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <form onSubmit={onSubmit} noValidate>
              <Stack spacing={2}>
                {serverError && <Alert severity="error">{serverError.detail || serverError.title}</Alert>}
                <WorkerPicker value={worker} onChange={setWorker} required />
                <Controller
                  name="type"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField select required label={t('leaves.type')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message}>
                      {enumOptions('LeaveType', ENUMS.LeaveType).map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 120px' }, alignItems: 'start' }}>
                  {(['fromDate', 'toDate'] as const).map((n) => (
                    <Controller
                      key={n}
                      name={n}
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField type="date" required label={n === 'fromDate' ? t('common.from') : t('common.to')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message} slotProps={{ inputLabel: { shrink: true } }} />
                      )}
                    />
                  ))}
                  <TextField label={t('common.days')} value={days ?? '—'} disabled />
                </Box>
                <Controller name="requiresTravel" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} label={t('leaves.requiresTravel')} />} />
                <Controller name="notes" control={control} render={({ field, fieldState }) => <TextField multiline minRows={3} label={t('common.notes')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Typography variant="caption" color="text.secondary">
                  {t('leaves.chainHint')}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" disabled={!worker || formState.isSubmitting}>
                    {t('leaves.submit')}
                  </Button>
                  <Button color="inherit" onClick={() => navigate(-1)}>
                    {t('common.cancel')}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <SectionCard title={t('leaves.previousLeaves')} subheader={t('leaves.noBalances')}>
            {!worker ? (
              <Typography variant="body2" color="text.secondary">
                {t('leaves.selectWorkerFirst')}
              </Typography>
            ) : history.data ? (
              <Stack spacing={1}>
                <Typography variant="body2">{t('leaves.takenSummary', { count: history.data.takenCount, days: history.data.takenDays })}</Typography>
                {history.data.openLeaveId && <Alert severity="warning">{t('leaves.hasOpenLeave')}</Alert>}
                {history.data.leaves.slice(0, 8).map((l) => (
                  <Stack key={l.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="body2">
                      {label('LeaveType', l.type)} · {formatDate(l.fromDate)} – {formatDate(l.toDate)} ({l.days})
                    </Typography>
                    <StatusChip enumName="LeaveStatus" value={l.status} />
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('common.loading')}
              </Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
