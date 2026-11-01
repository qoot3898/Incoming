import { useState } from 'react';
import { Alert, Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { transfersApi, transfersKeys } from './api';
import { WorkerPicker } from '@/components/forms/WorkerPicker';
import { RefusalHint } from '@/components/common/RefusalHint';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { ENUMS } from '@/constants/enums';
import type { ApiError } from '@/services/api/errors';
import type { S } from '@/types/api';

type Worker = S<'LaborWorkerListItem'>;

interface Props {
  worker: Worker | null;
  onWorkerChange?: (w: Worker | null) => void;
  transferId?: number;
  initial?: Partial<{ initiatedBy: string; proposedSiteId: number; reason: string; requestedDate: string }>;
  submitLabel: string;
  onSubmit: (body: S<'TransferRequestInput'>) => Promise<unknown>;
  onCancel?: () => void;
}

/** Transfer request form (TL-F08 A) used for new requests and re-submission. */
export function TransferForm({ worker, onWorkerChange, transferId, initial, submitLabel, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const enumOptions = useEnumOptions();
  const [serverError, setServerError] = useState<ApiError | null>(null);
  const options = useQuery({
    queryKey: [...transfersKeys.all, 'options', worker?.employeeId, transferId],
    queryFn: () => transfersApi.options(worker!.employeeId, transferId),
    enabled: !!worker,
  });
  const schema = z.object({
    initiatedBy: z.string().min(1, t('validation.required')),
    proposedSiteId: z.string().min(1, t('validation.required')),
    reason: z.string().trim().min(1, t('validation.required')).max(1000, t('validation.maxLength', { max: 1000 })),
    requestedDate: z.string().min(1, t('validation.required')),
  });
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, setValue, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      initiatedBy: initial?.initiatedBy ?? '',
      proposedSiteId: initial?.proposedSiteId ? String(initial.proposedSiteId) : '',
      reason: initial?.reason ?? '',
      requestedDate: initial?.requestedDate ?? '',
    },
  });
  // A different worker means a different set of eligible sites: clear the pick in the change handler.
  const changeWorker = (w: Worker | null) => {
    if (!transferId && w?.employeeId !== worker?.employeeId) setValue('proposedSiteId', '');
    onWorkerChange?.(w);
  };

  const o = options.data;
  const sites = (o?.sites ?? []).filter((s) => s.id !== o?.currentSiteId);

  const submit = handleSubmit(async (v) => {
    if (!worker) return;
    setServerError(null);
    try {
      await onSubmit({ employeeId: worker.employeeId, initiatedBy: v.initiatedBy as S<'TransferInitiator'>, proposedSiteId: Number(v.proposedSiteId), reason: v.reason, requestedDate: v.requestedDate });
    } catch (e) {
      const err = e as ApiError;
      Object.entries(err.fieldErrors).forEach(([k, m]) => k in v && setError(k as keyof Values, { message: m.join(' ') }));
      setServerError(err);
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <Stack spacing={2}>
        {serverError && <Alert severity="error">{serverError.detail || serverError.title}</Alert>}
        <WorkerPicker value={worker} onChange={changeWorker} required disabled={!onWorkerChange} />
        {o?.refusal && <RefusalHint text={o.refusal} />}
        {o && <TextField label={t('transfers.currentSite')} value={o.currentSiteName ?? ''} disabled />}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Controller
            name="initiatedBy"
            control={control}
            render={({ field, fieldState }) => (
              <TextField select required label={t('transfers.initiatedBy')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message}>
                {enumOptions('TransferInitiator', ENUMS.TransferInitiator).map((x) => (
                  <MenuItem key={x.value} value={x.value}>
                    {x.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="requestedDate"
            control={control}
            render={({ field, fieldState }) => (
              <TextField type="date" required label={t('transfers.requestedDate')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message} slotProps={{ inputLabel: { shrink: true } }} />
            )}
          />
        </Box>
        <Controller
          name="proposedSiteId"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              select
              required
              label={t('transfers.proposedSite')}
              {...field}
              disabled={!o}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? (o && !o.otherSitesAllowed ? t('transfers.trackSitesOnly') : undefined)}
            >
              {sites.map((s) => (
                <MenuItem key={s.id} value={String(s.id)} disabled={!s.inTrack && !o?.otherSitesAllowed}>
                  {s.number} — {s.name} {!s.inTrack ? `(${t('transfers.outsideTrack')})` : ''}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller name="reason" control={control} render={({ field, fieldState }) => <TextField multiline minRows={3} required label={t('common.reason')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={!worker || !!o?.refusal || formState.isSubmitting}>
            {submitLabel}
          </Button>
          {onCancel && (
            <Button color="inherit" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          )}
        </Stack>
      </Stack>
    </form>
  );
}
