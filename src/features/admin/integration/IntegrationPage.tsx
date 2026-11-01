import { useState } from 'react';
import { Alert, Box, Button, FormControlLabel, Paper, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material';
import { brand } from '@/app/theme/brand';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminKeys, integrationApi } from '../api';
import { attendanceApi } from '@/features/attendance/api';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/tables/FilterBar';
import { LocalDataGrid, ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { SelectField } from '@/components/forms/SelectField';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { col } from '@/components/tables/columns';
import { useListState } from '@/hooks/useListState';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { parseCsv } from '@/utils/csv';
import type { Q, S } from '@/types/api';

const TABS = ['events', 'log', 'workers', 'device', 'migration'] as const;

export default function IntegrationPage() {
  const { t } = useTranslation();
  const [sp, setSp] = useSearchParams();
  const tab = TABS.includes(sp.get('tab') as (typeof TABS)[number]) ? (sp.get('tab') as (typeof TABS)[number]) : 'events';
  return (
    <Box>
      <PageHeader title={t('nav.items.integration')} subtitle={t('integration.subtitle')} />
      <Tabs value={tab} onChange={(_, v: string) => setSp({ tab: v }, { replace: true })} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((x) => (
          <Tab key={x} value={x} label={t(`integration.tabs.${x}`)} />
        ))}
      </Tabs>
      {tab === 'events' && <EventsTab />}
      {tab === 'log' && <LogTab />}
      {tab === 'workers' && <WorkersTab />}
      {tab === 'device' && <DeviceTab />}
      {tab === 'migration' && <MigrationTab />}
    </Box>
  );
}

type Ev = S<'IntegrationEventItem'>;
function EventsTab() {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const list = useListState({ State: '', Kind: '', tab: 'events' });
  const params = { State: list.filters.State, Kind: list.filters.Kind, Page: list.page, PageSize: list.pageSize } as unknown as Q<'ListIntegrationEvents'>;
  const q = useQuery({ queryKey: [...adminKeys.integration, 'events', params], queryFn: () => integrationApi.events(params), placeholderData: keepPreviousData });
  const ack = useApiMutation((v: S<'AcknowledgeIntegrationEventRequest'> & { id: number }) => integrationApi.acknowledge(v.id, v), { invalidate: [adminKeys.integration], rethrow: true });
  const fail = useApiMutation((v: S<'ReportIntegrationFailureRequest'> & { id: number }) => integrationApi.failure(v.id, v), { invalidate: [adminKeys.integration], rethrow: true });
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t('integration.eventsHint')}
      </Typography>
      <FilterBar onReset={() => list.setFilters({ State: '', Kind: '', tab: 'events' })}>
        <SelectField label={t('integration.state')} value={list.filters.State} options={enumOptions('IntegrationEventState', ENUMS.IntegrationEventState)} onChange={(v) => list.setFilter('State', v)} />
        <SelectField label={t('payroll.kind')} value={list.filters.Kind} options={enumOptions('PayrollNoticeKind', ENUMS.PayrollNoticeKind)} onChange={(v) => list.setFilter('Kind', v)} />
      </FilterBar>
      <ServerDataGrid<Ev>
        data={q.data}
        loading={q.isFetching}
        error={q.error}
        getRowId={(r) => r.noticeId}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        columns={[
          col.text<Ev>('reference', t('integration.reference'), { minWidth: 160 }),
          { field: 'kind', headerName: t('payroll.kind'), width: 130, valueFormatter: (v: string) => label('PayrollNoticeKind', v) },
          col.num<Ev>('employeeNumber', t('fields.employeeNumber')),
          col.text<Ev>('employeeName', t('fields.name')),
          col.date<Ev>('effectiveDate', t('payroll.effectiveDate')),
          col.status<Ev>('state', t('integration.state'), 'IntegrationEventState', { width: 120 }),
          col.text<Ev>('externalReference', t('integration.externalReference')),
          col.text<Ev>('lastError', t('integration.lastError')),
          {
            field: 'actions',
            headerName: '',
            width: 220,
            sortable: false,
            renderCell: (p) =>
              p.row.state !== 'Acknowledged' && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
                  <ActionFormButton<S<'AcknowledgeIntegrationEventRequest'>>
                    label={t('integration.acknowledge')}
                    size="small"
                    fields={[{ name: 'externalReference', kind: 'text', label: t('integration.externalReference'), maxLength: 200 }]}
                    onSubmit={(v) => ack.mutateAsync({ ...v, id: p.row.noticeId })}
                  />
                  <ActionFormButton<S<'ReportIntegrationFailureRequest'>>
                    label={t('integration.reportFailure')}
                    size="small"
                    color="error"
                    fields={[
                      { name: 'error', kind: 'textarea', label: t('integration.error'), required: true, maxLength: 2000 },
                      { name: 'externalReference', kind: 'text', label: t('integration.externalReference'), maxLength: 200 },
                    ]}
                    onSubmit={(v) => fail.mutateAsync({ ...v, id: p.row.noticeId })}
                  />
                </Stack>
              ),
          },
        ]}
      />
    </Box>
  );
}

