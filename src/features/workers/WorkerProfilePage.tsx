import { useState } from 'react';
import { Box, Button, Card, CardContent, Grid2 as Grid, Stack, Tab, Tabs, Typography, List, ListItem, ListItemText, Alert } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/providers/authContext';
import { ACTION_PERMISSIONS } from '@/constants/permissions';
import { workersApi, workersKeys } from './api';
import { leavesApi, leavesKeys } from '@/features/leaves/api';
import { registrationApi } from '@/features/registration/api';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary, EmptyState, LoadingState, ErrorState } from '@/components/common/States';
import { InfoGrid } from '@/components/common/InfoGrid';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusChip, ToneChip } from '@/components/common/StatusChip';
import { AttachmentButton } from '@/components/common/FileButtons';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { FormDialog, type FieldConfig } from '@/components/forms/FormDialog';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { formatDate, formatMoney, formatBytes, formatDateTime, todayIso } from '@/utils/format';
import { penaltiesApi, penaltiesKeys } from '@/features/penalties/api';
import { usePenaltyDecisionTypes } from '@/features/penalties/decisionTypes';
import { identityPassportIssues, type IdentityIssue } from './identityRules';
import { useHealthCertificateForm, type HealthCertificateValues } from './healthCertificate';
import { onboardingKeys } from '@/features/onboarding/api';
import { useTabParam } from '@/hooks/useTabParam';
import type { S } from '@/types/api';
import type { UploadVars } from '@/services/api/client';

type Worker = S<'LaborWorkerDetails'>;

const PROFILE_TABS = ['overview', 'timeline', 'leaves', 'penalties', 'attachments'] as const;

export default function WorkerProfilePage() {
  const { t } = useTranslation();
  const employeeId = Number(useParams().employeeId);
  const query = useQuery({ queryKey: workersKeys.detail(employeeId), queryFn: () => workersApi.get(employeeId) });
  const [tab, setTab] = useTabParam(PROFILE_TABS, 'overview');

  return (
    <QueryBoundary query={query}>
      {(w) => (
        <Box>
          <PageHeader
            title={w.name ?? String(w.employeeNumber)}
            subtitle={`${t('fields.employeeNumber')}: ${w.employeeNumber} · ${[w.jobName, w.trackName, w.workSiteName].filter(Boolean).join(' · ')}`}
            breadcrumbs={[{ label: t('nav.items.workers'), to: '/workers' }]}
            meta={
              <Stack direction="row" spacing={1}>
                <StatusChip enumName="LaborStatus" value={w.status} />
                {w.onLeave && <ToneChip tone="warning" label={t('workers.onLeave')} />}
                {w.serviceEnded && <ToneChip tone="neutral" label={t('workers.serviceEnded')} />}
              </Stack>
            }
            actions={<WorkerActions worker={w} />}
          />
          <Tabs value={tab} onChange={(_, v: (typeof PROFILE_TABS)[number]) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }} variant="scrollable" allowScrollButtonsMobile>
            {PROFILE_TABS.map((key) => (
              <Tab key={key} value={key} label={t(`workers.tabs.${key}`)} />
            ))}
          </Tabs>
          {tab === 'overview' && <Overview w={w} />}
          {tab === 'timeline' && <Timeline w={w} />}
          {tab === 'leaves' && <WorkerLeaves employeeId={employeeId} />}
          {tab === 'penalties' && <WorkerPenalties employeeId={employeeId} />}
          {tab === 'attachments' && <Attachments employeeId={employeeId} />}
        </Box>
      )}
    </QueryBoundary>
  );
}

