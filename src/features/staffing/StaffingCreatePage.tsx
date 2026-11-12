import { useMemo } from 'react';
import { Alert, Box, Button, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { staffingApi, staffingKeys } from './api';
import { leaversProblem, leavingEmployeeIds, parseCount } from './leavers';
import { EMPTY_NEW_CANDIDATE, formPath, newCandidateFieldNames, toCandidateIds, toNewCandidates, type NewCandidateRow } from './requestCandidates';
import { CandidatePoolPicker } from '@/features/candidates/CandidatePoolPicker';
import type { PoolCandidate } from '@/features/candidates/candidateSearch';
import { CANDIDATE_LIMITS, RECRUITERS } from '@/features/candidates/candidateFields';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { WorkersMultiPicker } from '@/components/forms/WorkersMultiPicker';
import { FormSelectField, FormTextField } from '@/components/forms/fields';
import { FormActions, FormCard, FormErrorAlert, FormGrid, FormSection, FullRow } from '@/components/forms/FormLayout';
import { UnsavedChangesGuard } from '@/components/forms/UnsavedChangesGuard';
import { useFormServerError } from '@/components/forms/useFormServerError';
import { useScopeOptions } from '@/features/shared/options';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useAuth } from '@/app/providers/authContext';
import { ENUMS } from '@/constants/enums';
import { PERMISSIONS } from '@/constants/permissions';
import type { S } from '@/types/api';

type Worker = S<'LaborWorkerListItem'>;

const DEFAULTS = {
  trackId: '',
  workSiteId: '',
  jobId: '',
  count: 1,
  reason: '',
  leavingWorkers: [] as Worker[],
  requiredStartDate: '',
  justification: '',
  requestedBy: '',
  candidates: [] as PoolCandidate[],
  newCandidates: [] as NewCandidateRow[],
};
/** API field → form field, for server validation messages. */
const FIELD_MAP = { leavingEmployeeIds: 'leavingWorkers', candidateIds: 'candidates' };

