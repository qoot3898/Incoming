import { useState } from 'react';
import { Alert, Box, Button, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { evaluationsApi, evaluationsKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { InfoGrid } from '@/components/common/InfoGrid';
import { RefusalHint } from '@/components/common/RefusalHint';
import { WorkerPicker } from '@/components/forms/WorkerPicker';
import { usePrefilledWorker } from '@/components/forms/usePrefilledWorker';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { formatDate, todayIso } from '@/utils/format';
import { errorMessage, type ApiError } from '@/services/api/errors';
import type { S } from '@/types/api';

type Criterion = (typeof ENUMS.EvaluationCriterion)[number];

export default function EvaluationCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const [worker, setWorker] = usePrefilledWorker();
  const info = useQuery({ queryKey: [...evaluationsKeys.all, 'worker', worker?.employeeId], queryFn: () => evaluationsApi.worker(worker!.employeeId), enabled: !!worker });
  const [date, setDate] = useState(todayIso);
  const [evaluator, setEvaluator] = useState('');
  const [ratings, setRatings] = useState<Record<Criterion, { rating: string; notes: string }>>(
    () => Object.fromEntries(ENUMS.EvaluationCriterion.map((c) => [c, { rating: '', notes: '' }])) as Record<Criterion, { rating: string; notes: string }>,
  );
  const [result, setResult] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const record = useApiMutation(evaluationsApi.record, {
    invalidate: [evaluationsKeys.all, ['tasks'], ['workers']],
    rethrow: true,
    success: t('evaluations.recorded'),
    onSuccess: (r) => navigate(`/evaluations/${r.id}`),
  });

  const schema = z.object({
    date: z.string().min(1, t('evaluations.errors.date')),
    evaluator: z.string().trim().min(1, t('evaluations.errors.evaluator')),
    ratings: z.array(z.string().min(1)).refine((a) => a.every(Boolean), t('evaluations.errors.allRated')),
    result: z.string().min(1, t('evaluations.errors.result')),
    recommendation: z.string().min(1, t('evaluations.errors.recommendation')),
  });

  const submit = async () => {
    if (!worker) return;
    const parsed = schema.safeParse({ date, evaluator, ratings: ENUMS.EvaluationCriterion.map((c) => ratings[c].rating), result, recommendation });
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => i.message));
      return;
    }
    setErrors([]);
    try {
      await record.mutateAsync({
        employeeId: worker.employeeId,
        evaluationDate: date,
        evaluatorName: evaluator.trim(),
        items: ENUMS.EvaluationCriterion.map((c) => ({ criterion: c, rating: ratings[c].rating as S<'EvaluationRating'>, notes: ratings[c].notes.trim() || null })),
        result: result as S<'EvaluationResult'>,
        recommendation: recommendation as S<'EvaluationRecommendation'>,
      });
    } catch (e) {
      setErrors([errorMessage(e as ApiError)]);
    }
  };

  const w = info.data;
  return (
    <Box>
      <PageHeader title={t('evaluations.new')} subtitle={t('evaluations.newHint')} breadcrumbs={[{ label: t('nav.items.evaluations'), to: '/evaluations' }]} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 980 }}>
        <Stack spacing={2.5}>
          <WorkerPicker value={worker} onChange={setWorker} required />
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
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField type="date" required label={t('evaluations.date')} value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField required label={t('evaluations.evaluator')} value={evaluator} onChange={(e) => setEvaluator(e.target.value)} helperText={t('evaluations.evaluatorHint')} />
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('evaluations.criterion')}</TableCell>
                  <TableCell sx={{ width: 180 }}>{t('evaluations.rating')}</TableCell>
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
                      <TextField select value={ratings[c].rating} onChange={(e) => setRatings((r) => ({ ...r, [c]: { ...r[c], rating: e.target.value } }))} error={errors.length > 0 && !ratings[c].rating}>
                        {enumOptions('EvaluationRating', ENUMS.EvaluationRating).map((o) => (
                          <MenuItem key={o.value} value={o.value}>
                            {o.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField value={ratings[c].notes} onChange={(e) => setRatings((r) => ({ ...r, [c]: { ...r[c], notes: e.target.value } }))} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField select required label={t('evaluations.result')} value={result} onChange={(e) => setResult(e.target.value)}>
              {enumOptions('EvaluationResult', ENUMS.EvaluationResult).map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField select required label={t('evaluations.recommendation')} value={recommendation} onChange={(e) => setRecommendation(e.target.value)}>
              {enumOptions('EvaluationRecommendation', ENUMS.EvaluationRecommendation).map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          {errors.length > 0 && (
            <Alert severity="error">
              {errors.map((e) => (
                <div key={e}>{e}</div>
              ))}
            </Alert>
          )}
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={submit} disabled={!worker || !!w?.refusal || record.isPending}>
              {t('evaluations.submit')}
            </Button>
            <Button color="inherit" onClick={() => navigate(-1)}>
              {t('common.cancel')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
