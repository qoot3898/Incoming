import { Box, Grid2 as Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { complaintsApi, complaintsKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary, EmptyState } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { InfoGrid } from '@/components/common/InfoGrid';
import { StatusChip } from '@/components/common/StatusChip';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { useApiMutation } from '@/hooks/useApiMutation';
import { formatDateTime } from '@/utils/format';
import type { S } from '@/types/api';

/** One complaint as received from the public form, and its single review (TL-N1). */
export default function ComplaintDetailsPage() {
  const { t } = useTranslation();
  const id = Number(useParams().complaintId);
  const query = useQuery({ queryKey: complaintsKeys.detail(id), queryFn: () => complaintsApi.get(id) });
  const review = useApiMutation((v: S<'ReviewComplaintRequest'>) => complaintsApi.review(id, v), {
    invalidate: [complaintsKeys.all],
    rethrow: true,
    success: t('complaints.reviewed'),
  });

  return (
    <QueryBoundary query={query}>
      {(c) => (
        <Box>
          <PageHeader
            title={t('complaints.detailsTitle', { id: c.id })}
            subtitle={formatDateTime(c.submittedAt)}
            breadcrumbs={[{ label: t('nav.items.complaints'), to: '/complaints' }]}
            meta={<StatusChip enumName="ComplaintStatus" value={c.status} />}
            actions={
              c.canReview && (
                <ActionFormButton<S<'ReviewComplaintRequest'>>
                  label={t('complaints.recordReview')}
                  variant="contained"
                  fields={[{ name: 'note', kind: 'textarea', label: t('complaints.reviewNote'), required: true, maxLength: 500, rows: 4, helperText: t('complaints.reviewNoteHint') }]}
                  onSubmit={(v) => review.mutateAsync(v)}
                />
              )
            }
          />
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Stack spacing={3}>
                <SectionCard title={t('complaints.sections.complaint')}>
                  <Stack spacing={2.5}>
                    <InfoGrid
                      columns={2}
                      items={[
                        { label: t('complaints.respondentName'), value: c.respondentName },
                        { label: t('complaints.location'), value: c.location },
                      ]}
                    />
                    <Box>
                      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
                        {t('complaints.details')}
                      </Typography>
                      {/* Line breaks are kept as the complainant typed them. */}
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                        {c.details}
                      </Typography>
                    </Box>
                  </Stack>
                </SectionCard>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Stack spacing={3}>
                <SectionCard title={t('complaints.sections.complainant')}>
                  <InfoGrid
                    columns={2}
                    items={[
                      { label: t('complaints.complainantName'), value: c.complainantName },
                      { label: t('complaints.complainantPhone'), value: c.complainantPhone ? <Box component="span" dir="ltr">{c.complainantPhone}</Box> : null },
                      { label: t('complaints.submittedAt'), value: formatDateTime(c.submittedAt) },
                    ]}
                  />
                </SectionCard>
                <SectionCard title={t('complaints.review')}>
                  {c.reviewedAt ? (
                    <InfoGrid
                      columns={2}
                      items={[
                        { label: t('complaints.reviewedBy'), value: c.reviewedBy },
                        { label: t('complaints.reviewedAt'), value: formatDateTime(c.reviewedAt) },
                        { label: t('complaints.reviewNote'), value: c.reviewNote ? <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>{c.reviewNote}</Box> : null, span: 2 },
                      ]}
                    />
                  ) : (
                    <EmptyState title={t('complaints.notReviewed')} />
                  )}
                </SectionCard>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      )}
    </QueryBoundary>
  );
}