export default function StaffingCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enumOptions = useEnumOptions();
  // TL-N13: the candidates section is for whoever keeps the candidate list; the API refuses candidates from anyone else.
  const mayNominate = useAuth().can([PERMISSIONS.manageCandidates]);

  const schema = useMemo(
    () =>
      z
        .object({
          trackId: z.string().min(1, t('validation.required')),
          workSiteId: z.string().min(1, t('validation.required')),
          jobId: z.string().min(1, t('validation.required')),
          count: z.coerce.number({ invalid_type_error: t('validation.number') }).int(t('validation.integer')).min(1, t('validation.min', { min: 1 })),
          reason: z.string().min(1, t('validation.required')),
          leavingWorkers: z.custom<Worker[]>(),
          requiredStartDate: z.string().min(1, t('validation.required')),
          justification: z.string().trim().min(1, t('validation.required')).max(1000, t('validation.maxLength', { max: 1000 })),
          requestedBy: z.string().max(200, t('validation.maxLength', { max: 200 })),
          candidates: z.custom<PoolCandidate[]>(),
          newCandidates: z.array(
            z.object({
              name: z.string().trim().min(1, t('validation.required')).max(CANDIDATE_LIMITS.name, t('validation.maxLength', { max: CANDIDATE_LIMITS.name })),
              nationalityId: z.string().min(1, t('validation.required')),
              recruitedBy: z.string().min(1, t('validation.required')),
              phone: z.string().max(CANDIDATE_LIMITS.phone, t('validation.maxLength', { max: CANDIDATE_LIMITS.phone })),
              nominatedBy: z.string().max(CANDIDATE_LIMITS.nominatedBy, t('validation.maxLength', { max: CANDIDATE_LIMITS.nominatedBy })),
              notes: z.string().max(CANDIDATE_LIMITS.notes, t('validation.maxLength', { max: CANDIDATE_LIMITS.notes })),
            }),
          ),
        })
        .superRefine((v, ctx) => {
          // FR-02 / TL-N8: a replacement names one different leaving worker per requested place.
          const problem = leaversProblem(v.reason, v.count, v.leavingWorkers.map((w) => w.employeeId));
          if (problem) ctx.addIssue({ code: 'custom', path: ['leavingWorkers'], message: problem === 'required' ? t('staffing.leavingRequired') : t('staffing.leavingCountMismatch', { total: v.count }) });
        }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, watch, setValue, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });
  const newRows = useFieldArray({ control, name: 'newCandidates' });
  const trackId = watch('trackId');
  const jobId = watch('jobId');
  const reason = watch('reason');
  // The number input holds text while typing, so the count is parsed before it limits the leaving workers.
  const wanted = parseCount(watch('count'));
  const opts = useScopeOptions(trackId);
  const { serverError, handleServerError, clearServerError } = useFormServerError(
    (field, message) => setError(formPath(field) as keyof Values, { type: 'server', message }),
    [...Object.keys(DEFAULTS), ...newCandidateFieldNames(newRows.fields.length)],
    FIELD_MAP,
  );

  // A suggested site of a capacity rejection (TL-N7) fills the site field when it belongs to the track.
  const pickSite = (siteId: number) => {
    if (!opts.sites.some((s) => s.value === siteId)) return;
    setValue('workSiteId', String(siteId), { shouldDirty: true, shouldValidate: true });
    clearServerError();
  };

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
        leavingEmployeeIds: leavingEmployeeIds(v.reason, v.leavingWorkers),
        requiredStartDate: v.requiredStartDate,
        justification: v.justification,
        requestedBy: v.requestedBy || null,
        candidateIds: mayNominate ? toCandidateIds(v.candidates) : null,
        newCandidates: mayNominate ? toNewCandidates(v.newCandidates, Number(v.jobId)) : null,
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
            <FormErrorAlert value={serverError} onPickSite={pickSite} />
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
                    name="leavingWorkers"
                    control={control}
                    render={({ field, fieldState }) => (
                      <WorkersMultiPicker
                        value={field.value}
                        onChange={field.onChange}
                        label={t('staffing.leavingWorkers')}
                        required
                        max={wanted}
                        helperText={t('staffing.leavingWorkersHint', { chosen: field.value.length, total: wanted ?? '—' })}
                        error={fieldState.error?.message}
                      />
                    )}
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
            {mayNominate && (
              <FormSection title={t('candidates.form.title')} description={t('candidates.form.hint')} columns={1}>
                <Controller
                  name="candidates"
                  control={control}
                  render={({ field, fieldState }) => (
                    // Keyed by the request's job so the picker's job filter follows it.
                    <CandidatePoolPicker
                      key={jobId || 'all'}
                      value={field.value}
                      onChange={field.onChange}
                      label={t('candidates.pickerLabel')}
                      jobOptions={opts.jobs}
                      initialJobId={jobId ? Number(jobId) : null}
                      helperText={field.value.length > 0 ? t('candidates.pickerChosen', { count: field.value.length }) : undefined}
                      error={fieldState.error?.message}
                    />
                  )}
                />
                {newRows.fields.map((row, i) => (
                  <Paper key={row.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2">{t('candidates.form.newTitle', { n: i + 1 })}</Typography>
                      <Tooltip title={t('candidates.form.removeNew')}>
                        <IconButton size="small" color="error" onClick={() => newRows.remove(i)} aria-label={t('candidates.form.removeNew')}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <FormGrid>
                      <FullRow>
                        <FormTextField control={control} name={`newCandidates.${i}.name`} label={t('fields.name')} required fullWidth />
                      </FullRow>
                      <FormSelectField control={control} name={`newCandidates.${i}.nationalityId`} label={t('fields.nationality')} required options={opts.nationalities} />
                      <FormSelectField control={control} name={`newCandidates.${i}.recruitedBy`} label={t('candidates.recruitedBy')} required options={enumOptions('LaborParty', RECRUITERS)} />
                      <FormTextField control={control} name={`newCandidates.${i}.phone`} label={t('candidates.phone')} />
                      <FormTextField control={control} name={`newCandidates.${i}.nominatedBy`} label={t('candidates.nominatedBy')} />
                      <FullRow>
                        <FormTextField control={control} name={`newCandidates.${i}.notes`} label={t('common.notes')} multiline minRows={2} fullWidth />
                      </FullRow>
                    </FormGrid>
                  </Paper>
                ))}
                <Box>
                  <Button startIcon={<AddIcon />} onClick={() => newRows.append(EMPTY_NEW_CANDIDATE)}>
                    {t('candidates.form.addNew')}
                  </Button>
                </Box>
              </FormSection>
            )}
            <FormActions submitLabel={t('staffing.submit')} submitting={formState.isSubmitting} onCancel={() => navigate('/staffing-requests')} />
          </Stack>
        </form>
      </FormCard>
      <UnsavedChangesGuard when={formState.isDirty && !formState.isSubmitting && !formState.isSubmitSuccessful} />
    </PageContainer>
  );
}
