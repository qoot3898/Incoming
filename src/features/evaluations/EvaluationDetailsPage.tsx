import { Box, Button, Grid2 as Grid, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { evaluationsApi, evaluationsKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { InfoGrid } from '@/components/common/InfoGrid';
import { StatusChip } from '@/components/common/StatusChip';
import { RefusalHint } from '@/components/common/RefusalHint';
import { PrintFormButton } from '@/components/common/FileButtons';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { formatDate, formatDateTime } from '@/utils/format';
import type { S } from '@/types/api';

export default function EvaluationDetailsPage() {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const id = Number(useParams().evaluationId);
  const query = useQuery({ queryKey: evaluationsKeys.detail(id), queryFn: () => evaluationsApi.get(id) });
  const review = useApiMutation((v: { review: string; notes: string | null }) => evaluationsApi.review(id, { evaluationId: id, review: v.review as S<'EvaluationReview'>, notes: v.notes }), {
    invalidate: [evaluationsKeys.all, ['penalties'], ['terminations'], ['tasks']],
    rethrow: true,
  });

  return (
    <QueryBoundary query={query}>
      {(e) => {
        const reviewOptions = [
          { value: 'Filed', label: label('EvaluationReview', 'Filed') },
          { value: 'ReferredForPenalty', label: label('EvaluationReview', 'ReferredForPenalty'), disabled: !!e.penaltyRefusal },
          { value: 'ReferredForTermination', label: label('EvaluationReview', 'ReferredForTermination'), disabled: !!e.terminationRefusal },
        ];
        const refPath = e.review === 'ReferredForPenalty' ? `/penalties/${e.referenceId}` : e.review === 'ReferredForTermination' ? `/terminations/${e.referenceId}` : null;
        return (
          <Box>
            <PageHeader
              title={t('evaluations.detailsTitle', { name: e.name })}
              subtitle={`${formatDate(e.evaluationDate)} · ${e.evaluatorName ?? ''}`}
              breadcrumbs={[{ label: t('nav.items.evaluations'), to: '/evaluations?Tab=All' }]}
              meta={<StatusChip enumName="EvaluationResult" value={e.result} />}
              actions={
                <>
                  {e.canReview && (
                    <ActionFormButton<{ review: string; notes: string | null }>
                      label={t('evaluations.reviewAction')}
                      variant="contained"
                      description={
                        <Stack spacing={1}>
                          <span>{t('evaluations.reviewHint')}</span>
                          <RefusalHint text={e.penaltyRefusal} />
                          <RefusalHint text={e.terminationRefusal} />
                        </Stack>
                      }
                      fields={[
                        { name: 'review', kind: 'select', label: t('evaluations.review'), required: true, options: reviewOptions },
                        { name: 'notes', kind: 'textarea', label: t('common.notes'), maxLength: 1000 },
                      ]}
                      onSubmit={(v) => review.mutateAsync(v)}
                    />
                  )}
                  <PrintFormButton code="F09" recordId={e.id} />
                </>
              }
            />
            {!e.canReview && e.reviewRefusal && <Box sx={{ mb: 2 }}><RefusalHint text={e.reviewRefusal} /></Box>}
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 7 }}>
                <Stack spacing={3}>
                  <SectionCard title={t('evaluations.workerData')}>
                    <InfoGrid
                      items={[
                        { label: t('common.worker'), value: <RouterLink to={`/workers/${e.employeeId}`}>{`${e.employeeNumber} — ${e.name ?? ''}`}</RouterLink> },
                        { label: t('fields.job'), value: e.jobName },
                        { label: t('fields.workSite'), value: e.siteName },
                        { label: t('fields.startDate'), value: formatDate(e.startDate) },
                        { label: t('evaluations.dueDate'), value: formatDate(e.dueDate) },
                        { label: t('fields.status'), value: label('LaborStatus', e.fileStatus) },
                      ]}
                    />
                  </SectionCard>
                  <SectionCard title={t('evaluations.items')} noPadding>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{t('evaluations.criterion')}</TableCell>
                            <TableCell>{t('evaluations.rating')}</TableCell>
                            <TableCell>{t('common.notes')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {e.items.map((i) => (
                            <TableRow key={i.criterion}>
                              <TableCell>{label('EvaluationCriterion', i.criterion)}</TableCell>
                              <TableCell>{label('EvaluationRating', i.rating)}</TableCell>
                              <TableCell>{i.notes ?? '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </SectionCard>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, lg: 5 }}>
                <Stack spacing={3}>
                  <SectionCard title={t('evaluations.outcome')}>
                    <InfoGrid
                      columns={2}
                      items={[
                        { label: t('evaluations.result'), value: <StatusChip enumName="EvaluationResult" value={e.result} /> },
                        { label: t('evaluations.recommendation'), value: label('EvaluationRecommendation', e.recommendation) },
                        { label: t('evaluations.recordedBy'), value: e.recordedBy },
                        { label: t('common.createdAt'), value: formatDateTime(e.recordedAt) },
                      ]}
                    />
                  </SectionCard>
                  <SectionCard title={t('evaluations.sectionReview')}>
                    <InfoGrid
                      columns={2}
                      items={[
                        { label: t('evaluations.review'), value: e.review ? label('EvaluationReview', e.review) : t('evaluations.notReviewed') },
                        { label: t('workflow.decidedBy'), value: e.reviewedBy },
                        { label: t('workflow.decidedAt'), value: formatDateTime(e.reviewedAt) },
                        { label: t('evaluations.referenceStatus'), value: e.referenceStatus },
                        { label: t('common.notes'), value: e.reviewNotes, span: 2 },
                      ]}
                    />
                    {refPath && e.referenceId && (
                      <Button component={RouterLink} to={refPath} sx={{ mt: 2 }}>
                        {t('evaluations.openReference')}
                      </Button>
                    )}
                  </SectionCard>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        );
      }}
    </QueryBoundary>
  );
}
