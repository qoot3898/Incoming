import { Box, Grid2 as Grid, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { penaltiesApi, penaltiesKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary, EmptyState } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { InfoGrid } from '@/components/common/InfoGrid';
import { StatusChip } from '@/components/common/StatusChip';
import { RefusalHint } from '@/components/common/RefusalHint';
import { AttachmentButton, PrintFormButton } from '@/components/common/FileButtons';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { ENUMS } from '@/constants/enums';
import { formatDate, formatDateTime, todayIso } from '@/utils/format';
import type { S } from '@/types/api';
import type { UploadVars } from '@/services/api/client';

export default function PenaltyDetailsPage() {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const id = Number(useParams().penaltyId);
  const query = useQuery({ queryKey: penaltiesKeys.detail(id), queryFn: () => penaltiesApi.get(id) });
  const invalidate = [penaltiesKeys.all, ['workers'], ['tasks'], ['payroll']];
  const decide = useApiMutation((v: S<'PenaltyDecisionInput'>) => penaltiesApi.decide(id, v), { invalidate, rethrow: true });
  const dismiss = useApiMutation((v: S<'DismissPenaltyRequest'>) => penaltiesApi.dismiss(id, v), { invalidate, rethrow: true });
  const acknowledge = useApiMutation(({ values, transfer }: UploadVars) => penaltiesApi.acknowledge(id, values, transfer), { invalidate, rethrow: true });
  const apply = useApiMutation((v: S<'ApplyPenaltyRequest'>) => penaltiesApi.apply(id, v), { invalidate, rethrow: true });

  return (
    <QueryBoundary query={query}>
      {(p) => (
        <Box>
          <PageHeader
            title={t('penalties.detailsTitle', { name: p.worker.name })}
            subtitle={`${label('PenaltyViolation', p.violation)} · ${p.violationDates ?? ''}`}
            breadcrumbs={[{ label: t('nav.items.penalties'), to: '/penalties' }]}
            meta={<StatusChip enumName="PenaltyStatus" value={p.status} />}
            actions={
              <>
                {p.canDecide && (
                  <>
                    <ActionFormButton<S<'PenaltyDecisionInput'>>
                      label={t('penalties.decide')}
                      variant="contained"
                      description={t('penalties.decideHint')}
                      fields={[
                        { name: 'decision', kind: 'select', label: t('penalties.decision'), required: true, half: true, options: enumOptions('PenaltyDecision', ENUMS.PenaltyDecision) },
                        { name: 'deductedDays', kind: 'number', label: t('penalties.deductedDays'), half: true, min: 1, helperText: t('penalties.deductedDaysHint') },
                        { name: 'basis', kind: 'textarea', label: t('penalties.basis'), helperText: t('penalties.basisHint'), maxLength: 500 },
                        { name: 'note', kind: 'textarea', label: t('workflow.note'), maxLength: 500 },
                      ]}
                      onSubmit={(v) => {
                        if (v.decision === 'DeductionOfDays' && !v.deductedDays) return Promise.reject({ title: t('penalties.deductedDaysRequired'), fieldErrors: { deductedDays: [t('validation.required')] } });
                        return decide.mutateAsync(v);
                      }}
                    />
                    <ActionFormButton<S<'DismissPenaltyRequest'>>
                      label={t('penalties.dismiss')}
                      color="inherit"
                      description={t('penalties.dismissHint')}
                      fields={[{ name: 'reason', kind: 'textarea', label: t('common.reason'), required: true, maxLength: 500 }]}
                      onSubmit={(v) => dismiss.mutateAsync(v)}
                    />
                  </>
                )}
                {p.canAcknowledge && (
                  <ActionFormButton<Record<string, unknown>>
                    label={t('penalties.acknowledge')}
                    variant="contained"
                    description={t('penalties.acknowledgeHint')}
                    fields={[
                      { name: 'acknowledgedOn', kind: 'date', label: t('common.date'), required: true, half: true },
                      { name: 'workerRefused', kind: 'boolean', label: t('penalties.workerRefused') },
                      { name: 'witnessName', kind: 'text', label: t('penalties.witnessName'), helperText: t('penalties.witnessHint'), maxLength: 200 },
                      { name: 'scan', kind: 'file', label: t('penalties.signedScan'), required: true },
                    ]}
                    defaultValues={{ acknowledgedOn: todayIso(), workerRefused: false }}
                    onSubmit={(values, transfer) => {
                      if (values.workerRefused && !values.witnessName) return Promise.reject({ title: t('penalties.witnessRequired'), fieldErrors: { witnessName: [t('validation.required')] } });
                      return acknowledge.mutateAsync({ values, transfer });
                    }}
                  />
                )}
                {p.canApply && (
                  <ActionFormButton<S<'ApplyPenaltyRequest'>>
                    label={t('penalties.apply')}
                    variant="contained"
                    color="success"
                    fields={[{ name: 'appliedOn', kind: 'date', label: t('penalties.appliedOn'), required: true }]}
                    defaultValues={{ appliedOn: todayIso() }}
                    onSubmit={(v) => apply.mutateAsync(v)}
                  />
                )}
                <PrintFormButton code="F07" recordId={p.id} />
              </>
            }
          />
          <Stack spacing={1} sx={{ mb: 2 }}>
            <RefusalHint text={p.decisionRefusal} />
            {p.applyWaitingFor && <RefusalHint text={p.applyWaitingFor} />}
          </Stack>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Stack spacing={3}>
                <SectionCard title={t('penalties.violationDetails')}>
                  <InfoGrid
                    items={[
                      { label: t('common.worker'), value: <RouterLink to={`/workers/${p.worker.employeeId}`}>{`${p.worker.employeeNumber} — ${p.worker.name ?? ''}`}</RouterLink> },
                      { label: t('fields.workSite'), value: p.worker.workSiteName },
                      { label: t('fields.job'), value: p.worker.jobName },
                      { label: t('penalties.violation'), value: label('PenaltyViolation', p.violation) },
                      { label: t('penalties.violationDates'), value: p.violationDates },
                      { label: t('common.days'), value: p.days },
                      { label: t('penalties.reportReference'), value: p.reportReference },
                      { label: t('penalties.proposedBy'), value: p.proposedBy },
                      { label: t('common.createdAt'), value: formatDateTime(p.createdAt) },
                      {
                        label: t('penalties.source'),
                        value: p.absenceIncidentId ? t('penalties.fromIncidentShort') : p.evaluationId ? <RouterLink to={`/evaluations/${p.evaluationId}`}>{t('penalties.fromEvaluation')}</RouterLink> : '—',
                      },
                      { label: t('penalties.description'), value: p.description, span: 3 },
                      { label: t('common.statusReason'), value: p.statusReason, span: 3, hidden: !p.statusReason },
                    ]}
                  />
                </SectionCard>
                <SectionCard title={t('penalties.managerDecision')}>
                  {p.decision ? (
                    <InfoGrid
                      items={[
                        { label: t('penalties.decision'), value: label('PenaltyDecision', p.decision) },
                        { label: t('penalties.deductedDays'), value: p.deductedDays },
                        { label: t('penalties.basis'), value: p.basis },
                        { label: t('workflow.decidedBy'), value: p.decidedBy },
                        { label: t('workflow.decidedAt'), value: formatDateTime(p.decidedAt) },
                        { label: t('penalties.hrActionNumber'), value: p.hrActionNumber },
                        { label: t('workflow.note'), value: p.decisionNote, span: 3 },
                      ]}
                    />
                  ) : (
                    <EmptyState title={t('penalties.noDecision')} />
                  )}
                </SectionCard>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Stack spacing={3}>
                <SectionCard title={t('penalties.acknowledgement')}>
                  {p.acknowledgedOn ? (
                    <Stack spacing={1.5}>
                      <InfoGrid
                        columns={2}
                        items={[
                          { label: t('common.date'), value: formatDate(p.acknowledgedOn) },
                          { label: t('penalties.witnessName'), value: p.witnessName },
                        ]}
                      />
                      {p.acknowledgementAttachmentId && <AttachmentButton attachmentId={p.acknowledgementAttachmentId} label={p.acknowledgementFileName ?? undefined} />}
                    </Stack>
                  ) : (
                    <EmptyState title={t('penalties.notAcknowledged')} />
                  )}
                </SectionCard>
                <SectionCard title={t('payroll.notice')}>
                  {p.notice ? (
                    <InfoGrid
                      columns={2}
                      items={[
                        { label: t('fields.status'), value: <StatusChip enumName="PayrollNoticeStatus" value={p.notice.status} /> },
                        { label: t('payroll.effectiveDate'), value: formatDate(p.notice.effectiveDate) },
                        { label: t('payroll.deliveredOn'), value: p.notice.deliveredOn ? `${formatDate(p.notice.deliveredOn)} — ${p.notice.deliveredBy ?? ''}` : '—' },
                        { label: t('payroll.confirmedAt'), value: p.notice.confirmedAt ? `${formatDateTime(p.notice.confirmedAt)} — ${p.notice.confirmedBy ?? ''}` : '—' },
                        { label: t('penalties.appliedOn'), value: formatDate(p.appliedOn) },
                      ]}
                    />
                  ) : (
                    <EmptyState title={t('payroll.noNoticeYet')} />
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
