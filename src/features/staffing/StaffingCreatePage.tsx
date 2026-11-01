import { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, MenuItem } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { staffingApi, staffingKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { WorkerPicker } from '@/components/forms/WorkerPicker';
import { useScopeOptions } from '@/features/shared/options';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import type { ApiError } from '@/services/api/errors';
import type { S } from '@/types/api';

type Worker = S<'LaborWorkerListItem'>;

export default function StaffingCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enumOptions = useEnumOptions();
  const [leaving, setLeaving] = useState<Worker | null>(null);
  const [serverError, setServerError] = useState<ApiError | null>(null);

  const schema = z
    .object({
      trackId: z.string().min(1, t('validation.required')),
      workSiteId: z.string().min(1, t('validation.required')),
      jobId: z.string().min(1, t('validation.required')),
      count: z.coerce.number({ invalid_type_error: t('validation.number') }).int(t('validation.integer')).min(1, t('validation.min', { min: 1 })),
      reason: z.string().min(1, t('validation.required')),
      requiredStartDate: z.string().min(1, t('validation.required')),
      justification: z.string().trim().min(1, t('validation.required')).max(1000, t('validation.maxLength', { max: 1000 })),
      requestedBy: z.string().max(200, t('validation.maxLength', { max: 200 })),
    })
    .superRefine((v, ctx) => {
      if (v.reason === 'Replacement' && !leaving) ctx.addIssue({ code: 'custom', path: ['reason'], message: t('staffing.leavingRequired') });
    });
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, watch, setValue, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { trackId: '', workSiteId: '', jobId: '', count: 1, reason: '', requiredStartDate: '', justification: '', requestedBy: '' },
  });
  const trackId = watch('trackId');
  const reason = watch('reason');
  const opts = useScopeOptions(trackId);

  const mutation = useApiMutation(staffingApi.submit, {
    invalidate: [staffingKeys.all],
    rethrow: true,
    success: t('staffing.submitted'),
    onSuccess: () => navigate('/staffing-requests'),
  });

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      await mutation.mutateAsync({
        trackId: Number(v.trackId),
        workSiteId: Number(v.workSiteId),
        jobId: Number(v.jobId),
        count: v.count,
        reason: v.reason as S<'StaffingReason'>,
        leavingEmployeeId: v.reason === 'Replacement' ? leaving?.employeeId ?? null : null,
        requiredStartDate: v.requiredStartDate,
        justification: v.justification,
        requestedBy: v.requestedBy || null,
      });
    } catch (e) {
      const err = e as ApiError;
      Object.entries(err.fieldErrors).forEach(([k, m]) => {
        if (k in v) setError(k as keyof Values, { message: m.join(' ') });
      });
      setServerError(err);
    }
  });

  const select = (name: 'trackId' | 'workSiteId' | 'jobId' | 'reason', label: string, options: { value: string | number; label: string }[], onChange?: (v: string) => void) => (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          select
          required
          label={label}
          {...field}
          onChange={(e) => (onChange ? onChange(e.target.value) : field.onChange(e.target.value))}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
        >
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
      <PageHeader title={t('staffing.new')} subtitle={t('staffing.newHint')} breadcrumbs={[{ label: t('nav.items.staffing'), to: '/staffing-requests' }]} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 860 }}>
        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={2.5}>
            {opts.scopeEmpty && <Alert severity="warning">{t('common.scopeEmpty')}</Alert>}
            {serverError && <Alert severity="error">{serverError.detail || serverError.title}</Alert>}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              {select('trackId', t('fields.track'), opts.tracks, (v) => {
                setValue('trackId', v, { shouldValidate: true });
                setValue('workSiteId', '');
              })}
              {select('workSiteId', t('fields.workSite'), opts.sites)}
              {select('jobId', t('fields.job'), opts.jobs)}
              <Controller
                name="count"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField type="number" required label={t('staffing.count')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message} slotProps={{ htmlInput: { min: 1 } }} />
                )}
              />
              {select('reason', t('staffing.reason'), enumOptions('StaffingReason', ENUMS.StaffingReason))}
              <Controller
                name="requiredStartDate"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField type="date" required label={t('staffing.requiredStartDate')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message} slotProps={{ inputLabel: { shrink: true } }} />
                )}
              />
            </Box>
            {reason === 'Replacement' && (
              <WorkerPicker value={leaving} onChange={setLeaving} label={t('staffing.leavingWorker')} required />
            )}
            <Controller
              name="justification"
              control={control}
              render={({ field, fieldState }) => (
                <TextField multiline minRows={3} required label={t('staffing.justification')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
              )}
            />
            <Controller
              name="requestedBy"
              control={control}
              render={({ field, fieldState }) => (
                <TextField label={t('staffing.requestedBy')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message ?? t('staffing.requestedByHint')} />
              )}
            />
            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained" disabled={formState.isSubmitting}>
                {t('staffing.submit')}
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
