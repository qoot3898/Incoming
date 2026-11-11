import { useMemo, type FormEvent } from 'react';
import { Box, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useReturnTo } from '@/hooks/useReturnTo';
import { useTranslation } from 'react-i18next';
import { evaluationsApi, evaluationsKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { InfoGrid } from '@/components/common/InfoGrid';
import { RefusalHint } from '@/components/common/RefusalHint';
import { WorkerPicker } from '@/components/forms/WorkerPicker';
import { useWorkerField } from '@/components/forms/usePrefilledWorker';
import { FormSelectField, FormTextField } from '@/components/forms/fields';
import { FormActions, FormCard, FormErrorAlert, FormSection } from '@/components/forms/FormLayout';
import { UnsavedChangesGuard } from '@/components/forms/UnsavedChangesGuard';
import { useFormServerError } from '@/components/forms/useFormServerError';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { formatDate, todayIso } from '@/utils/format';
import type { S } from '@/types/api';

type Criterion = (typeof ENUMS.EvaluationCriterion)[number];
type RatingRow = { rating: string; notes: string };

const FIELDS = ['date', 'evaluator', 'result', 'recommendation', 'worker'];
const FIELD_MAP = { employeeId: 'worker', evaluationDate: 'date', evaluatorName: 'evaluator' };

/** Evaluation form (FR-43..45): every criterion must be rated (AC-44). */
export default function EvaluationCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const back = useReturnTo();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const workerField = useWorkerField();
  const { worker } = workerField;
  const info = useQuery({ queryKey: [...evaluationsKeys.all, 'worker', worker?.employeeId], queryFn: () => evaluationsApi.worker(worker!.employeeId), enabled: !!worker });

  const schema = useMemo(() => {
    const row = z.object({ rating: z.string().min(1, t('evaluations.errors.allRated')), notes: z.string().max(500, t('validation.maxLength', { max: 500 })) });
    return z.object({
      date: z.string().min(1, t('evaluations.errors.date')),
      evaluator: z.string().trim().min(1, t('evaluations.errors.evaluator')).max(200, t('validation.maxLength', { max: 200 })),
      ratings: z.object(Object.fromEntries(ENUMS.EvaluationCriterion.map((c) => [c, row])) as Record<Criterion, typeof row>),
      result: z.string().min(1, t('evaluations.errors.result')),
      recommendation: z.string().min(1, t('evaluations.errors.recommendation')),
    });
  }, [t]);
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: todayIso(),
      evaluator: '',
      ratings: Object.fromEntries(ENUMS.EvaluationCriterion.map((c) => [c, { rating: '', notes: '' }])) as Record<Criterion, RatingRow>,
      result: '',
      recommendation: '',
    },
  });
  const { serverError, handleServerError, clearServerError } = useFormServerError(
    (field, message) => (field === 'worker' ? workerField.setServerMessage(message) : setError(field as 'date', { type: 'server', message })),
    FIELDS,
    FIELD_MAP,
  );
  const record = useApiMutation(evaluationsApi.record, {
    invalidate: [evaluationsKeys.all, ['tasks'], ['workers']],
    rethrow: true,
    success: t('evaluations.recorded'),
    onSuccess: (r) => navigate(back ?? `/evaluations/${r.id}`),
  });

  const onSubmit = (e: FormEvent) => {
    workerField.markAttempted();
    return handleSubmit(async (v) => {
      if (!worker) return;
      clearServerError();
      try {
        await record.mutateAsync({
          employeeId: worker.employeeId,
          evaluationDate: v.date,
          evaluatorName: v.evaluator.trim(),
          items: ENUMS.EvaluationCriterion.map((c) => ({ criterion: c, rating: v.ratings[c].rating as S<'EvaluationRating'>, notes: v.ratings[c].notes.trim() || null })),
          result: v.result as S<'EvaluationResult'>,
          recommendation: v.recommendation as S<'EvaluationRecommendation'>,
        });
      } catch (err) {
        await handleServerError(err);
      }
    })(e);
  };

  const w = info.data;
  const ratingOptions = enumOptions('EvaluationRating', ENUMS.EvaluationRating);
  return (
    <PageContainer width="wide">
      <PageHeader title={t('evaluations.new')} breadcrumbs={[{ label: t('nav.items.evaluations'), to: '/evaluations' }]} />
      <FormCard>
          <form onSubmit={onSubmit} noValidate>
            <Stack spacing={3}>
              <FormErrorAlert value={serverError} />
              <FormSection title={t('forms.sections.worker')} columns={1}>
                <WorkerPicker value={worker} onChange={workerField.setWorker} required error={workerField.error} />
                {w && (
                  <>
                    <InfoGrid
                      columns={4}
                      items={[
                        { label: t('fields.workSite'), value: w.worker.workSiteName },
                        { label: t('fields.job'), value: w.worker.jobName },
                        { label: t('fields.startDate'), value: formatDate(w.startDate) },
                        { label: t('evaluations.dueDate'), value: formatDate(w.dueDate) },
                        { label: t('evaluations.lastEvaluation'), value: formatDate(w.lastEvaluationDate) },
                      ]}
                    />
                    <RefusalHint text={w.refusal} />
                  </>
                )}
              </FormSection>
              <FormSection title={t('forms.sections.details')}>
                <FormTextField control={control} name="date" type="date" label={t('evaluations.date')} required />
                <FormTextField control={control} name="evaluator" label={t('evaluations.evaluator')} required helperText={t('evaluations.evaluatorHint')} />
              </FormSection>
              <Box component="fieldset" sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
                <Typography component="legend" variant="subtitle1" sx={{ p: 0, mb: 1.5 }}>
                  {t('evaluations.sections.criteria')}
                </Typography>
                <Box sx={{ overflowX: 'auto', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <Table size="small" sx={{ minWidth: 560 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('evaluations.criterion')}</TableCell>
                        <TableCell sx={{ width: 190 }}>{t('evaluations.rating')} *</TableCell>
                        <TableCell>{t('common.notes')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ENUMS.EvaluationCriterion.map((c) => (
                        <TableRow key={c}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {label('EvaluationCriterion', c)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Controller
                              name={`ratings.${c}.rating`}
                              control={control}
                              render={({ field, fieldState }) => (
                                <TextField
                                  {...field}
                                  select
                                  required
                                  error={!!fieldState.error}
                                  helperText={fieldState.error?.message}
                                  slotProps={{ htmlInput: { 'aria-label': `${t('evaluations.rating')}: ${label('EvaluationCriterion', c)}` } }}
                                >
                                  {ratingOptions.map((o) => (
                                    <MenuItem key={o.value} value={o.value}>
                                      {o.label}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormTextField control={control} name={`ratings.${c}.notes`} slotProps={{ htmlInput: { 'aria-label': `${t('common.notes')}: ${label('EvaluationCriterion', c)}` } }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
              <FormSection title={t('evaluations.sections.outcome')}>
                <FormSelectField control={control} name="result" label={t('evaluations.result')} required options={enumOptions('EvaluationResult', ENUMS.EvaluationResult)} />
                <FormSelectField control={control} name="recommendation" label={t('evaluations.recommendation')} required options={enumOptions('EvaluationRecommendation', ENUMS.EvaluationRecommendation)} />
              </FormSection>
              <FormActions submitLabel={t('evaluations.submit')} submitting={formState.isSubmitting} disabled={!!w?.refusal} onCancel={() => navigate(back ?? '/evaluations')} />
            </Stack>
          </form>
      </FormCard>
      <UnsavedChangesGuard when={formState.isDirty && !formState.isSubmitting && !formState.isSubmitSuccessful} />
    </PageContainer>
  );
}
