import { Alert, Box, Grid2 as Grid, List, ListItem, ListItemIcon, ListItemText, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { terminationsApi, terminationsKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary, EmptyState } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { InfoGrid } from '@/components/common/InfoGrid';
import { StatusChip } from '@/components/common/StatusChip';
import { RefusalHint } from '@/components/common/RefusalHint';
import { AttachmentButton, PrintFormButton } from '@/components/common/FileButtons';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { formatDate, formatDateTime, formatMoney, todayIso } from '@/utils/format';
import type { S } from '@/types/api';
import type { UploadVars } from '@/services/api/client';

type T = S<'TerminationDetails'>;

export default function TerminationDetailsPage() {
  const id = Number(useParams().terminationId);
  const query = useQuery({ queryKey: terminationsKeys.detail(id), queryFn: () => terminationsApi.get(id) });
  return <QueryBoundary query={query}>{(d) => <View d={d} />}</QueryBoundary>;
}

function View({ d }: { d: T }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const id = d.id;
  const a = d.actions;
  const invalidate = [terminationsKeys.all, ['workers'], ['tasks'], ['payroll'], ['staffing'], ['permits']];
  const decide = useApiMutation((v: S<'DecideTerminationRequest'>) => terminationsApi.decide(id, v), { invalidate, rethrow: true });
  const cancel = useApiMutation((v: S<'CancelTerminationRequest'>) => terminationsApi.cancel(id, v), { invalidate, rethrow: true });
  const execute = useApiMutation((v: S<'TerminationExecutionInput'>) => terminationsApi.execute(id, v), { invalidate, rethrow: true, success: t('terminations.executed') });
  const addItem = useApiMutation((v: S<'AddClearanceItemRequest'>) => terminationsApi.addClearanceItem(id, v), { invalidate, rethrow: true });
  const recordItem = useApiMutation((v: S<'RecordClearanceRequest'> & { itemId: number }) => terminationsApi.recordClearance(id, v.itemId, v), { invalidate, rethrow: true });
  const recordSettlement = useApiMutation((v: S<'TerminationSettlementInput'>) => terminationsApi.recordSettlement(id, v), { invalidate, rethrow: true });
  const approveSettlement = useApiMutation((v: S<'ApproveSettlementRequest'>) => terminationsApi.approveSettlement(id, v), { invalidate, rethrow: true });
  const handPassport = useApiMutation(({ values, transfer }: UploadVars) => terminationsApi.handPassport(id, values, transfer), { invalidate, rethrow: true });
  const decideReplacement = useApiMutation((v: S<'DecideReplacementRequest'>) => terminationsApi.decideReplacement(id, v), { invalidate, rethrow: true });
  const prepareReplacement = useApiMutation((v: S<'PrepareReplacementRequestRequest'>) => terminationsApi.prepareReplacement(id, v), { invalidate, rethrow: true, success: t('terminations.replacementPrepared') });
  const close = useApiMutation((v: S<'CloseTerminationRequest'>) => terminationsApi.close(id, v), { invalidate, rethrow: true, success: t('terminations.closed') });

  const w = d.worker;
  const r = d.request;
  const ex = d.execution;
  const st = d.settlement;

  return (
    <Box>
      <PageHeader
        title={t('terminations.detailsTitle', { name: w.name })}
        subtitle={`${label('TerminationReason', r.reason)} · ${label('TerminationInitiator', r.initiatedBy)} · ${formatDate(r.requestDate)}`}
        breadcrumbs={[{ label: t('nav.items.terminations'), to: '/terminations' }]}
        meta={<StatusChip enumName="TerminationStatus" value={r.status} />}
        actions={
          <>
            {a.canDecide && (
              <>
                <ActionFormButton<{ note: string | null }>
                  label={t('terminations.approve')}
                  variant="contained"
                  color="success"
                  fields={[{ name: 'note', kind: 'textarea', label: t('workflow.note'), maxLength: 500 }]}
                  onSubmit={(v) => decide.mutateAsync({ approve: true, note: v.note })}
                />
                <ActionFormButton<{ note: string | null }>
                  label={t('terminations.notApprove')}
                  color="error"
                  description={t('terminations.notApproveHint')}
                  fields={[{ name: 'note', kind: 'textarea', label: t('common.reason'), required: true, maxLength: 500 }]}
                  onSubmit={(v) => decide.mutateAsync({ approve: false, note: v.note })}
                />
              </>
            )}
            {a.canCancel && (
              <ActionFormButton<S<'CancelTerminationRequest'>>
                label={t('terminations.cancel')}
                color="inherit"
                fields={[{ name: 'reason', kind: 'textarea', label: t('common.reason'), required: true, maxLength: 500 }]}
                onSubmit={(v) => cancel.mutateAsync(v)}
              />
            )}
            <PrintFormButton code="F10" recordId={d.id} />
          </>
        }
      />
      <Stack spacing={1} sx={{ mb: 2 }}>
        {!a.canDecide && <RefusalHint text={a.decisionRefusal} />}
      </Stack>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3}>
            <SectionCard title={t('terminations.request')}>
              <InfoGrid
                items={[
                  { label: t('common.worker'), value: <RouterLink to={`/workers/${w.employeeId}`}>{`${w.employeeNumber} — ${w.name ?? ''}`}</RouterLink> },
                  { label: t('fields.job'), value: w.jobName },
                  { label: t('fields.workSite'), value: w.workSiteName },
                  { label: t('fields.nationality'), value: w.nationalityName },
                  { label: t('fields.startDate'), value: formatDate(w.startDate) },
                  { label: t('fields.status'), value: label('LaborStatus', w.fileStatus) },
                  { label: t('terminations.initiator'), value: label('TerminationInitiator', r.initiatedBy) },
                  { label: t('terminations.reason'), value: label('TerminationReason', r.reason) },
                  { label: t('terminations.requestDate'), value: formatDate(r.requestDate) },
                  { label: t('terminations.noticeDate'), value: formatDate(r.resignationNoticeDate), hidden: !r.resignationNoticeDate },
                  { label: t('terminations.lastWorkingDate'), value: formatDate(r.lastWorkingDate), hidden: !r.lastWorkingDate },
                  { label: t('terminations.incident'), value: r.incident ? `${formatDate(r.incident.firstDate)} – ${formatDate(r.incident.lastDate)} (${r.incident.days})` : '—', hidden: !r.incident },
                  { label: t('terminations.evaluation'), value: r.evaluation ? <RouterLink to={`/evaluations/${r.evaluation.id}`}>{formatDate(r.evaluation.evaluationDate)}</RouterLink> : '—', hidden: !r.evaluation },
                  { label: t('terminations.submittedBy'), value: `${r.submittedBy ?? ''} · ${formatDateTime(r.submittedAt)}` },
                  { label: t('terminations.reasonDetails'), value: r.reasonDetails, span: 3 },
                  { label: t('common.statusReason'), value: r.statusReason, span: 3, hidden: !r.statusReason },
                ]}
              />
              {d.decision && (
                <Alert severity={d.decision.decision === 'Approved' ? 'success' : d.decision.decision === 'Rejected' ? 'error' : 'info'} sx={{ mt: 2 }}>
                  {t('terminations.operationsDecision')}: {label('ApprovalDecision', d.decision.decision)} {d.decision.decidedBy ? `— ${d.decision.decidedBy}` : ''} {formatDateTime(d.decision.decidedAt)}
                  {d.decision.note && <div>{d.decision.note}</div>}
                </Alert>
              )}
            </SectionCard>

            <SectionCard
              title={t('terminations.execution')}
              action={
                a.canExecute && (
                  <ActionFormButton<{ terminationDate: string; formIssuedOn: string | null; items: string | null }>
                    label={t('terminations.execute')}
                    size="small"
                    variant="contained"
                    description={t('terminations.executeHint')}
                    fields={[
                      { name: 'terminationDate', kind: 'date', label: t('terminations.terminationDate'), required: true, half: true, min: ex.minTerminationDate },
                      { name: 'formIssuedOn', kind: 'date', label: t('terminations.formIssuedOn'), half: true },
                      { name: 'items', kind: 'textarea', label: t('terminations.clearanceItems'), helperText: t('terminations.clearanceItemsHint'), rows: 4 },
                    ]}
                    defaultValues={{ terminationDate: ex.minTerminationDate > todayIso() ? ex.minTerminationDate : todayIso(), formIssuedOn: todayIso(), items: ex.defaultClearanceItems.join('\n') }}
                    onSubmit={(v) =>
                      execute.mutateAsync({
                        terminationDate: v.terminationDate,
                        formIssuedOn: v.formIssuedOn,
                        clearanceItems: (v.items ?? '')
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                )
              }
            >
              <Stack spacing={2}>
                {!a.canExecute && ex.refusal && r.status === 'Approved' && <RefusalHint text={ex.refusal} />}
                <InfoGrid
                  columns={2}
                  items={[
                    { label: t('terminations.terminationDate'), value: formatDate(ex.terminationDate) },
                    { label: t('terminations.formIssuedOn'), value: formatDate(ex.formIssuedOn) },
                  ]}
                />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <strong>{t('terminations.clearance')}</strong>
                  {a.canManageClearance && (
                    <ActionFormButton<S<'AddClearanceItemRequest'>>
                      label={t('terminations.addItem')}
                      size="small"
                      fields={[{ name: 'item', kind: 'text', label: t('terminations.item'), required: true, maxLength: 200 }]}
                      onSubmit={(v) => addItem.mutateAsync(v)}
                    />
                  )}
                </Stack>
                {ex.clearance.length === 0 ? (
                  <EmptyState title={t('terminations.noClearance')} />
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('terminations.item')}</TableCell>
                          <TableCell>{t('terminations.returned')}</TableCell>
                          <TableCell>{t('onboarding.receivedBy')}</TableCell>
                          <TableCell>{t('common.date')}</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ex.clearance.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.item}</TableCell>
                            <TableCell>{c.returned === null || c.returned === undefined ? '—' : c.returned ? t('common.yes') : t('common.no')}</TableCell>
                            <TableCell>{c.receivedBy ?? '—'}</TableCell>
                            <TableCell>{formatDate(c.date)}</TableCell>
                            <TableCell align="right">
                              {a.canManageClearance && (
                                <ActionFormButton<{ returned: string; receivedBy: string | null; date: string | null }>
                                  label={t('common.record')}
                                  size="small"
                                  variant="text"
                                  dialogTitle={c.item ?? ''}
                                  fields={[
                                    {
                                      name: 'returned',
                                      kind: 'select',
                                      label: t('terminations.returned'),
                                      required: true,
                                      options: [
                                        { value: 'true', label: t('common.yes') },
                                        { value: 'false', label: t('common.no') },
                                      ],
                                    },
                                    { name: 'receivedBy', kind: 'text', label: t('onboarding.receivedBy'), half: true, maxLength: 200 },
                                    { name: 'date', kind: 'date', label: t('common.date'), half: true },
                                  ]}
                                  defaultValues={{ returned: c.returned === null || c.returned === undefined ? '' : String(c.returned), receivedBy: c.receivedBy, date: c.date ?? todayIso() }}
                                  onSubmit={(v) => recordItem.mutateAsync({ itemId: c.id, returned: v.returned === 'true', receivedBy: v.receivedBy, date: v.date })}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </SectionCard>

            <SectionCard
              title={t('terminations.settlement')}
              action={
                <Stack direction="row" spacing={1}>
                  {a.canRecordSettlement && (
                    <ActionFormButton<S<'TerminationSettlementInput'>>
                      label={t('terminations.recordSettlement')}
                      size="small"
                      fields={[
                        { name: 'entitlements', kind: 'number', label: t('terminations.entitlements'), required: true, half: true, min: 0 },
                        { name: 'deductions', kind: 'number', label: t('terminations.deductions'), required: true, half: true, min: 0 },
                        { name: 'notes', kind: 'textarea', label: t('common.notes'), maxLength: 1000 },
                      ]}
                      defaultValues={{ entitlements: st.entitlements, deductions: st.deductions, notes: st.notes }}
                      onSubmit={(v) => recordSettlement.mutateAsync(v)}
                    />
                  )}
                  {a.canApproveSettlement && (
                    <ActionFormButton<S<'ApproveSettlementRequest'>>
                      label={t('terminations.approveSettlement')}
                      size="small"
                      variant="contained"
                      description={t('terminations.approveSettlementHint')}
                      fields={[
                        { name: 'entitlements', kind: 'number', label: t('terminations.entitlements'), required: true, half: true, min: 0 },
                        { name: 'deductions', kind: 'number', label: t('terminations.deductions'), required: true, half: true, min: 0 },
                      ]}
                      defaultValues={{ entitlements: st.entitlements, deductions: st.deductions }}
                      onSubmit={(v) => approveSettlement.mutateAsync(v)}
                    />
                  )}
                </Stack>
              }
            >
              {!a.canApproveSettlement && a.settlementRefusal && <RefusalHint text={a.settlementRefusal} />}
              {st.recorded ? (
                <InfoGrid
                  items={[
                    { label: t('terminations.entitlements'), value: a.seesAmounts ? formatMoney(st.entitlements) : t('terminations.hiddenAmount') },
                    { label: t('terminations.deductions'), value: a.seesAmounts ? formatMoney(st.deductions) : t('terminations.hiddenAmount') },
                    { label: t('terminations.net'), value: a.seesAmounts ? formatMoney(st.net) : t('terminations.hiddenAmount') },
                    { label: t('terminations.recordedBy'), value: st.recordedBy },
                    { label: t('terminations.approved'), value: st.approved ? `${t('common.yes')} — ${st.approvedBy ?? ''} ${formatDateTime(st.approvedAt)}` : t('common.no') },
                    { label: t('common.notes'), value: st.notes, span: 3 },
                  ]}
                />
              ) : (
                <EmptyState title={t('terminations.noSettlement')} />
              )}
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={3}>
            <SectionCard
              title={t('terminations.passportOnExit')}
              action={
                a.canHandPassport && (
                  <ActionFormButton<Record<string, unknown>>
                    label={t('terminations.handPassport')}
                    size="small"
                    fields={[
                      { name: 'date', kind: 'date', label: t('common.date'), required: true, half: true },
                      { name: 'handedBy', kind: 'text', label: t('onboarding.handedBy'), half: true, maxLength: 200 },
                      { name: 'receivedBy', kind: 'text', label: t('onboarding.receivedBy'), half: true, maxLength: 200 },
                      { name: 'notes', kind: 'textarea', label: t('common.notes'), maxLength: 500 },
                      { name: 'scan', kind: 'file', label: t('attachments.scan') },
                    ]}
                    defaultValues={{ date: todayIso(), receivedBy: w.name }}
                    onSubmit={(values, transfer) => handPassport.mutateAsync({ values, transfer })}
                  />
                )
              }
            >
              {d.passport.libyan && <Alert severity="info" sx={{ mb: 1 }}>{t('terminations.libyanNoPassport')}</Alert>}
              <InfoGrid
                columns={2}
                items={[
                  { label: t('fields.status'), value: d.passport.status ? <StatusChip enumName="PassportCustodyStatus" value={d.passport.status} /> : '—' },
                  { label: t('onboarding.passportLocation'), value: d.passport.location },
                  { label: t('terminations.handedOn'), value: formatDate(d.passport.handedOn) },
                  { label: t('onboarding.receivedBy'), value: d.passport.receivedBy },
                ]}
              />
              {d.passport.attachmentId && <Box sx={{ mt: 1 }}><AttachmentButton attachmentId={d.passport.attachmentId} /></Box>}
            </SectionCard>

            <SectionCard
              title={t('terminations.replacement')}
              action={
                <Stack direction="row" spacing={1}>
                  {a.canDecideReplacement && (
                    <ActionFormButton<{ needed: string; reason: string | null }>
                      label={t('terminations.decideReplacement')}
                      size="small"
                      fields={[
                        {
                          name: 'needed',
                          kind: 'select',
                          label: t('terminations.replacementNeeded'),
                          required: true,
                          options: [
                            { value: 'true', label: t('terminations.needed') },
                            { value: 'false', label: t('terminations.notNeeded') },
                          ],
                        },
                        { name: 'reason', kind: 'textarea', label: t('common.reason'), required: true, maxLength: 500 },
                      ]}
                      onSubmit={(v) => decideReplacement.mutateAsync({ needed: v.needed === 'true', reason: v.reason })}
                    />
                  )}
                  {a.canPrepareReplacement && (
                    <ActionFormButton<S<'PrepareReplacementRequestRequest'>>
                      label={t('terminations.prepareReplacement')}
                      size="small"
                      variant="contained"
                      description={t('terminations.prepareReplacementHint')}
                      fields={[
                        { name: 'requiredStartDate', kind: 'date', label: t('staffing.requiredStartDate'), required: true },
                        { name: 'justification', kind: 'textarea', label: t('staffing.justification'), required: true, maxLength: 1000 },
                        { name: 'requestedBy', kind: 'text', label: t('staffing.requestedBy'), maxLength: 200 },
                      ]}
                      onSubmit={(v) => prepareReplacement.mutateAsync(v)}
                    />
                  )}
                </Stack>
              }
            >
              <InfoGrid
                columns={2}
                items={[
                  { label: t('terminations.replacementNeeded'), value: d.replacement.needed === null || d.replacement.needed === undefined ? t('terminations.undecided') : d.replacement.needed ? t('terminations.needed') : t('terminations.notNeeded') },
                  { label: t('workflow.decidedBy'), value: d.replacement.decidedBy ? `${d.replacement.decidedBy} · ${formatDateTime(d.replacement.decidedAt)}` : '—' },
                  { label: t('common.reason'), value: d.replacement.reason, span: 2 },
                  {
                    label: t('terminations.replacementRequest'),
                    value: d.replacement.requestNumber ? (
                      <RouterLink to={`/staffing-requests/${d.replacement.requestNumber}`}>
                        {t('staffing.requestNo', { n: d.replacement.requestNumber })} — {label('StaffingRequestStatus', d.replacement.requestStatus)}
                      </RouterLink>
                    ) : (
                      '—'
                    ),
                    span: 2,
                  },
                ]}
              />
            </SectionCard>

            <SectionCard
              title={t('terminations.closing')}
              action={
                a.canClose && (
                  <ActionFormButton<S<'CloseTerminationRequest'>>
                    label={t('terminations.close')}
                    size="small"
                    variant="contained"
                    description={t('terminations.closeHint')}
                    fields={[
                      { name: 'closedOn', kind: 'date', label: t('common.date'), required: true },
                      { name: 'passportException', kind: 'textarea', label: t('terminations.passportException'), helperText: t('terminations.passportExceptionHint'), maxLength: 500 },
                    ]}
                    defaultValues={{ closedOn: todayIso() }}
                    onSubmit={(v) => close.mutateAsync(v)}
                  />
                )
              }
            >
              <List dense disablePadding>
                {d.closing.steps.map((s) => (
                  <ListItem key={s.label} disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>{s.done ? <CheckCircleIcon color="success" fontSize="small" /> : <RadioButtonUncheckedIcon color="disabled" fontSize="small" />}</ListItemIcon>
                    <ListItemText primary={s.label} secondary={s.note} />
                  </ListItem>
                ))}
              </List>
              {d.closing.closedOn && <Alert severity="success" sx={{ mt: 1 }}>{t('terminations.closedOn', { date: formatDate(d.closing.closedOn) })}</Alert>}
              {d.closing.passportException && <Alert severity="info" sx={{ mt: 1 }}>{d.closing.passportException}</Alert>}
            </SectionCard>

            <SectionCard title={t('payroll.notices')} noPadding>
              {d.notices.length === 0 ? (
                <EmptyState title={t('payroll.noNotices')} />
              ) : (
                <List dense>
                  {d.notices.map((n) => (
                    <ListItem key={n.id} divider secondaryAction={<StatusChip enumName="PayrollNoticeStatus" value={n.status} />}>
                      <ListItemText primary={`${label('PayrollNoticeKind', n.kind)} · ${formatDate(n.effectiveDate)}`} secondary={[n.details, n.deliveredOn && `${t('payroll.deliveredOn')}: ${formatDate(n.deliveredOn)}`].filter(Boolean).join(' · ')} />
                    </ListItem>
                  ))}
                </List>
              )}
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
