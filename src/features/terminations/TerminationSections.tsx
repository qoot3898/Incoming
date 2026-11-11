import { Alert, Box, List, ListItem, ListItemIcon, ListItemText, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { terminationsApi, terminationsKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/States';
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

type Termination = S<'TerminationDetails'>;
type ClearanceRow = S<'TerminationClearanceRow'>;
type SectionProps = { d: Termination };

/** Every termination step can change the worker file, tasks, payroll notices, staffing (replacement) and permits. */
const INVALIDATE = [terminationsKeys.all, ['workers'], ['tasks'], ['payroll'], ['staffing'], ['permits']];

/** Yes / No / — for an optional answer. */
const yesNo = (t: TFunction, v: boolean | null | undefined) => (v === null || v === undefined ? '—' : v ? t('common.yes') : t('common.no'));
/** Select value of an optional boolean ('' when not answered yet). */
const boolValue = (v: boolean | null | undefined) => (v === null || v === undefined ? '' : String(v));

/** Header with the operations decision (FR-47) and cancellation. */
export function TerminationHeader({ d }: SectionProps) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const a = d.actions;
  const r = d.request;
  const decide = useApiMutation((v: S<'DecideTerminationRequest'>) => terminationsApi.decide(d.id, v), { invalidate: INVALIDATE, rethrow: true });
  const cancel = useApiMutation((v: S<'CancelTerminationRequest'>) => terminationsApi.cancel(d.id, v), { invalidate: INVALIDATE, rethrow: true });
  return (
    <>
      <PageHeader
        title={t('terminations.detailsTitle', { name: d.worker.name })}
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
    </>
  );
}

/** The request as submitted (FR-46) and the operations decision. */
export function RequestSection({ d }: SectionProps) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const w = d.worker;
  const r = d.request;
  const incident = r.incident ? `${formatDate(r.incident.firstDate)} – ${formatDate(r.incident.lastDate)} (${r.incident.days})` : '—';
  const evaluation = r.evaluation ? <RouterLink to={`/evaluations/${r.evaluation.id}`}>{formatDate(r.evaluation.evaluationDate)}</RouterLink> : '—';
  return (
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
          { label: t('terminations.incident'), value: incident, hidden: !r.incident },
          { label: t('terminations.evaluation'), value: evaluation, hidden: !r.evaluation },
          { label: t('terminations.submittedBy'), value: `${r.submittedBy ?? ''} · ${formatDateTime(r.submittedAt)}` },
          { label: t('terminations.reasonDetails'), value: r.reasonDetails, span: 3 },
          { label: t('common.statusReason'), value: r.statusReason, span: 3, hidden: !r.statusReason },
        ]}
      />
      {d.decision && <DecisionAlert decision={d.decision} />}
    </SectionCard>
  );
}

const DECISION_SEVERITY: Record<string, 'success' | 'error'> = { Approved: 'success', Rejected: 'error' };

function DecisionAlert({ decision }: { decision: NonNullable<Termination['decision']> }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  return (
    <Alert severity={DECISION_SEVERITY[decision.decision ?? ''] ?? 'info'} sx={{ mt: 2 }}>
      {t('terminations.operationsDecision')}: {label('ApprovalDecision', decision.decision)} {decision.decidedBy ? `— ${decision.decidedBy}` : ''} {formatDateTime(decision.decidedAt)}
      {decision.note && <div>{decision.note}</div>}
    </Alert>
  );
}

/** Execution (termination date, TL-F10) and clearance items (FR-48, FR-49). */
export function ExecutionSection({ d }: SectionProps) {
  const { t } = useTranslation();
  const a = d.actions;
  const ex = d.execution;
  const addItem = useApiMutation((v: S<'AddClearanceItemRequest'>) => terminationsApi.addClearanceItem(d.id, v), { invalidate: INVALIDATE, rethrow: true });
  return (
    <SectionCard title={t('terminations.execution')} action={a.canExecute && <ExecuteButton d={d} />}>
      <Stack spacing={2}>
        {!a.canExecute && ex.refusal && d.request.status === 'Approved' && <RefusalHint text={ex.refusal} />}
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
        {ex.clearance.length === 0 ? <EmptyState title={t('terminations.noClearance')} /> : <ClearanceTable terminationId={d.id} rows={ex.clearance} canManage={a.canManageClearance} />}
      </Stack>
    </SectionCard>
  );
}