function WorkerActions({ worker: w }: { worker: Worker }) {
  const { t } = useTranslation();
  // returnTo: the create forms send the user back to this worker when they finish or cancel.
  const q = `?employeeId=${w.employeeId}&employeeNumber=${w.employeeNumber}&returnTo=${encodeURIComponent(`/workers/${w.employeeId}`)}`;
  const active = !w.serviceEnded;
  const { can } = useAuth();
  return (
    <>
      <Button component={RouterLink} to={`/workers/${w.employeeId}/onboarding`} variant="contained">
        {t('workers.onboardingRecord')}
      </Button>
      {active && (
        <>
          {can(ACTION_PERMISSIONS.createLeave) && (
            <Button component={RouterLink} to={`/leaves/new${q}`} variant="outlined">
              {t('leaves.new')}
            </Button>
          )}
          {can(ACTION_PERMISSIONS.createTransfer) && (
            <Button component={RouterLink} to={`/transfers/new${q}`} variant="outlined">
              {t('transfers.new')}
            </Button>
          )}
          {can(ACTION_PERMISSIONS.createPenalty) && (
            <Button component={RouterLink} to={`/penalties/new${q}`} variant="outlined">
              {t('penalties.new')}
            </Button>
          )}
          {can(ACTION_PERMISSIONS.createEvaluation) && (
            <Button component={RouterLink} to={`/evaluations/new${q}`} variant="outlined">
              {t('evaluations.new')}
            </Button>
          )}
          {can(ACTION_PERMISSIONS.createTermination) && (
            <Button component={RouterLink} to={`/terminations/new${q}`} variant="outlined" color="error">
              {t('terminations.new')}
            </Button>
          )}
        </>
      )}
    </>
  );
}