type Log = S<'IntegrationLogItem'>;
function LogTab() {
  const { t } = useTranslation();
  const enumOptions = useEnumOptions();
  const list = useListState({ Outcome: '', NoticeId: '', tab: 'log' });
  const params = { Outcome: list.filters.Outcome, NoticeId: list.filters.NoticeId, Page: list.page, PageSize: list.pageSize } as unknown as Q<'ListIntegrationLog'>;
  const q = useQuery({ queryKey: [...adminKeys.integration, 'log', params], queryFn: () => integrationApi.log(params), placeholderData: keepPreviousData });
  return (
    <Box>
      <FilterBar onReset={() => list.setFilters({ Outcome: '', NoticeId: '', tab: 'log' })}>
        <SelectField label={t('integration.outcome')} value={list.filters.Outcome} options={enumOptions('IntegrationOutcome', ENUMS.IntegrationOutcome)} onChange={(v) => list.setFilter('Outcome', v)} />
        <TextField type="number" label={t('integration.noticeId')} value={list.filters.NoticeId} onChange={(e) => list.setFilter('NoticeId', e.target.value)} />
      </FilterBar>
      <ServerDataGrid<Log>
        data={q.data}
        loading={q.isFetching}
        error={q.error}
        getRowId={(r) => r.id}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        columns={[
          col.dateTime<Log>('createdAt', t('common.createdAt')),
          col.text<Log>('reference', t('integration.reference')),
          col.num<Log>('noticeId', t('integration.noticeId')),
          col.status<Log>('outcome', t('integration.outcome'), 'IntegrationOutcome', { width: 120 }),
          col.text<Log>('externalReference', t('integration.externalReference')),
          col.text<Log>('error', t('integration.error'), { flex: 2 }),
        ]}
      />
    </Box>
  );
}

type W = S<'IntegrationWorkerItem'>;
function WorkersTab() {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const list = useListState({ ChangedSince: '', tab: 'workers' });
  const params = { ChangedSince: list.filters.ChangedSince ? new Date(list.filters.ChangedSince).toISOString() : undefined, Page: list.page, PageSize: list.pageSize } as unknown as Q<'ListIntegrationWorkers'>;
  const q = useQuery({ queryKey: [...adminKeys.integration, 'workers', params], queryFn: () => integrationApi.workers(params), placeholderData: keepPreviousData });
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t('integration.workersHint')}
      </Typography>
      <FilterBar onReset={() => list.setFilters({ ChangedSince: '', tab: 'workers' })}>
        <TextField type="datetime-local" label={t('integration.changedSince')} value={list.filters.ChangedSince} onChange={(e) => list.setFilter('ChangedSince', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </FilterBar>
      <ServerDataGrid<W>
        data={q.data}
        loading={q.isFetching}
        error={q.error}
        getRowId={(r) => r.employeeNumber}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        columns={[
          col.num<W>('employeeNumber', t('fields.employeeNumber')),
          col.text<W>('name', t('fields.name'), { minWidth: 160 }),
          col.text<W>('nationality', t('fields.nationality')),
          col.text<W>('job', t('fields.job')),
          col.text<W>('workSite', t('fields.workSite')),
          { field: 'status', headerName: t('fields.status'), width: 120, valueFormatter: (v: string) => label('LaborStatus', v) },
          col.date<W>('startDate', t('fields.startDate')),
          col.text<W>('salary', t('salary.salary')),
          col.dateTime<W>('changedAt', t('integration.changedAt')),
        ]}
      />
    </Box>
  );
}

function useCsvFile() {
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [name, setName] = useState('');
  const pick = async (file?: File | null) => {
    if (!file) return;
    setName(file.name);
    setRows(parseCsv(await file.text()));
  };
  return { rows, name, pick, reset: () => setRows(null) };
}

