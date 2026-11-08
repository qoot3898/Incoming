import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useQuery } from '@tanstack/react-query';
import { useOnboardingInvalidation } from './invalidation';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { onboardingApi, onboardingKeys } from './api';
import { payrollApi } from '@/features/payroll/api';
import { SectionCard } from '@/components/common/SectionCard';
import { InfoGrid } from '@/components/common/InfoGrid';
import { StatusChip, ToneChip } from '@/components/common/StatusChip';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States';
import { AttachmentButton } from '@/components/common/FileButtons';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { RefusalHint } from '@/components/common/RefusalHint';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { ApprovalRounds } from '@/components/workflow/ApprovalRounds';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { ENUMS } from '@/constants/enums';
import { formatDate, formatDateTime, formatMoney, todayIso } from '@/utils/format';
import type { LaborParty, S } from '@/types/api';
import type { UploadVars } from '@/services/api/client';

type Rec = S<'OnboardingRecord'>;


export function StartRecordCard({ r }: { r: Rec }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const o = r.onboarding;
  return (
    <SectionCard title={t('onboarding.startRecord')}>
      <InfoGrid
        items={[
          { label: t('onboarding.registeredOn'), value: formatDate(r.registeredOn) },
          { label: t('fields.origin'), value: label('LaborFileOrigin', r.origin) },
          { label: t('fields.nationality'), value: r.nationalityName },
          { label: t('fields.passportNumber'), value: r.passportNumber },
          { label: t('fields.nationalNumber'), value: r.nationalNumber },
          { label: t('fields.healthCertificateExpiry'), value: formatDate(r.healthCertificateExpiry) },
          { label: t('onboarding.reportedStartDate'), value: formatDate(o?.reportedStartDate) },
          { label: t('onboarding.reportedBy'), value: o?.reportedBy },
          { label: t('onboarding.startDate'), value: formatDate(o?.startDate) },
          { label: t('onboarding.dateNote'), value: o?.startDateNote, hidden: !o?.startDateNote },
          { label: t('onboarding.hrStartDate'), value: formatDate(r.hrStartDate) },
          { label: t('onboarding.openedAt'), value: formatDateTime(o?.openedAt) },
        ]}
      />
      {o?.returnedBy && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {t('onboarding.returnedBy', { party: label('LaborParty', o.returnedBy), date: formatDateTime(o.returnedAt) })}
          {o.returnNote && <div>{o.returnNote}</div>}
        </Alert>
      )}
      {!o && <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{t('onboarding.noStartRecord')}</Typography>}
    </SectionCard>
  );
}

