import { Alert, Box, Grid2 as Grid, List, ListItem, ListItemText, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { leavesApi, leavesKeys } from './api';
import { leaveFields } from './leaveFields';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary, EmptyState } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { InfoGrid } from '@/components/common/InfoGrid';
import { StatusChip, ToneChip } from '@/components/common/StatusChip';
import { RefusalHint } from '@/components/common/RefusalHint';
import { PrintFormButton } from '@/components/common/FileButtons';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { ApprovalRounds } from '@/components/workflow/ApprovalRounds';
import { PartyDecision, type Verdict } from '@/components/workflow/PartyDecision';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { ENUMS } from '@/constants/enums';
import { formatDate, formatDateTime, todayIso } from '@/utils/format';
import type { ApprovalDecision, S } from '@/types/api';

const VERDICT: Record<Verdict, ApprovalDecision> = { Approve: 'Approved', Return: 'Returned', Reject: 'Rejected' };

export default function LeaveDetailsPage() {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const id = Number(useParams().leaveId);
  const query = useQuery({ queryKey: leavesKeys.detail(id), queryFn: () => leavesApi.get(id) });
  const invalidate = [leavesKeys.all, ['workers'], ['tasks'], ['attendance'], ['payroll'], ['onboarding']];
  const decide = useApiMutation((v: S<'LeaveDecisionInput'>) => leavesApi.decide(id, v), { invalidate, rethrow: true });
  const resubmit = useApiMutation((v: S<'LeaveRequest'>) => leavesApi.resubmit(id, v), { invalidate, rethrow: true });
  const cancel = useApiMutation((v: S<'CancelLeaveRequest'>) => leavesApi.cancel(id, v), { invalidate, rethrow: true });
  const confirmReturn = useApiMutation((v: S<'ConfirmLeaveReturnRequest'>) => leavesApi.confirmReturn(id, v), { invalidate, rethrow: true });
  const handPassport = useApiMutation((v: S<'HandPassportForTravelRequest'>) => leavesApi.handPassport(id, v), { invalidate, rethrow: true });
  const returnPassport = useApiMutation((v: S<'ReturnPassportFromTravelRequest'>) => leavesApi.returnPassport(id, v), { invalidate, rethrow: true });

  const movementFields = [
    { name: 'date' as const, kind: 'date' as const, label: t('common.date'), required: true, half: true },
    { name: 'handedBy' as const, kind: 'text' as const, label: t('onboarding.handedBy'), half: true, maxLength: 200 },
    { name: 'receivedBy' as const, kind: 'text' as const, label: t('onboarding.receivedBy'), half: true, maxLength: 200 },
    { name: 'notes' as const, kind: 'textarea' as const, label: t('common.notes'), maxLength: 500 },
  ];

  return (
    <QueryBoundary query={query}>
      {(l) => (
        <Box>
          <PageHeader
            title={t('leaves.detailsTitle', { type: label('LeaveType', l.type), name: l.worker.name })}
            subtitle={`${formatDate(l.fromDate)} – ${formatDate(l.toDate)} · ${l.days} ${t('common.days')}`}
            breadcrumbs={[{ label: t('nav.items.leaves'), to: '/leaves' }]}
            meta={
              <Stack direction="row" spacing={1}>
                <StatusChip enumName="LeaveStatus" value={l.status} />
                {l.overdueDays > 0 && <ToneChip tone="error" label={t('leaves.overdueDays', { count: l.overdueDays })} />}
              </Stack>
            }
            actions={
              <>
                {l.canResubmit && (
                  <ActionFormButton<S<'LeaveRequest'>>
                    label={t('leaves.resubmit')}
                    variant="contained"
                    fields={leaveFields(t, enumOptions('LeaveType', ENUMS.LeaveType))}
                    defaultValues={{ type: l.type, fromDate: l.fromDate, toDate: l.toDate, requiresTravel: l.requiresTravel, notes: l.notes }}
                    onSubmit={(v) => resubmit.mutateAsync(v)}
                  />
                )}
                {l.canConfirmReturn && (
                  <ActionFormButton<S<'ConfirmLeaveReturnRequest'>>
                    label={t('leaves.confirmReturn')}
                    variant="contained"
                    color="success"
                    description={
                      <Stack spacing={1}>
                        <span>{t('leaves.confirmReturnHint')}</span>
                        {l.returnFacts.recordedAfterEnd.length > 0 && <Alert severity="info">{t('leaves.recordedAfterEnd', { dates: l.returnFacts.recordedAfterEnd.map(formatDate).join('، ') })}</Alert>}
                        {l.returnFacts.automaticAbsences.length > 0 && <Alert severity="warning">{t('leaves.automaticAbsences', { dates: l.returnFacts.automaticAbsences.map(formatDate).join('، ') })}</Alert>}
                      </Stack>
                    }
                    fields={[{ name: 'resumedOn', kind: 'date', label: t('leaves.resumedOn'), required: true }]}
                    defaultValues={{ resumedOn: todayIso() }}
                    onSubmit={(v) => confirmReturn.mutateAsync(v)}
                  />
                )}
                {l.canHandPassport && (
                  <ActionFormButton<S<'HandPassportForTravelRequest'>>
                    label={t('leaves.handPassport')}
                    fields={movementFields}
                    defaultValues={{ date: todayIso(), receivedBy: l.worker.name }}
                    onSubmit={(v) => handPassport.mutateAsync(v)}
                  />
                )}
                {l.canReturnPassport && (
                  <ActionFormButton<S<'ReturnPassportFromTravelRequest'>>
                    label={t('leaves.returnPassport')}
                    fields={movementFields}
                    defaultValues={{ date: todayIso(), handedBy: l.worker.name }}
                    onSubmit={(v) => returnPassport.mutateAsync(v)}
                  />
                )}
                {l.canCancel && (
                  <ActionFormButton<S<'CancelLeaveRequest'>>
                    label={t('leaves.cancel')}
                    color="error"
                    destructive
                    fields={[{ name: 'reason', kind: 'textarea', label: t('common.reason'), required: true, maxLength: 500 }]}
                    onSubmit={(v) => cancel.mutateAsync(v)}
                  />
                )}
                <PrintFormButton code="F05" recordId={l.id} />
              </>
            }
          />
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Stack spacing={3}>
                <SectionCard title={t('leaves.request')}>
                  <InfoGrid
                    items={[
                      {
                        label: t('common.worker'),
                        value: <RouterLink to={`/workers/${l.worker.employeeId}`}>{`${l.worker.employeeNumber} — ${l.worker.name ?? ''}`}</RouterLink>,
                      },
                      { label: t('fields.workSite'), value: l.worker.workSiteName },
                      { label: t('fields.job'), value: l.worker.jobName },
                      { label: t('leaves.type'), value: label('LeaveType', l.type) },
                      { label: t('common.from'), value: formatDate(l.fromDate) },
                      { label: t('common.to'), value: formatDate(l.toDate) },
                      { label: t('common.days'), value: l.days },
                      { label: t('leaves.travel'), value: l.requiresTravel ? t('common.yes') : t('common.no') },
                      { label: t('leaves.submittedBy'), value: l.submittedBy },
                      { label: t('leaves.resumedOn'), value: formatDate(l.resumedOn) },
                      { label: t('leaves.returnedOnTime'), value: l.returnedOnTime === null || l.returnedOnTime === undefined ? '—' : l.returnedOnTime ? t('common.yes') : t('common.no') },
                      { label: t('common.notes'), value: l.notes, span: 3 },
                      { label: t('common.statusReason'), value: l.statusReason, span: 3, hidden: !l.statusReason },
                    ]}
                  />
                  {l.cancelRefusal && !l.canCancel && <Box sx={{ mt: 2 }}><RefusalHint text={l.cancelRefusal} /></Box>}
                  {l.workerRefusal && <Box sx={{ mt: 2 }}><RefusalHint text={l.workerRefusal} /></Box>}
                </SectionCard>
                {l.passport && (
                  <SectionCard title={t('onboarding.passportCustody')}>
                    <InfoGrid
                      columns={2}
                      items={[
                        { label: t('fields.status'), value: <StatusChip enumName="PassportCustodyStatus" value={l.passport.status} /> },
                        { label: t('onboarding.passportLocation'), value: l.passport.location },
                      ]}
                    />
                    <List dense>
                      {l.passport.movements.map((m) => (
                        <ListItem key={`${m.kind}|${m.date}|${m.handedBy ?? ''}|${m.receivedBy ?? ''}`} divider>
                          <ListItemText primary={`${label('PassportMovementKind', m.kind)} · ${formatDate(m.date)}`} secondary={[m.handedBy, m.receivedBy, m.notes].filter(Boolean).join(' · ')} />
                        </ListItem>
                      ))}
                    </List>
                  </SectionCard>
                )}
                <SectionCard title={t('payroll.notices')} noPadding>
                  {l.notices.length === 0 ? (
                    <EmptyState title={t('payroll.noNotices')} />
                  ) : (
                    <List dense>
                      {l.notices.map((n) => (
                        <ListItem key={n.id} divider secondaryAction={<StatusChip enumName="PayrollNoticeStatus" value={n.status} />}>
                          <ListItemText primary={`${label('PayrollNoticeKind', n.kind)} · ${formatDate(n.effectiveDate)}`} secondary={[n.details, n.deliveredOn && `${t('payroll.deliveredOn')}: ${formatDate(n.deliveredOn)}`, n.confirmedAt && `${t('payroll.confirmedAt')}: ${formatDateTime(n.confirmedAt)}`].filter(Boolean).join(' · ')} />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </SectionCard>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Stack spacing={3}>
                <SectionCard title={t('workflow.approvals')} subheader={l.waitingParty ? `${t('workflow.waitingFor')}: ${label('LaborParty', l.waitingParty)}` : undefined}>
                  <Stack spacing={2}>
                    {l.canManage && l.parties.length > 0 && (
                      <PartyDecision
                        parties={l.parties}
                        proxyParties={['Supervisor']}
                        onDecide={(party, verdict, note, proxyName) => decide.mutateAsync({ leaveId: l.id, party, decision: VERDICT[verdict], note, proxyName })}
                      />
                    )}
                    <ApprovalRounds rounds={l.rounds} />
                  </Stack>
                </SectionCard>
                <SectionCard title={t('leaves.previousLeaves')} subheader={t('leaves.takenSummary', { count: l.history.takenCount, days: l.history.takenDays })} noPadding>
                  <List dense>
                    {l.history.leaves
                      .filter((h) => h.id !== l.id)
                      .slice(0, 10)
                      .map((h) => (
                        <ListItem key={h.id} divider secondaryAction={<StatusChip enumName="LeaveStatus" value={h.status} />}>
                          <ListItemText primary={<RouterLink to={`/leaves/${h.id}`}>{`${label('LeaveType', h.type)} · ${formatDate(h.fromDate)} – ${formatDate(h.toDate)}`}</RouterLink>} secondary={`${h.days} ${t('common.days')}`} />
                        </ListItem>
                      ))}
                  </List>
                </SectionCard>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      )}
    </QueryBoundary>
  );
}