function DeviceTab() {
  const { t } = useTranslation();
  const csv = useCsvFile();
  const [report, setReport] = useState<S<'DeviceImportReport'> | null>(null);
  const imp = useApiMutation(attendanceApi.importDeviceRecords, { invalidate: [['attendance']], success: false, onSuccess: setReport });
  const records = (csv.rows ?? []).map((r) => ({ employeeNumber: Number(r.employeeNumber), recordedAt: r.recordedAt, device: r.device || null }));
  const invalid = records.filter((r) => !r.employeeNumber || !r.recordedAt).length;
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          {t('integration.deviceHint')}
        </Typography>
        <Box component="code" sx={{ direction: 'ltr', bgcolor: brand.creamSoft, p: 1, borderRadius: 1, fontSize: 12 }}>
          employeeNumber,recordedAt,device
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button component="label" variant="outlined" startIcon={<UploadFileOutlinedIcon />}>
            {t('integration.chooseCsv')}
            <input hidden type="file" accept=".csv,text/csv" onChange={(e) => csv.pick(e.target.files?.[0])} />
          </Button>
          <Typography variant="caption">{csv.name}</Typography>
        </Stack>
        {csv.rows && (
          <Alert severity={invalid ? 'warning' : 'info'}>
            {t('integration.parsed', { count: records.length })} {invalid > 0 && t('integration.invalidRows', { count: invalid })}
          </Alert>
        )}
        <Box>
          <Button variant="contained" disabled={!records.length || invalid > 0 || imp.isPending} onClick={() => imp.mutate({ records })}>
            {t('integration.import')}
          </Button>
        </Box>
        {report && (
          <Alert severity="success">
            {t('integration.deviceReport', { received: report.received, imported: report.imported, duplicates: report.duplicates, rejected: report.rejected.length })}
            {report.rejected.length > 0 && <div>{t('integration.rejectedRows')}: {report.rejected.join(', ')}</div>}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

const MIGRATION_COLUMNS = [
  'employeeNumber', 'name', 'gender', 'maritalStatus', 'nationalityNumber', 'birthPlaceNumber', 'trackNumber', 'departmentNumber', 'workSiteNumber', 'jobNumber',
  'passportNumber', 'idCardNumber', 'nationalNumber', 'phoneNumber', 'birthDate', 'healthCertificateExpiryDate', 'startDate', 'salary', 'allowance',
] as const;

function MigrationTab() {
  const { t } = useTranslation();
  const csv = useCsvFile();
  const [dryRun, setDryRun] = useState(true);
  const [report, setReport] = useState<S<'MigrationReport'> | null>(null);
  const migrate = useApiMutation(integrationApi.migrate, { invalidate: [['workers']], success: false, onSuccess: setReport });
  const n = (v?: string) => (v ? Number(v) : undefined);
  const s = (v?: string) => (v ? v : null);
  const workers: S<'MigrationWorkerRow'>[] = (csv.rows ?? []).map((r) => ({
    employeeNumber: n(r.employeeNumber),
    name: s(r.name),
    gender: (r.gender || undefined) as S<'Gender'> | undefined,
    maritalStatus: (r.maritalStatus || undefined) as S<'MaritalStatus'> | undefined,
    nationalityNumber: n(r.nationalityNumber),
    birthPlaceNumber: n(r.birthPlaceNumber),
    trackNumber: n(r.trackNumber),
    departmentNumber: n(r.departmentNumber),
    workSiteNumber: n(r.workSiteNumber),
    jobNumber: n(r.jobNumber),
    passportNumber: s(r.passportNumber),
    idCardNumber: s(r.idCardNumber),
    nationalNumber: r.nationalNumber ? Number(r.nationalNumber) : null,
    phoneNumber: s(r.phoneNumber),
    birthDate: s(r.birthDate),
    healthCertificateExpiryDate: s(r.healthCertificateExpiryDate),
    startDate: s(r.startDate),
    salary: s(r.salary),
    allowance: s(r.allowance),
  }));
  type Rej = S<'MigrationRejection'>;
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t('integration.migrationHint')}
          </Typography>
          <Box component="code" sx={{ direction: 'ltr', bgcolor: brand.creamSoft, p: 1, borderRadius: 1, fontSize: 12, overflowWrap: 'anywhere' }}>
            {MIGRATION_COLUMNS.join(',')}
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button component="label" variant="outlined" startIcon={<UploadFileOutlinedIcon />}>
              {t('integration.chooseCsv')}
              <input hidden type="file" accept=".csv,text/csv" onChange={(e) => csv.pick(e.target.files?.[0])} />
            </Button>
            <Typography variant="caption">{csv.name}</Typography>
          </Stack>
          {csv.rows && <Alert severity="info">{t('integration.parsed', { count: workers.length })}</Alert>}
          <FormControlLabel control={<Switch checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />} label={t('integration.dryRun')} />
          <Box>
            <Button variant="contained" color={dryRun ? 'primary' : 'warning'} disabled={!workers.length || migrate.isPending} onClick={() => migrate.mutate({ dryRun, workers })}>
              {dryRun ? t('integration.validate') : t('integration.migrate')}
            </Button>
          </Box>
        </Stack>
      </Paper>
      {report && (
        <>
          <Alert severity={report.rejectedCount ? 'warning' : 'success'}>
            {t('integration.migrationReport', { source: report.sourceCount, migrated: report.migratedCount, rejected: report.rejectedCount })} {report.dryRun && `(${t('integration.dryRun')})`}
          </Alert>
          {report.rejected.length > 0 && (
            <LocalDataGrid<Rej>
              rows={report.rejected}
              getRowId={(r) => r.row}
              columns={[
                { field: 'row', headerName: t('integration.row'), width: 90 },
                { field: 'employeeNumber', headerName: t('fields.employeeNumber'), width: 130 },
                { field: 'reasons', headerName: t('integration.reasons'), flex: 1, valueGetter: (_: unknown, r: Rej) => r.reasons.join(' · ') },
              ]}
            />
          )}
        </>
      )}
    </Stack>
  );
}
