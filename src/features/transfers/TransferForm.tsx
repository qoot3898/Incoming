import { useMemo, useState, type FormEvent } from 'react';
import { Stack, TextField } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { transfersApi, transfersKeys } from './api';
import { WorkerPicker } from '@/components/forms/WorkerPicker';
import { RefusalHint } from '@/components/common/RefusalHint';
import { FormSelectField, FormTextField } from '@/components/forms/fields';
import { FormActions, FormErrorAlert, FormSection, FullRow } from '@/components/forms/FormLayout';
import { UnsavedChangesGuard } from '@/components/forms/UnsavedChangesGuard';
import { useFormServerError } from '@/components/forms/useFormServerError';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { ENUMS } from '@/constants/enums';
import type { S } from '@/types/api';

type Worker = S<'LaborWorkerListItem'>;

const FIELDS = ['initiatedBy', 'proposedSiteId', 'reason', 'requestedDate', 'worker'];
const FIELD_MAP = { employeeId: 'worker' };

interface Props {
  worker: Worker | null;
  onWorkerChange?: (w: Worker | null) => void;
  transferId?: number;
  initial?: Partial<{ initiatedBy: string; proposedSiteId: number; reason: string; requestedDate: string }>;
  submitLabel: string;
  onSubmit: (body: S<'TransferRequestInput'>) => Promise<unknown>;
  onCancel?: () => void;
  /** Ask before leaving the page with unsaved input (full-page form only). */
  guardUnsaved?: boolean;
}

/** Eligible destination sites: never the current one; other tracks only when the settings allow it. */
function toSiteOptions(o: S<'TransferOptions'> | undefined, outsideTrack: string) {
  return (o?.sites ?? [])
    .filter((s) => s.id !== o?.currentSiteId)
    .map((s) => ({ value: s.id, label: `${s.number} — ${s.name ?? ''}${s.inTrack ? '' : ` (${outsideTrack})`}`, disabled: !s.inTrack && !o?.otherSitesAllowed }));
}

function toDefaults(initial: Props['initial']) {
  return {
    initiatedBy: initial?.initiatedBy ?? '',
    proposedSiteId: initial?.proposedSiteId ? String(initial.proposedSiteId) : '',
    reason: initial?.reason ?? '',
    requestedDate: initial?.requestedDate ?? '',
  };
}

/** Transfer request form (TL-F08 A) used for new requests and re-submission. */
export function TransferForm({ worker, onWorkerChange, transferId, initial, submitLabel, onSubmit, onCancel, guardUnsaved }: Props) {
  const { t } = useTranslation();
  const enumOptions = useEnumOptions();
  const [attempted, setAttempted] = useState(false);
  const [workerServerError, setWorkerServerError] = useState<string | null>(null);
  const options = useQuery({
    queryKey: [...transfersKeys.all, 'options', worker?.employeeId, transferId],
    queryFn: () => transfersApi.options(worker!.employeeId, transferId),
    enabled: !!worker,
  });
  const schema = useMemo(
    () =>
      z.object({
        initiatedBy: z.string().min(1, t('validation.required')),
        proposedSiteId: z.string().min(1, t('validation.required')),
        reason: z.string().trim().min(1, t('validation.required')).max(1000, t('validation.maxLength', { max: 1000 })),
        requestedDate: z.string().min(1, t('validation.required')),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, setValue, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(initial),
  });
  const { serverError, handleServerError, clearServerError } = useFormServerError(
    (field, message) => (field === 'worker' ? setWorkerServerError(message) : setError(field as keyof Values, { type: 'server', message })),
    FIELDS,
    FIELD_MAP,
  );

  // A different worker means a different set of eligible sites: clear the pick in the change handler.
  const changeWorker = (w: Worker | null) => {
    if (!transferId && w?.employeeId !== worker?.employeeId) setValue('proposedSiteId', '');
    setWorkerServerError(null);
    onWorkerChange?.(w);
  };

  const o = options.data;
  const siteOptions = toSiteOptions(o, t('transfers.outsideTrack'));
  const siteHint = !worker ? t('forms.chooseWorkerFirst') : o && !o.otherSitesAllowed ? t('transfers.trackSitesOnly') : undefined;
  const workerError = workerServerError ?? (attempted && !worker ? t('validation.required') : undefined);

  const submit = (e: FormEvent) => {
    setAttempted(true);
    return handleSubmit(async (v) => {
      if (!worker) return;
      clearServerError();
      try {
        await onSubmit({ employeeId: worker.employeeId, initiatedBy: v.initiatedBy as S<'TransferInitiator'>, proposedSiteId: Number(v.proposedSiteId), reason: v.reason, requestedDate: v.requestedDate });
      } catch (err) {
        await handleServerError(err);
      }
    })(e);
  };

  return (
    <form onSubmit={submit} noValidate>
      <Stack spacing={3}>
        <FormErrorAlert value={serverError} />
        <FormSection title={t('forms.sections.worker')} columns={1}>
          <WorkerPicker value={worker} onChange={changeWorker} required disabled={!onWorkerChange} error={workerError} />
          <CurrentPlacement options={o} />
        </FormSection>
        <FormSection title={t('forms.sections.details')}>
          <FormSelectField control={control} name="initiatedBy" label={t('transfers.initiatedBy')} required options={enumOptions('TransferInitiator', ENUMS.TransferInitiator)} />
          <FormTextField control={control} name="requestedDate" type="date" label={t('transfers.requestedDate')} required />
          <FullRow>
            <FormSelectField
              control={control}
              name="proposedSiteId"
              label={t('transfers.proposedSite')}
              required
              disabled={!o}
              options={siteOptions}
              helperText={siteHint}
            />
          </FullRow>
          <FullRow>
            <FormTextField control={control} name="reason" label={t('common.reason')} required multiline minRows={3} />
          </FullRow>
        </FormSection>
        <FormActions submitLabel={submitLabel} submitting={formState.isSubmitting} disabled={!!o?.refusal} onCancel={onCancel} />
      </Stack>
      {guardUnsaved && <UnsavedChangesGuard when={formState.isDirty && !formState.isSubmitting && !formState.isSubmitSuccessful} />}
    </form>
  );
}

/** Backend refusal (if any) and the worker's current site, once options are loaded. */
function CurrentPlacement({ options }: { options?: S<'TransferOptions'> }) {
  const { t } = useTranslation();
  if (!options) return null;
  return (
    <>
      <RefusalHint text={options.refusal} />
      <TextField label={t('transfers.currentSite')} value={options.currentSiteName ?? ''} disabled />
    </>
  );
}