function ExecuteButton({ d }: SectionProps) {
  const { t } = useTranslation();
  const ex = d.execution;
  const execute = useApiMutation((v: S<'TerminationExecutionInput'>) => terminationsApi.execute(d.id, v), { invalidate: INVALIDATE, rethrow: true, success: t('terminations.executed') });
  const today = todayIso();
  return (
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
      defaultValues={{ terminationDate: ex.minTerminationDate > today ? ex.minTerminationDate : today, formIssuedOn: today, items: ex.defaultClearanceItems.join('\n') }}
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
  );
}

function ClearanceTable({ terminationId, rows, canManage }: { terminationId: number; rows: ClearanceRow[]; canManage: boolean }) {
  const { t } = useTranslation();
  const record = useApiMutation((v: S<'RecordClearanceRequest'> & { itemId: number }) => terminationsApi.recordClearance(terminationId, v.itemId, v), { invalidate: INVALIDATE, rethrow: true });
  return (
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
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.item}</TableCell>
              <TableCell>{yesNo(t, c.returned)}</TableCell>
              <TableCell>{c.receivedBy ?? '—'}</TableCell>
              <TableCell>{formatDate(c.date)}</TableCell>
              <TableCell align="right">{canManage && <RecordClearanceButton row={c} onRecord={(v) => record.mutateAsync({ itemId: c.id, ...v })} />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function RecordClearanceButton({ row: c, onRecord }: { row: ClearanceRow; onRecord: (v: S<'RecordClearanceRequest'>) => Promise<unknown> }) {
  const { t } = useTranslation();
  return (
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
      defaultValues={{ returned: boolValue(c.returned), receivedBy: c.receivedBy, date: c.date ?? todayIso() }}
      onSubmit={(v) => onRecord({ returned: v.returned === 'true', receivedBy: v.receivedBy, date: v.date })}
    />
  );
}

/** Final settlement recorded and approved by two finance users (FR-50, TL-B20); amounts only for those allowed to see them. */
export function SettlementSection({ d }: SectionProps) {
  const { t } = useTranslation();
  const a = d.actions;
  const st = d.settlement;
  const amount = (v: number | null | undefined) => (a.seesAmounts ? formatMoney(v) : t('terminations.hiddenAmount'));
  return (
    <SectionCard title={t('terminations.settlement')} action={<SettlementActions d={d} />}>
      {!a.canApproveSettlement && a.settlementRefusal && <RefusalHint text={a.settlementRefusal} />}
      {st.recorded ? (
        <InfoGrid
          items={[
            { label: t('terminations.entitlements'), value: amount(st.entitlements) },
            { label: t('terminations.deductions'), value: amount(st.deductions) },
            { label: t('terminations.net'), value: amount(st.net) },
            { label: t('terminations.recordedBy'), value: st.recordedBy },
            { label: t('terminations.approved'), value: st.approved ? `${t('common.yes')} — ${st.approvedBy ?? ''} ${formatDateTime(st.approvedAt)}` : t('common.no') },
            { label: t('common.notes'), value: st.notes, span: 3 },
          ]}
        />
      ) : (
        <EmptyState title={t('terminations.noSettlement')} />
      )}
    </SectionCard>
  );
}

function SettlementActions({ d }: SectionProps) {
  const { t } = useTranslation();
  const a = d.actions;
  const st = d.settlement;
  const recordSettlement = useApiMutation((v: S<'TerminationSettlementInput'>) => terminationsApi.recordSettlement(d.id, v), { invalidate: INVALIDATE, rethrow: true });
  const approveSettlement = useApiMutation((v: S<'ApproveSettlementRequest'>) => terminationsApi.approveSettlement(d.id, v), { invalidate: INVALIDATE, rethrow: true });
  return (
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
  );
}

/** Passport handed over on exit (FR-25); Libyans have no passport in custody (TL-12). */
export function PassportSection({ d }: SectionProps) {
  const { t } = useTranslation();
  const p = d.passport;
  const handPassport = useApiMutation(({ values, transfer }: UploadVars) => terminationsApi.handPassport(d.id, values, transfer), { invalidate: INVALIDATE, rethrow: true });
  return (
    <SectionCard
      title={t('terminations.passportOnExit')}
      action={
        d.actions.canHandPassport && (
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
            defaultValues={{ date: todayIso(), receivedBy: d.worker.name }}
            onSubmit={(values, transfer) => handPassport.mutateAsync({ values, transfer })}
          />
        )
      }
    >
      {p.libyan && (
        <Alert severity="info" sx={{ mb: 1 }}>
          {t('terminations.libyanNoPassport')}
        </Alert>
      )}
      <InfoGrid
        columns={2}
        items={[
          { label: t('fields.status'), value: p.status ? <StatusChip enumName="PassportCustodyStatus" value={p.status} /> : '—' },
          { label: t('onboarding.passportLocation'), value: p.location },
          { label: t('terminations.handedOn'), value: formatDate(p.handedOn) },
          { label: t('onboarding.receivedBy'), value: p.receivedBy },
        ]}
      />
      {p.attachmentId && (
        <Box sx={{ mt: 1 }}>
          <AttachmentButton attachmentId={p.attachmentId} />
        </Box>
      )}
    </SectionCard>
  );
}

/** Replacement decision and the pre-filled replacement request (FR-52, FR-53). */
export function ReplacementSection({ d }: SectionProps) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const rep = d.replacement;
  const needed = rep.needed === null || rep.needed === undefined ? t('terminations.undecided') : rep.needed ? t('terminations.needed') : t('terminations.notNeeded');
  const request = rep.requestNumber ? (
    <RouterLink to={`/staffing-requests/${rep.requestNumber}`}>
      {t('staffing.requestNo', { n: rep.requestNumber })} — {label('StaffingRequestStatus', rep.requestStatus)}
    </RouterLink>
  ) : (
    '—'
  );
  return (
    <SectionCard title={t('terminations.replacement')} action={<ReplacementActions d={d} />}>
      <InfoGrid
        columns={2}
        items={[
          { label: t('terminations.replacementNeeded'), value: needed },
          { label: t('workflow.decidedBy'), value: rep.decidedBy ? `${rep.decidedBy} · ${formatDateTime(rep.decidedAt)}` : '—' },
          { label: t('common.reason'), value: rep.reason, span: 2 },
          { label: t('terminations.replacementRequest'), value: request, span: 2 },
        ]}
      />
    </SectionCard>
  );
}

function ReplacementActions({ d }: SectionProps) {
  const { t } = useTranslation();
  const a = d.actions;
  const decideReplacement = useApiMutation((v: S<'DecideReplacementRequest'>) => terminationsApi.decideReplacement(d.id, v), { invalidate: INVALIDATE, rethrow: true });
  const prepareReplacement = useApiMutation((v: S<'PrepareReplacementRequestRequest'>) => terminationsApi.prepareReplacement(d.id, v), {
    invalidate: INVALIDATE,
    rethrow: true,
    success: t('terminations.replacementPrepared'),
  });
  return (
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
  );
}

/** Closing checklist (TL-B20): settlement, clearance, replacement decision, passport or exception, delivered notice. */
export function ClosingSection({ d }: SectionProps) {
  const { t } = useTranslation();
  const closing = d.closing;
  const close = useApiMutation((v: S<'CloseTerminationRequest'>) => terminationsApi.close(d.id, v), { invalidate: INVALIDATE, rethrow: true, success: t('terminations.closed') });
  return (
    <SectionCard
      title={t('terminations.closing')}
      action={
        d.actions.canClose && (
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
        {closing.steps.map((s) => (
          <ListItem key={s.label} disableGutters>
            <ListItemIcon sx={{ minWidth: 32 }}>{s.done ? <CheckCircleIcon color="success" fontSize="small" /> : <RadioButtonUncheckedIcon color="disabled" fontSize="small" />}</ListItemIcon>
            <ListItemText primary={s.label} secondary={s.note} />
          </ListItem>
        ))}
      </List>
      {closing.closedOn && (
        <Alert severity="success" sx={{ mt: 1 }}>
          {t('terminations.closedOn', { date: formatDate(closing.closedOn) })}
        </Alert>
      )}
      {closing.passportException && (
        <Alert severity="info" sx={{ mt: 1 }}>
          {closing.passportException}
        </Alert>
      )}
    </SectionCard>
  );
}

/** Payroll notices of the termination (stop of pay, final settlement). */
export function NoticesSection({ notices }: { notices: Termination['notices'] }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  return (
    <SectionCard title={t('payroll.notices')} noPadding>
      {notices.length === 0 ? (
        <EmptyState title={t('payroll.noNotices')} />
      ) : (
        <List dense>
          {notices.map((n) => (
            <ListItem key={n.id} divider secondaryAction={<StatusChip enumName="PayrollNoticeStatus" value={n.status} />}>
              <ListItemText
                primary={`${label('PayrollNoticeKind', n.kind)} · ${formatDate(n.effectiveDate)}`}
                secondary={[n.details, n.deliveredOn && `${t('payroll.deliveredOn')}: ${formatDate(n.deliveredOn)}`].filter(Boolean).join(' · ')}
              />
            </ListItem>
          ))}
        </List>
      )}
    </SectionCard>
  );
}
