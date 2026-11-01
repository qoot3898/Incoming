import { useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, Grid2 as Grid, List, ListItem, ListItemText, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transfersApi, transfersKeys } from './api';
import { TransferForm } from './TransferForm';
import { onboardingApi } from '@/features/onboarding/api';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { InfoGrid } from '@/components/common/InfoGrid';
import { StatusChip } from '@/components/common/StatusChip';
import { RefusalHint } from '@/components/common/RefusalHint';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PrintFormButton } from '@/components/common/FileButtons';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { ApprovalRounds } from '@/components/workflow/ApprovalRounds';
import { PartyDecision } from '@/components/workflow/PartyDecision';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { formatDate, formatDateTime, formatMoney, todayIso } from '@/utils/format';
import type { S } from '@/types/api';

export default function TransferDetailsPage() {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const id = Number(useParams().transferId);
  const query = useQuery({ queryKey: transfersKeys.detail(id), queryFn: () => transfersApi.get(id) });
  const invalidate = [transfersKeys.all, ['workers'], ['tasks'], ['permits'], ['onboarding']];
  const decide = useApiMutation((v: S<'TransferDecisionInput'>) => transfersApi.decide(id, v), { invalidate, rethrow: true });
  const resubmit = useApiMutation((v: S<'TransferRequestInput'>) => transfersApi.resubmit(id, v), { invalidate, rethrow: true, onSuccess: () => setResubmitOpen(false) });
  const cancel = useApiMutation((v: S<'CancelTransferRequest'>) => transfersApi.cancel(id, v), { invalidate, rethrow: true });
  const execute = useApiMutation((v: S<'TransferExecutionInput'>) => transfersApi.execute(id, v), { invalidate, rethrow: true, success: t('transfers.executed') });
  const informed = useApiMutation((v: S<'RecordSupervisorsInformedRequest'>) => transfersApi.supervisorsInformed(id, v), { invalidate, rethrow: true });
  const decideSalary = useApiMutation((v: S<'DecideSalaryRequest'> & { salaryId: number }) => onboardingApi.decideSalary(v.salaryId, v), { invalidate, rethrow: true });
  const reviseSalary = useApiMutation((v: S<'ReviseSalaryRequest'> & { salaryId: number }) => onboardingApi.reviseSalary(v.salaryId, v), { invalidate, rethrow: true });
  const cancelSalary = useApiMutation((salaryId: number) => onboardingApi.cancelSalary(salaryId), { invalidate });
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [confirmCancelSalary, setConfirmCancelSalary] = useState(false);

  return (
    <QueryBoundary query={query}>
      {(d) => (
        <Box>
          <PageHeader
            title={t('transfers.detailsTitle', { name: d.name })}
            subtitle={t('transfers.fromTo', { from: d.fromSiteName ?? '—', to: d.approvedSiteName ?? d.proposedSiteName ?? '—' })}
            breadcrumbs={[{ label: t('nav.items.transfers'), to: '/transfers' }]}
            meta={<StatusChip enumName="TransferStatus" value={d.status} />}
            actions={
              <>
                {d.canExecute && (
                  <ActionFormButton<S<'TransferExecutionInput'>>
                    label={t('transfers.execute')}
                    variant="contained"
                    description={t('transfers.executeHint')}
                    fields={[
                      { name: 'approvedSiteId', kind: 'select', label: t('transfers.approvedSite'), required: true, options: d.executionSites.map((s) => ({ value: s.id, label: `${s.number} — ${s.name ?? ''}` })) },
                      { name: 'actualDate', kind: 'date', label: t('transfers.actualDate'), required: true, half: true, min: d.minActualDate ?? undefined },
                      { name: 'salaryChanges', kind: 'boolean', label: t('transfers.salaryChanges') },
                      { name: 'salary', kind: 'number', label: t('salary.salary'), half: true, min: 0, helperText: t('transfers.salaryIfChanged') },
                      { name: 'allowance', kind: 'number', label: t('salary.allowance'), half: true, min: 0 },
                      { name: 'effectiveDate', kind: 'date', label: t('salary.effectiveDate'), half: true },
                    ]}
                    defaultValues={{ approvedSiteId: d.proposedSiteId, actualDate: d.minActualDate && d.minActualDate > todayIso() ? d.minActualDate : todayIso(), salaryChanges: false }}
                    onSubmit={(v) => {
                      if (v.salaryChanges && (v.salary === null || v.allowance === null || !v.effectiveDate))
                        return Promise.reject({ title: t('transfers.salaryFieldsRequired'), fieldErrors: { salary: [t('validation.required')] } });
                      return execute.mutateAsync(v.salaryChanges ? v : { ...v, salary: null, allowance: null, effectiveDate: null });
                    }}
                  />
                )}
                {d.canRecordInformed && (
                  <ActionFormButton<S<'RecordSupervisorsInformedRequest'>>
                    label={t('transfers.recordInformed')}
                    fields={[{ name: 'informedOn', kind: 'date', label: t('common.date'), required: true }]}
                    defaultValues={{ informedOn: todayIso() }}
                    onSubmit={(v) => informed.mutateAsync(v)}
                  />
                )}
                {d.canResubmit && (
                  <Button variant="contained" onClick={() => setResubmitOpen(true)}>
                    {t('transfers.resubmit')}
                  </Button>
                )}
                {d.canCancel && (
                  <ActionFormButton<S<'CancelTransferRequest'>>
                    label={t('transfers.cancel')}
                    color="error"
                    destructive
                    fields={[{ name: 'reason', kind: 'textarea', label: t('common.reason'), required: true, maxLength: 500 }]}
                    onSubmit={(v) => cancel.mutateAsync(v)}
                  />
                )}
                <PrintFormButton code="F08" recordId={d.id} />
              </>
            }
          />
          {d.executionRefusal && !d.canExecute && d.status === 'Approved' && <Box sx={{ mb: 2 }}><RefusalHint text={d.executionRefusal} /></Box>}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Stack spacing={3}>
                <SectionCard title={t('transfers.request')}>
                  <InfoGrid
                    items={[
                      { label: t('common.worker'), value: <RouterLink to={`/workers/${d.employeeId}`}>{`${d.employeeNumber} — ${d.name ?? ''}`}</RouterLink> },
                      { label: t('fields.job'), value: d.jobName },
                      { label: t('fields.track'), value: d.trackName },
                      { label: t('transfers.initiatedBy'), value: label('TransferInitiator', d.initiatedBy) },
                      { label: t('transfers.from'), value: d.fromSiteName },
                      { label: t('transfers.proposedSite'), value: d.proposedSiteName },
                      { label: t('transfers.requestedDate'), value: formatDate(d.requestedDate) },
                      { label: t('transfers.submittedBy'), value: d.submittedBy },
                      { label: t('common.createdAt'), value: formatDateTime(d.createdAt) },
                      { label: t('common.reason'), value: d.reason, span: 3 },
                      { label: t('common.statusReason'), value: d.statusReason, span: 3, hidden: !d.statusReason },
                    ]}
                  />
                </SectionCard>
                <SectionCard title={t('transfers.execution')}>
                  <InfoGrid
                    items={[
                      { label: t('transfers.approvedSite'), value: d.approvedSiteName },
                      { label: t('transfers.actualDate'), value: formatDate(d.actualDate) },
                      { label: t('transfers.newPermit'), value: d.newPermitNumber },
                      { label: t('transfers.salaryChanges'), value: d.salaryChanges === null || d.salaryChanges === undefined ? '—' : d.salaryChanges ? t('common.yes') : t('common.no') },
                      { label: t('transfers.supervisorsInformed'), value: formatDate(d.supervisorsInformedOn) },
                    ]}
                  />
                </SectionCard>
                {d.salary && d.salaryVisible && (
                  <SectionCard title={t('transfers.newSalary')}>
                    <Stack spacing={2}>
                      <InfoGrid
                        items={[
                          { label: t('salary.salary'), value: formatMoney(d.salary.salary) },
                          { label: t('salary.allowance'), value: formatMoney(d.salary.allowance) },
                          { label: t('salary.effectiveDate'), value: formatDate(d.salary.effectiveDate) },
                          { label: t('fields.status'), value: <StatusChip enumName="SalaryStatus" value={d.salary.status} /> },
                          { label: t('salary.proposedBy'), value: d.salary.proposedBy },
                        ]}
                      />
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {d.canDecideSalary && (
                          <>
                            <ActionFormButton<{ note: string | null }>
                              label={t('workflow.approve')}
                              size="small"
                              variant="contained"
                              color="success"
                              fields={[{ name: 'note', kind: 'textarea', label: t('workflow.note'), maxLength: 500 }]}
                              onSubmit={(v) => decideSalary.mutateAsync({ salaryId: d.salary!.id, approve: true, note: v.note })}
                            />
                            <ActionFormButton<{ note: string | null }>
                              label={t('workflow.return')}
                              size="small"
                              color="warning"
                              fields={[{ name: 'note', kind: 'textarea', label: t('workflow.returnReason'), required: true, maxLength: 500 }]}
                              onSubmit={(v) => decideSalary.mutateAsync({ salaryId: d.salary!.id, approve: false, note: v.note })}
                            />
                          </>
                        )}
                        {d.canReviseSalary && (
                          <ActionFormButton<S<'ReviseSalaryRequest'>>
                            label={t('salary.revise')}
                            size="small"
                            fields={[
                              { name: 'salary', kind: 'number', label: t('salary.salary'), required: true, half: true, min: 0 },
                              { name: 'allowance', kind: 'number', label: t('salary.allowance'), required: true, half: true, min: 0 },
                              { name: 'effectiveDate', kind: 'date', label: t('salary.effectiveDate'), required: true },
                            ]}
                            defaultValues={{ salary: d.salary.salary, allowance: d.salary.allowance, effectiveDate: d.salary.effectiveDate }}
                            onSubmit={(v) => reviseSalary.mutateAsync({ ...v, salaryId: d.salary!.id })}
                          />
                        )}
                        {d.canCancelSalary && (
                          <Button size="small" color="error" onClick={() => setConfirmCancelSalary(true)}>
                            {t('salary.cancel')}
                          </Button>
                        )}
                      </Stack>
                      <RefusalHint text={d.salaryDecisionRefusal} />
                      {d.salary.rounds.length > 0 && (
                        <List dense>
                          {d.salary.rounds.map((r) => (
                            <ListItem key={r.round} divider>
                              <ListItemText primary={`${t('workflow.round', { n: r.round })}: ${label('ApprovalDecision', r.decision)}`} secondary={[r.decidedBy, formatDateTime(r.decidedAt), r.note].filter((x) => x && x !== '—').join(' · ')} />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Stack>
                  </SectionCard>
                )}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <SectionCard
                title={t('transfers.approvals')}
                subheader={d.waitingParties.length ? `${t('workflow.waitingFor')}: ${d.waitingParties.map((p) => label('LaborParty', p)).join('، ')}` : undefined}
              >
                <Stack spacing={2}>
                  {d.parties.length > 0 && (
                    <PartyDecision
                      parties={d.parties}
                      proxyParties={['Supervisor']}
                      onDecide={(party, verdict, note, proxyName) => decide.mutateAsync({ transferId: d.id, party, verdict, note, proxyName })}
                    />
                  )}
                  <ApprovalRounds rounds={d.rounds} />
                </Stack>
              </SectionCard>
            </Grid>
          </Grid>
          <Dialog open={resubmitOpen} onClose={() => setResubmitOpen(false)} maxWidth="md">
            <DialogTitle>{t('transfers.resubmit')}</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 1 }}>
                <TransferForm
                  worker={{ employeeId: d.employeeId, employeeNumber: d.employeeNumber, name: d.name, nationalityName: null, passportNumber: null, trackName: d.trackName, managementName: null, workSiteName: d.currentSiteName, jobName: d.jobName, startDate: null, status: d.fileStatus, serviceEnded: false, onLeave: false }}
                  transferId={d.id}
                  initial={{ initiatedBy: d.initiatedBy ?? '', proposedSiteId: d.proposedSiteId, reason: d.reason ?? '', requestedDate: d.requestedDate }}
                  submitLabel={t('transfers.resubmit')}
                  onSubmit={(b) => resubmit.mutateAsync(b)}
                  onCancel={() => setResubmitOpen(false)}
                />
              </Box>
            </DialogContent>
          </Dialog>
          <ConfirmDialog
            open={confirmCancelSalary}
            title={t('salary.cancel')}
            message={t('salary.cancelConfirm')}
            destructive
            loading={cancelSalary.isPending}
            onClose={() => setConfirmCancelSalary(false)}
            onConfirm={() => d.salary && cancelSalary.mutate(d.salary.id, { onSettled: () => setConfirmCancelSalary(false) })}
          />
        </Box>
      )}
    </QueryBoundary>
  );
}