function Overview({ w }: { w: Worker }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const [editOpen, setEditOpen] = useState(false);
  const { can } = useAuth();
  const canCorrect = can(ACTION_PERMISSIONS.correctIdentity);
  const canRenewCertificate = can(ACTION_PERMISSIONS.renewHealthCertificate) && !w.serviceEnded;
  const yes = t('common.yes');
  const no = t('common.no');
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Stack spacing={3}>
          <SectionCard
            title={t('workers.identity')}
            action={
              (canCorrect || canRenewCertificate) && (
                <Stack direction="row" spacing={1}>
                  {canRenewCertificate && <RenewHealthCertificateButton employeeId={w.employeeId} />}
                  {canCorrect && (
                    <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => setEditOpen(true)}>
                      {t('workers.editIdentity')}
                    </Button>
                  )}
                </Stack>
              )
            }
          >
            <InfoGrid
              items={[
                { label: t('fields.employeeNumber'), value: w.employeeNumber },
                { label: t('fields.name'), value: w.name },
                { label: t('fields.gender'), value: label('Gender', w.gender) },
                { label: t('fields.nationality'), value: w.nationalityName },
                { label: t('fields.passportNumber'), value: w.passportNumber },
                { label: t('fields.passportIssueDate'), value: formatDate(w.passportIssueDate) },
                { label: t('fields.passportExpiryDate'), value: formatDate(w.passportExpiryDate) },
                { label: t('fields.nationalNumber'), value: w.nationalNumber },
                { label: t('fields.idCardNumber'), value: w.idCardNumber },
                { label: t('fields.birthDate'), value: formatDate(w.birthDate) },
                { label: t('fields.phone'), value: w.phoneNumber },
                { label: t('fields.management'), value: w.managementName },
                { label: t('fields.department'), value: w.departmentName },
                { label: t('fields.healthCertificateIssueDate'), value: formatDate(w.healthCertificateIssueDate) },
                { label: t('fields.healthCertificateExpiry'), value: formatDate(w.healthCertificateExpiryDate) },
              ]}
            />
            {w.passportWaiverReason && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {t('workers.registeredWithoutPassport', { reason: w.passportWaiverReason })}
              </Alert>
            )}
          </SectionCard>
          <SectionCard title={t('workers.file')}>
            <InfoGrid
              items={[
                { label: t('fields.track'), value: w.trackName },
                { label: t('fields.workSite'), value: w.workSiteName },
                { label: t('fields.job'), value: w.jobName },
                { label: t('fields.status'), value: <StatusChip enumName="LaborStatus" value={w.status} /> },
                { label: t('fields.statusDate'), value: formatDate(w.statusDate) },
                { label: t('fields.origin'), value: label('LaborFileOrigin', w.origin) },
                { label: t('fields.startDate'), value: formatDate(w.startDate) },
                { label: t('workers.serviceEnded'), value: w.serviceEnded ? `${yes} — ${formatDate(w.serviceEndDate)}` : no },
              ]}
            />
          </SectionCard>
          <SectionCard
            title={t('workers.onboarding')}
            action={
              <Button size="small" component={RouterLink} to={`/workers/${w.employeeId}/onboarding`}>
                {t('common.open')}
              </Button>
            }
          >
            <InfoGrid
              items={[
                { label: t('onboarding.status'), value: <StatusChip enumName="OnboardingStatus" value={w.onboarding.status} /> },
                { label: t('onboarding.reportedStartDate'), value: formatDate(w.onboarding.reportedStartDate) },
                { label: t('onboarding.startDate'), value: formatDate(w.onboarding.startDate) },
                { label: t('onboarding.documentsDue'), value: formatDate(w.onboarding.documentsDueDate) },
                { label: t('onboarding.survey'), value: label('SurveyStage', w.onboarding.survey) },
                { label: t('onboarding.passport'), value: w.onboarding.passportStatus ? `${label('PassportCustodyStatus', w.onboarding.passportStatus)}${w.onboarding.passportLocation ? ` — ${w.onboarding.passportLocation}` : ''}` : '—' },
              ]}
            />
            {w.onboarding.documentsOverdue && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {t('onboarding.documentsOverdue')}
              </Alert>
            )}
            {w.onboarding.checklist.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                {w.onboarding.checklist.map((c) => (
                  <Box key={c.item} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="body2">{c.name ?? label('ChecklistItem', c.item)}</Typography>
                    <StatusChip enumName="ChecklistState" value={c.state} />
                  </Box>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Stack spacing={3}>
          <SectionCard title={t('workers.permit')}>
            {w.permit ? (
              <InfoGrid
                columns={2}
                items={[
                  { label: t('permits.number'), value: w.permit.number },
                  { label: t('fields.workSite'), value: w.permit.workSiteName },
                  { label: t('permits.issuedOn'), value: formatDate(w.permit.issuedOn) },
                  { label: t('permits.validUntil'), value: formatDate(w.permit.validUntil) },
                  { label: t('fields.status'), value: <StatusChip enumName="EntryPermitStatus" value={w.permit.status} /> },
                  { label: t('permits.expired'), value: w.permit.expired ? yes : no },
                ]}
              />
            ) : (
              <EmptyState title={t('workers.noPermit')} />
            )}
            {w.earlierPermitCount > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {t('workers.earlierPermits', { count: w.earlierPermitCount })}
              </Typography>
            )}
          </SectionCard>
          {w.salaryVisible && (
            <SectionCard title={t('workers.approvedSalary')}>
              {w.approvedSalary ? (
                <InfoGrid
                  columns={2}
                  items={[
                    { label: t('salary.salary'), value: formatMoney(w.approvedSalary.salary) },
                    { label: t('salary.allowance'), value: formatMoney(w.approvedSalary.allowance) },
                    { label: t('salary.effectiveDate'), value: formatDate(w.approvedSalary.effectiveDate) },
                    { label: t('salary.reason'), value: label('SalaryReason', w.approvedSalary.reason) },
                  ]}
                />
              ) : (
                <EmptyState title={t('workers.noSalary')} />
              )}
            </SectionCard>
          )}
          {w.candidate && (
            <SectionCard title={t('workers.candidate')}>
              <InfoGrid
                columns={2}
                items={[
                  {
                    label: t('staffing.request'),
                    value: w.candidate.requestNumber ? <RouterLink to={`/staffing-requests/${w.candidate.requestNumber}`}>{w.candidate.requestNumber}</RouterLink> : '—',
                  },
                  { label: t('candidates.nominatedBy'), value: w.candidate.nominatedBy },
                  { label: t('candidates.recruitedBy'), value: label('LaborParty', w.candidate.recruitedBy) },
                  { label: t('candidates.approvedAt'), value: formatDateTime(w.candidate.approvedAt) },
                ]}
              />
            </SectionCard>
          )}
        </Stack>
      </Grid>
      <IdentityDialog worker={w} open={editOpen} onClose={() => setEditOpen(false)} />
    </Grid>
  );
}

function IdentityDialog({ worker: w, open, onClose }: { worker: Worker; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const enumOptions = useEnumOptions();
  const opts = useQuery({ queryKey: ['registration', 'options'], queryFn: registrationApi.options, enabled: open, staleTime: 600_000 });
  const mutation = useApiMutation((body: S<'UpdateEmployeeIdentityRequest'>) => workersApi.updateIdentity(w.employeeId, body), {
    invalidate: [workersKeys.all],
    rethrow: true,
  });
  if (!open) return null;
  if (opts.isLoading) return null;
  const o = opts.data;
  const toOpt = (x: { id: number; name: string | null }) => ({ value: x.id, label: x.name ?? String(x.id) });
  const nationalityId = o?.nationalities.find((n) => n.name === w.nationalityName)?.id;
  const departmentId = o?.departments.find((d) => d.name === w.departmentName)?.id;
  const libyanIds = new Set(o?.libyanNationalityIds ?? []);
  const fields: FieldConfig<S<'UpdateEmployeeIdentityRequest'>>[] = [
    { name: 'name', kind: 'text', label: t('fields.name'), required: true, maxLength: 200 },
    { name: 'gender', kind: 'select', label: t('fields.gender'), required: true, half: true, options: enumOptions('Gender', ENUMS.Gender) },
    { name: 'maritalStatus', kind: 'select', label: t('fields.maritalStatus'), required: true, half: true, options: enumOptions('MaritalStatus', ENUMS.MaritalStatus) },
    { name: 'nationalityId', kind: 'select', label: t('fields.nationality'), required: true, half: true, options: (o?.nationalities ?? []).map(toOpt) },
    { name: 'birthPlaceId', kind: 'select', label: t('fields.birthPlace'), half: true, options: (o?.cities ?? []).map(toOpt) },
    { name: 'birthDate', kind: 'date', label: t('fields.birthDate'), half: true },
    { name: 'departmentId', kind: 'select', label: t('fields.department'), half: true, options: (o?.departments ?? []).map(toOpt) },
    { name: 'passportNumber', kind: 'text', label: t('fields.passportNumber'), half: true },
    { name: 'nationalNumber', kind: 'number', label: t('fields.nationalNumber'), half: true },
    { name: 'passportIssueDate', kind: 'date', label: t('fields.passportIssueDate'), half: true, max: todayIso() },
    { name: 'passportExpiryDate', kind: 'date', label: t('fields.passportExpiryDate'), half: true },
    { name: 'idCardNumber', kind: 'text', label: t('fields.idCardNumber'), half: true },
    { name: 'phoneNumber', kind: 'text', label: t('fields.phone'), half: true },
  ];
  return (
    <FormDialog<S<'UpdateEmployeeIdentityRequest'>>
      open={open}
      onClose={onClose}
      title={t('workers.editIdentity')}
      description={t('workers.editIdentityHint')}
      maxWidth="md"
      fields={fields}
      defaultValues={{
        name: w.name,
        gender: w.gender,
        nationalityId,
        departmentId,
        passportNumber: w.passportNumber,
        // TL-N4: the request replaces the identity, so the recorded passport dates are always sent back.
        passportIssueDate: w.passportIssueDate,
        passportExpiryDate: w.passportExpiryDate,
        nationalNumber: w.nationalNumber,
        idCardNumber: w.idCardNumber,
        phoneNumber: w.phoneNumber,
        birthDate: w.birthDate,
      }}
      validate={(v) => {
        const issues = identityPassportIssues(v, w, { libyanIds });
        const text = (issue: IdentityIssue) => (issue === 'required' || issue === 'expiryAfterIssue' ? t(`validation.${issue}`) : t(`workers.${issue}`));
        return Object.fromEntries(Object.entries(issues).map(([field, issue]) => [field, text(issue)]));
      }}
      onSubmit={(v) => mutation.mutateAsync(v)}
    />
  );
}

/** The worker's penalties (TL-N5 `employeeId` filter), newest first as listed by the API. */
function WorkerPenalties({ employeeId }: { employeeId: number }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const navigate = useNavigate();
  const decisions = usePenaltyDecisionTypes();
  const params = { EmployeeId: employeeId, PageSize: 100 };
  const q = useQuery({ queryKey: penaltiesKeys.list(params), queryFn: ({ signal }) => penaltiesApi.list(params, signal) });
  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const rows = q.data?.page.items ?? [];
  type Row = S<'PenaltyListItem'>;
  return (
    <Stack spacing={1.5}>
      <Box>
        <Button component={RouterLink} to={`/penalties?EmployeeId=${employeeId}`} size="small">
          {t('workers.openInPenalties')}
        </Button>
      </Box>
      <LocalDataGrid<Row>
        rows={rows}
        getRowId={(r) => r.penaltyId}
        onRowClick={(r) => navigate(`/penalties/${r.penaltyId}`)}
        emptyText={t('workers.noPenalties')}
        columns={[
          { field: 'violation', headerName: t('penalties.violation'), width: 170, valueFormatter: (v: string) => label('PenaltyViolation', v) },
          col.text<Row>('violationDates', t('penalties.violationDates')),
          col.text<Row>('issuedBy', t('penalties.issuedBy')),
          col.date<Row>('issuedOn', t('penalties.issuedOn')),
          { field: 'decision', headerName: t('penalties.decision'), width: 150, valueFormatter: (v: unknown) => decisions.label(v) },
          col.num<Row>('deductedDays', t('penalties.deductedDays')),
          col.status<Row>('status', t('fields.status'), 'PenaltyStatus', { width: 130 }),
        ]}
      />
    </Stack>
  );
}

function Timeline({ w }: { w: Worker }) {
  const { t } = useTranslation();
  if (!w.timeline.length) return <EmptyState title={t('workers.noEvents')} />;
  const events = [...w.timeline].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <Card>
      <List disablePadding>
        {events.map((e) => (
          <ListItem key={`${e.date}|${e.kind ?? ''}|${e.title ?? ''}|${e.attachmentId ?? ''}`} divider secondaryAction={e.attachmentId ? <AttachmentButton attachmentId={e.attachmentId} icon /> : undefined}>
            <Box sx={{ width: 110, flexShrink: 0, color: 'text.secondary', fontSize: '0.8rem' }}>{formatDate(e.date)}</Box>
            <ListItemText
              primary={e.href && e.href.startsWith('/') ? <RouterLink to={e.href}>{e.title}</RouterLink> : e.title}
              secondary={e.details}
              primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
            />
          </ListItem>
        ))}
      </List>
    </Card>
  );
}

function WorkerLeaves({ employeeId }: { employeeId: number }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: leavesKeys.history(employeeId), queryFn: () => leavesApi.history(employeeId) });
  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} />;
  const h = q.data!;
  type L = S<'LeaveHistoryItem'>;
  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('leaves.takenCount')}
              </Typography>
              <Typography variant="h6">{h.takenCount}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('leaves.takenDays')}
              </Typography>
              <Typography variant="h6">{h.takenDays}</Typography>
            </Box>
            {h.byType.map((b) => (
              <Box key={b.type}>
                <Typography variant="caption" color="text.secondary">
                  {label('LeaveType', b.type)}
                </Typography>
                <Typography variant="h6">
                  {b.count} / {b.days} {t('common.days')}
                </Typography>
              </Box>
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {t('leaves.noBalances')}
          </Typography>
        </CardContent>
      </Card>
      <LocalDataGrid<L>
        rows={h.leaves}
        getRowId={(r) => r.id}
        onRowClick={(r) => navigate(`/leaves/${r.id}`)}
        columns={[
          col.status<L>('type', t('leaves.type'), 'LeaveType'),
          col.date<L>('fromDate', t('common.from')),
          col.date<L>('toDate', t('common.to')),
          col.num<L>('days', t('common.days')),
          col.bool<L>('requiresTravel', t('leaves.travel'), t('common.yes'), t('common.no')),
          col.status<L>('status', t('fields.status'), 'LeaveStatus'),
          col.date<L>('resumedOn', t('leaves.resumedOn')),
        ]}
      />
    </Stack>
  );
}

function Attachments({ employeeId }: { employeeId: number }) {
  const { t } = useTranslation();
  const enumOptions = useEnumOptions();
  const q = useQuery({ queryKey: workersKeys.attachments(employeeId), queryFn: () => workersApi.attachments(employeeId) });
  type AttachValues = { kind: string; recordReference: string | null; scan: File | null };
  const attach = useApiMutation(({ values, transfer }: UploadVars<AttachValues>) => workersApi.attachForm(employeeId, values, transfer), {
    invalidate: [workersKeys.all],
    rethrow: true,
  });
  type A = S<'WorkerAttachmentItem'>;
  return (
    <Stack spacing={2}>
      <Box>
        <ActionFormButton<{ kind: string; recordReference: string | null; scan: File | null }>
          label={t('workers.attachForm')}
          startIcon={<UploadFileOutlinedIcon />}
          variant="contained"
          description={t('workers.attachFormHint')}
          fields={[
            { name: 'kind', kind: 'select', label: t('attachments.kind'), required: true, options: enumOptions('LaborAttachmentKind', ENUMS.LaborAttachmentKind) },
            { name: 'recordReference', kind: 'text', label: t('attachments.recordReference'), maxLength: 100 },
            { name: 'scan', kind: 'file', label: t('attachments.file'), required: true },
          ]}
          onSubmit={(values, transfer) => attach.mutateAsync({ values, transfer })}
        />
      </Box>
      {q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <LocalDataGrid<A>
          rows={q.data ?? []}
          loading={q.isLoading}
          getRowId={(r) => r.id}
          columns={[
            col.text<A>('kindName', t('attachments.kind')),
            col.text<A>('fileName', t('attachments.fileName'), { flex: 1.5 }),
            col.text<A>('recordReference', t('attachments.recordReference')),
            { field: 'size', headerName: t('attachments.size'), width: 100, valueFormatter: (v: number) => formatBytes(v) },
            col.dateTime<A>('createdAt', t('common.createdAt')),
            {
              field: 'open',
              headerName: '',
              width: 130,
              sortable: false,
              renderCell: (p) =>
                p.row.isPurged ? (
                  <Typography variant="caption" color="text.secondary">
                    {t('attachments.purged')}
                  </Typography>
                ) : (
                  <AttachmentButton attachmentId={p.row.id} />
                ),
            },
          ]}
        />
      )}
    </Stack>
  );
}

/** TL-N14: a renewed health certificate is received as a new document; the worker file then shows its dates. */
function RenewHealthCertificateButton({ employeeId }: { employeeId: number }) {
  const { t } = useTranslation();
  const { fields, validate } = useHealthCertificateForm();
  const renew = useApiMutation(({ values, transfer }: UploadVars) => workersApi.renewHealthCertificate(employeeId, values, transfer), {
    invalidate: [workersKeys.all, onboardingKeys.record(employeeId)],
    rethrow: true,
    success: t('onboarding.healthCertificateRenewed'),
  });
  return (
    <ActionFormButton<HealthCertificateValues>
      label={t('onboarding.renewHealthCertificate')}
      size="small"
      startIcon={<UploadFileOutlinedIcon />}
      fields={fields}
      defaultValues={{ receivedOn: todayIso() }}
      validate={validate}
      onSubmit={(values, transfer) => renew.mutateAsync({ values: { ...values }, transfer })}
    />
  );
}