export function ChecklistCard({ r }: { r: Rec }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const invalidate = useOnboardingInvalidation();
  const receive = useApiMutation(({ values, transfer }: UploadVars) => onboardingApi.receiveDocument(r.employeeId, values, transfer), { invalidate, rethrow: true });
  const remove = useApiMutation(onboardingApi.removeDocument, { invalidate });
  const [toRemove, setToRemove] = useState<number | null>(null);

  return (
    <SectionCard
      title={t('onboarding.checklist')}
      subheader={r.documentsDueDate ? t('onboarding.dueOn', { date: formatDate(r.documentsDueDate) }) : undefined}
      action={
        r.canManage && (
          <ActionFormButton<{ kind: string; receivedOn: string; expiresOn: string | null; notes: string | null; scan: File | null }>
            label={t('onboarding.receiveDocument')}
            size="small"
            fields={[
              { name: 'kind', kind: 'select', label: t('onboarding.documentKind'), required: true, half: true, options: enumOptions('LaborDocumentKind', ENUMS.LaborDocumentKind) },
              { name: 'receivedOn', kind: 'date', label: t('onboarding.receivedOn'), required: true, half: true },
              { name: 'expiresOn', kind: 'date', label: t('onboarding.expiresOn'), half: true, helperText: t('onboarding.expiresOnHint') },
              { name: 'notes', kind: 'textarea', label: t('common.notes'), maxLength: 500 },
              { name: 'scan', kind: 'file', label: t('attachments.scan') },
            ]}
            defaultValues={{ receivedOn: todayIso() }}
            onSubmit={(values, transfer) => receive.mutateAsync({ values, transfer })}
          />
        )
      }
    >
      <Stack spacing={2}>
        {r.documentsOverdue && <Alert severity="error">{t('onboarding.documentsOverdue')}</Alert>}
        {r.documentsDueSoon && !r.documentsOverdue && <Alert severity="warning">{t('onboarding.documentsDueSoon')}</Alert>}
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {r.checklist.map((c) => (
            <Stack key={c.item} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.25, border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={500}>
                {c.label ?? label('ChecklistItem', c.item)}
              </Typography>
              <StatusChip enumName="ChecklistState" value={c.state} />
            </Stack>
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {r.checklistComplete ? t('onboarding.checklistComplete') : t('onboarding.missingCount', { count: r.missingCount })}
        </Typography>
        {r.documents.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('onboarding.documentKind')}</TableCell>
                  <TableCell>{t('onboarding.receivedOn')}</TableCell>
                  <TableCell>{t('onboarding.expiresOn')}</TableCell>
                  <TableCell>{t('onboarding.receivedBy')}</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {r.documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{label('LaborDocumentKind', d.kind)}</TableCell>
                    <TableCell>{formatDate(d.receivedOn)}</TableCell>
                    <TableCell>{formatDate(d.expiresOn)}</TableCell>
                    <TableCell>{d.receivedBy ?? '—'}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {d.attachmentId && <AttachmentButton attachmentId={d.attachmentId} icon />}
                      {r.canManage && (
                        <Tooltip title={t('common.delete')}>
                          <IconButton size="small" onClick={() => setToRemove(d.id)} aria-label={t('common.delete')}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
      <ConfirmDialog
        open={toRemove !== null}
        title={t('onboarding.removeDocument')}
        message={t('onboarding.removeDocumentConfirm')}
        destructive
        loading={remove.isPending}
        onClose={() => setToRemove(null)}
        onConfirm={() => toRemove !== null && remove.mutate(toRemove, { onSettled: () => setToRemove(null) })}
      />
    </SectionCard>
  );
}

export function PassportCard({ r }: { r: Rec }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const invalidate = useOnboardingInvalidation();
  const receive = useApiMutation(({ values, transfer }: UploadVars) => onboardingApi.receivePassport(r.employeeId, values, transfer), { invalidate, rethrow: true });
  const relocate = useApiMutation((v: S<'RelocatePassportRequest'>) => onboardingApi.relocatePassport(r.employeeId, v), { invalidate, rethrow: true });
  const p = r.passport;
  return (
    <SectionCard
      title={t('onboarding.passportCustody')}
      action={
        r.canManage && (
          <Stack direction="row" spacing={1}>
            {!p && (
              <ActionFormButton<Record<string, unknown>>
                label={t('onboarding.receivePassport')}
                size="small"
                description={r.libyan ? t('onboarding.libyanPassportHint') : undefined}
                fields={[
                  { name: 'passportNumber', kind: 'text', label: t('fields.passportNumber'), half: true, maxLength: 50 },
                  { name: 'location', kind: 'text', label: t('onboarding.passportLocation'), half: true, maxLength: 200 },
                  { name: 'receivedOn', kind: 'date', label: t('onboarding.receivedOn'), required: true, half: true },
                  { name: 'handedBy', kind: 'text', label: t('onboarding.handedBy'), half: true, maxLength: 200 },
                  { name: 'receivedBy', kind: 'text', label: t('onboarding.receivedBy'), half: true, maxLength: 200 },
                  { name: 'notes', kind: 'textarea', label: t('common.notes'), maxLength: 500 },
                  { name: 'scan', kind: 'file', label: t('attachments.scan') },
                ]}
                defaultValues={{ passportNumber: r.passportNumber, receivedOn: todayIso(), handedBy: r.name }}
                onSubmit={(values, transfer) => receive.mutateAsync({ values, transfer })}
              />
            )}
            {p && p.status === 'Kept' && (
              <ActionFormButton<S<'RelocatePassportRequest'>>
                label={t('onboarding.relocatePassport')}
                size="small"
                fields={[{ name: 'location', kind: 'text', label: t('onboarding.passportLocation'), required: true, maxLength: 200 }]}
                defaultValues={{ location: p.location }}
                onSubmit={(v) => relocate.mutateAsync(v)}
              />
            )}
          </Stack>
        )
      }
    >
      {!p ? (
        <EmptyState title={t('onboarding.passportNotReceived')} />
      ) : (
        <Stack spacing={2}>
          <InfoGrid
            columns={2}
            items={[
              { label: t('fields.status'), value: <StatusChip enumName="PassportCustodyStatus" value={p.status} /> },
              { label: t('onboarding.passportLocation'), value: p.location },
            ]}
          />
          <List dense disablePadding>
            {p.movements.map((m) => (
              <ListItem key={`${m.kind}|${m.date}|${m.attachmentId ?? ''}|${m.handedBy ?? ''}`} divider secondaryAction={m.attachmentId ? <AttachmentButton attachmentId={m.attachmentId} icon /> : undefined}>
                <ListItemText
                  primaryTypographyProps={{ component: 'div' }}
                  secondaryTypographyProps={{ component: 'div' }}
                  primary={`${label('PassportMovementKind', m.kind)} · ${formatDate(m.date)}`}
                  secondary={[m.handedBy && `${t('onboarding.handedBy')}: ${m.handedBy}`, m.receivedBy && `${t('onboarding.receivedBy')}: ${m.receivedBy}`, m.notes].filter(Boolean).join(' · ')}
                />
              </ListItem>
            ))}
          </List>
        </Stack>
      )}
    </SectionCard>
  );
}

export function SurveyCard({ r }: { r: Rec }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const invalidate = useOnboardingInvalidation();
  const [showDetails, setShowDetails] = useState(false);
  const setApplicable = useApiMutation((v: { applicable: string }) => onboardingApi.setSurveyApplicability(r.employeeId, { applicable: v.applicable === 'true' }), { invalidate, rethrow: true });
  const review = useApiMutation(({ values, transfer }: UploadVars) => onboardingApi.reviewSurvey(r.employeeId, values, transfer), { invalidate: [...invalidate, [...onboardingKeys.all, 'survey', r.employeeId]], rethrow: true });
  const details = useQuery({
    queryKey: [...onboardingKeys.all, 'survey', r.employeeId],
    queryFn: () => onboardingApi.survey(r.employeeId),
    enabled: showDetails && r.canReviewSurvey,
  });
  const s = r.survey;
  return (
    <SectionCard
      title={t('onboarding.securitySurvey')}
      action={
        <Stack direction="row" spacing={1}>
          {r.canManage && (
            <ActionFormButton<{ applicable: string }>
              label={t('onboarding.surveyApplicability')}
              size="small"
              fields={[
                {
                  name: 'applicable',
                  kind: 'select',
                  label: t('onboarding.surveyApplies'),
                  required: true,
                  options: [
                    { value: 'true', label: t('onboarding.technicalWorkerYes') },
                    { value: 'false', label: t('onboarding.technicalWorkerNo') },
                  ],
                },
              ]}
              defaultValues={{ applicable: s.applicable === null || s.applicable === undefined ? '' : String(s.applicable) }}
              onSubmit={(v) => setApplicable.mutateAsync(v)}
            />
          )}
          {r.canReviewSurvey && s.applicable && (
            <ActionFormButton<Record<string, unknown>>
              label={t('onboarding.recordSurveyReview')}
              size="small"
              variant="contained"
              fields={[
                { name: 'outcome', kind: 'select', label: t('onboarding.surveyOutcome'), required: true, half: true, options: enumOptions('SurveyOutcome', ENUMS.SurveyOutcome) },
                { name: 'reviewedOn', kind: 'date', label: t('onboarding.reviewedOn'), required: true, half: true },
                { name: 'notes', kind: 'textarea', label: t('common.notes'), maxLength: 1000 },
                { name: 'scan', kind: 'file', label: t('attachments.scan') },
              ]}
              defaultValues={{ reviewedOn: todayIso() }}
              onSubmit={(values, transfer) => review.mutateAsync({ values, transfer })}
            />
          )}
        </Stack>
      }
    >
      <InfoGrid
        items={[
          { label: t('onboarding.surveyStage'), value: label('SurveyStage', s.stage) },
          { label: t('onboarding.surveyApplies'), value: s.applicable === null || s.applicable === undefined ? '—' : s.applicable ? t('common.yes') : t('common.no') },
          { label: t('onboarding.reviewed'), value: s.reviewedOn ? `${t('common.yes')} — ${formatDate(s.reviewedOn)}` : t('common.no') },
          { label: t('onboarding.reviewedBy'), value: s.reviewedBy },
        ]}
      />
      {r.canReviewSurvey && s.stage === 'Reviewed' && (
        <Box sx={{ mt: 2 }}>
          {!showDetails ? (
            <Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => setShowDetails(true)}>
              {t('onboarding.showSurveyResult')}
            </Button>
          ) : details.isLoading ? (
            <LoadingState minHeight={80} />
          ) : details.error ? (
            <ErrorState error={details.error} />
          ) : details.data?.unreadable ? (
            <Alert severity="info">{t('onboarding.surveyUnreadable')}</Alert>
          ) : (
            <Alert severity={details.data?.outcome === 'Accepted' ? 'success' : 'error'} action={details.data?.attachmentId ? <AttachmentButton attachmentId={details.data.attachmentId} /> : undefined}>
              <strong>{label('SurveyOutcome', details.data?.outcome)}</strong>
              {details.data?.notes && <div>{details.data.notes}</div>}
              <Typography variant="caption" display="block">
                {t('onboarding.accessLogged')}
              </Typography>
            </Alert>
          )}
        </Box>
      )}
    </SectionCard>
  );
}

export function AttachmentsCard({ r }: { r: Rec }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  if (!r.attachments.length) return null;
  return (
    <SectionCard title={t('onboarding.scans')} noPadding>
      <List dense>
        {r.attachments.map((a) => (
          <ListItem key={a.id} divider secondaryAction={<AttachmentButton attachmentId={a.id} icon />}>
            <ListItemText primary={`${label('LaborAttachmentKind', a.kind)} — ${a.fileName ?? ''}`} secondary={formatDateTime(a.createdAt)} />
          </ListItem>
        ))}
      </List>
    </SectionCard>
  );
}

export function SalaryCard({ employeeId }: { employeeId: number }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const key = [...onboardingKeys.all, 'salary', employeeId];
  const q = useQuery({ queryKey: key, queryFn: () => onboardingApi.salary(employeeId) });
  const invalidate = [...useOnboardingInvalidation(), key];
  const propose = useApiMutation((v: S<'ProposeSalaryRequest'>) => onboardingApi.proposeSalary(employeeId, v), { invalidate, rethrow: true });
  const revise = useApiMutation((v: S<'ReviseSalaryRequest'> & { id: number }) => onboardingApi.reviseSalary(v.id, v), { invalidate, rethrow: true });
  const decide = useApiMutation((v: S<'DecideSalaryRequest'> & { id: number }) => onboardingApi.decideSalary(v.id, v), { invalidate, rethrow: true });
  const cancel = useApiMutation((id: number) => onboardingApi.cancelSalary(id), { invalidate });
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (q.isLoading) return <SectionCard title={t('salary.title')}><LoadingState minHeight={100} /></SectionCard>;
  if (q.error) return <SectionCard title={t('salary.title')}><ErrorState error={q.error} /></SectionCard>;
  const d = q.data!;
  const open = d.open;
  const salaryFields = [
    { name: 'salary' as const, kind: 'number' as const, label: t('salary.salary'), required: true, half: true, min: 0 },
    { name: 'allowance' as const, kind: 'number' as const, label: t('salary.allowance'), required: true, half: true, min: 0 },
    { name: 'effectiveDate' as const, kind: 'date' as const, label: t('salary.effectiveDate'), required: true },
  ];
  return (
    <SectionCard
      title={t('salary.title')}
      action={
        <Stack direction="row" spacing={1}>
          {d.canPropose && (
            <ActionFormButton<S<'ProposeSalaryRequest'>> label={t('salary.propose')} size="small" variant="contained" fields={salaryFields} defaultValues={{ effectiveDate: d.startDate }} onSubmit={(v) => propose.mutateAsync(v)} />
          )}
        </Stack>
      }
    >
      <Stack spacing={2}>
        {open && (
          <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">{t('salary.openProposal')}</Typography>
              <StatusChip enumName="SalaryStatus" value={open.status} />
            </Stack>
            <InfoGrid
              columns={3}
              items={[
                { label: t('salary.salary'), value: formatMoney(open.salary) },
                { label: t('salary.allowance'), value: formatMoney(open.allowance) },
                { label: t('salary.effectiveDate'), value: formatDate(open.effectiveDate) },
              ]}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
              {d.canDecide && (
                <>
                  <ActionFormButton<{ note: string | null }>
                    label={t('workflow.approve')}
                    size="small"
                    variant="contained"
                    color="success"
                    fields={[{ name: 'note', kind: 'textarea', label: t('workflow.note'), maxLength: 500 }]}
                    onSubmit={(v) => decide.mutateAsync({ id: open.id, approve: true, note: v.note })}
                  />
                  <ActionFormButton<{ note: string | null }>
                    label={t('workflow.return')}
                    size="small"
                    color="warning"
                    fields={[{ name: 'note', kind: 'textarea', label: t('workflow.returnReason'), required: true, maxLength: 500 }]}
                    onSubmit={(v) => decide.mutateAsync({ id: open.id, approve: false, note: v.note })}
                  />
                </>
              )}
              {d.canRevise && (
                <ActionFormButton<S<'ReviseSalaryRequest'>>
                  label={t('salary.revise')}
                  size="small"
                  fields={salaryFields}
                  defaultValues={{ salary: open.salary, allowance: open.allowance, effectiveDate: open.effectiveDate }}
                  onSubmit={(v) => revise.mutateAsync({ ...v, id: open.id })}
                />
              )}
              {d.canCancel && (
                <Button size="small" color="error" onClick={() => setConfirmCancel(true)}>
                  {t('salary.cancel')}
                </Button>
              )}
            </Stack>
            <RefusalHint text={d.decisionRefusal} />
          </Box>
        )}
        {d.proposals.length === 0 ? (
          <EmptyState title={t('salary.none')} />
        ) : (
          <List dense disablePadding>
            {d.proposals.map((p) => (
              <ListItem key={p.id} divider alignItems="flex-start">
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <span>
                        {formatMoney(p.salary)} + {formatMoney(p.allowance)}
                      </span>
                      <StatusChip enumName="SalaryStatus" value={p.status} />
                      <Chip size="small" variant="outlined" label={label('SalaryReason', p.reason)} />
                    </Stack>
                  }
                  secondary={
                    <>
                      {t('salary.effectiveDate')}: {formatDate(p.effectiveDate)} · {p.proposedBy} · {formatDateTime(p.proposedAt)}
                      {p.rounds.map((rd) => (
                        <span key={rd.round} style={{ display: 'block' }}>
                          {t('workflow.round', { n: rd.round })}: {label('ApprovalDecision', rd.decision)} {rd.decidedBy ? `— ${rd.decidedBy}` : ''} {rd.note ? `(${rd.note})` : ''}
                        </span>
                      ))}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
      <ConfirmDialog
        open={confirmCancel}
        title={t('salary.cancel')}
        message={t('salary.cancelConfirm')}
        destructive
        loading={cancel.isPending}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => open && cancel.mutate(open.id, { onSettled: () => setConfirmCancel(false) })}
      />
    </SectionCard>
  );
}

export function StartApprovalCard({ employeeId }: { employeeId: number }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const key = [...onboardingKeys.all, 'startApproval', employeeId];
  const q = useQuery({ queryKey: key, queryFn: () => onboardingApi.startApproval(employeeId) });
  const invalidate = [...useOnboardingInvalidation(), key];
  const submit = useApiMutation(() => onboardingApi.submitStart(employeeId), { invalidate, success: t('startApproval.submitted') });
  const decide = useApiMutation((v: S<'DecideStartRequest'>) => onboardingApi.decideStart(employeeId, v), { invalidate, rethrow: true });

  if (q.isLoading) return <SectionCard title={t('startApproval.title')}><LoadingState minHeight={100} /></SectionCard>;
  if (q.error) return <SectionCard title={t('startApproval.title')}><ErrorState error={q.error} /></SectionCard>;
  const d = q.data!;
  return (
    <SectionCard
      title={t('startApproval.title')}
      action={
        d.canSubmit && (
          <Button size="small" variant="contained" onClick={() => submit.mutate(undefined)} disabled={submit.isPending}>
            {t('startApproval.submit')}
          </Button>
        )
      }
    >
      <Stack spacing={2}>
        {d.waitingParty && (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2">{t('workflow.waitingFor')}:</Typography>
            <Chip size="small" label={label('LaborParty', d.waitingParty)} color="primary" variant="outlined" />
            <Typography variant="caption" color="text.secondary">
              {t('workflow.since', { date: formatDateTime(d.waitingSince) })}
            </Typography>
            {d.delayed && <ToneChip tone="error" label={t('startApproval.delayed', { days: d.delayDays })} />}
          </Stack>
        )}
        {d.parties.map((p) => (
          <Box key={p.party}>
            {p.refusal ? (
              <RefusalHint text={`${label('LaborParty', p.party)}: ${p.refusal}`} />
            ) : (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <DecideButtons party={p.party} onDecide={(approve, note) => decide.mutateAsync({ party: p.party, approve, note })} />
              </Stack>
            )}
          </Box>
        ))}
        <ApprovalRounds rounds={d.rounds} />
      </Stack>
    </SectionCard>
  );
}

function DecideButtons({ party, onDecide }: { party: LaborParty; onDecide: (approve: boolean, note: string | null) => Promise<unknown> }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  return (
    <>
      <ActionFormButton<{ note: string | null }>
        label={t('workflow.approveAs', { party: label('LaborParty', party) })}
        size="small"
        variant="contained"
        color="success"
        fields={[{ name: 'note', kind: 'textarea', label: t('workflow.note'), maxLength: 500 }]}
        onSubmit={(v) => onDecide(true, v.note)}
      />
      <ActionFormButton<{ note: string | null }>
        label={t('workflow.returnForCorrection')}
        size="small"
        color="warning"
        description={t('startApproval.returnHint')}
        fields={[{ name: 'note', kind: 'textarea', label: t('workflow.returnReason'), required: true, maxLength: 500 }]}
        onSubmit={(v) => onDecide(false, v.note)}
      />
    </>
  );
}

export function NoticeCard({ employeeId }: { employeeId: number }) {
  const { t } = useTranslation();
  const key = [...onboardingKeys.all, 'notice', employeeId];
  const q = useQuery({ queryKey: key, queryFn: () => onboardingApi.onboardingNotice(employeeId) });
  const invalidate = [...useOnboardingInvalidation(), key];
  const deliver = useApiMutation((v: S<'RecordNoticeDeliveryRequest'> & { id: number }) => payrollApi.recordDelivery(v.id, v), { invalidate, rethrow: true });
  const confirm = useApiMutation((id: number) => payrollApi.confirm(id), { invalidate, success: t('payroll.confirmed') });

  const notFound = axios.isAxiosError(q.error) && q.error.response?.status === 404;
  return (
    <SectionCard title={t('payroll.onboardingNotice')}>
      {q.isLoading ? (
        <LoadingState minHeight={80} />
      ) : notFound || (!q.error && !q.data) ? (
        <EmptyState title={t('payroll.noNoticeYet')} />
      ) : q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <Stack spacing={2}>
          <InfoGrid
            columns={2}
            items={[
              { label: t('fields.status'), value: <StatusChip enumName="PayrollNoticeStatus" value={q.data!.status} /> },
              { label: t('payroll.effectiveDate'), value: formatDate(q.data!.effectiveDate) },
              { label: t('salary.salary'), value: formatMoney(q.data!.salary) },
              { label: t('salary.allowance'), value: formatMoney(q.data!.allowance) },
              { label: t('payroll.deliveredOn'), value: q.data!.deliveredOn ? `${formatDate(q.data!.deliveredOn)} — ${q.data!.deliveredBy ?? ''}` : '—' },
              { label: t('payroll.confirmedAt'), value: q.data!.confirmedAt ? `${formatDateTime(q.data!.confirmedAt)} — ${q.data!.confirmedBy ?? ''}` : '—' },
            ]}
          />
          <Stack direction="row" spacing={1}>
            {q.data!.canRecordDelivery && (
              <ActionFormButton<S<'RecordNoticeDeliveryRequest'>>
                label={t('payroll.recordDelivery')}
                size="small"
                variant="contained"
                fields={[
                  { name: 'deliveredOn', kind: 'date', label: t('payroll.deliveredOn'), required: true, half: true },
                  { name: 'deliveredBy', kind: 'text', label: t('payroll.deliveredBy'), half: true, maxLength: 200 },
                ]}
                defaultValues={{ deliveredOn: todayIso() }}
                onSubmit={(v) => deliver.mutateAsync({ ...v, id: q.data!.id })}
              />
            )}
            {q.data!.canConfirm && (
              <Button size="small" variant="contained" color="success" onClick={() => confirm.mutate(q.data!.id)} disabled={confirm.isPending}>
                {t('payroll.confirmReceipt')}
              </Button>
            )}
          </Stack>
        </Stack>
      )}
    </SectionCard>
  );
}
