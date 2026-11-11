import { useMemo } from 'react';
import { Button, Chip, Stack } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import AddIcon from '@mui/icons-material/Add';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/authContext';
import { ACTION_PERMISSIONS } from '@/constants/permissions';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { penaltiesApi, penaltiesKeys } from './api';
import { decisionNumber, decisionValue, usePenaltyDecisionTypes } from './decisionTypes';
import { penaltySource } from './source';
import { workersApi, workersKeys } from '@/features/workers/api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { FilterPanel } from '@/components/tables/FilterPanel';
import { clearFilters, isFiltered, type FilterDef } from '@/components/tables/filters';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { useListState } from '@/hooks/useListState';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useScopeOptions } from '@/features/shared/options';
import { ENUMS } from '@/constants/enums';
import type { Q, S } from '@/types/api';

type Row = S<'PenaltyListItem'>;

export default function PenaltiesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useAuth();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const decisions = usePenaltyDecisionTypes();
  const list = useListState({
    Status: '',
    Violation: '',
    Decision: '',
    Source: '',
    TrackId: '',
    WorkSiteId: '',
    IssuedBy: '',
    IssuedFrom: '',
    IssuedTo: '',
    From: '',
    To: '',
    Search: '',
    // Scope to one worker (from the worker file); shown as a chip, kept when the panel's filters are cleared.
    EmployeeId: '',
  });
  const opts = useScopeOptions(list.filters.TrackId);
  // Decision is stored by type number in the URL; base types are sent by name, others by number (TL-N5).
  const decisionNo = decisionNumber(list.filters.Decision);
  const params = { ...list.params, Decision: decisionNo === null ? undefined : decisionValue(decisionNo) } as unknown as Q<'ListPenalties'>;
  const query = useQuery({ queryKey: penaltiesKeys.list(params), queryFn: ({ signal }) => penaltiesApi.list(params, signal), placeholderData: keepPreviousData });
  const employeeId = Number(list.filters.EmployeeId) || null;
  const worker = useQuery({ queryKey: workersKeys.detail(employeeId ?? 0), queryFn: () => workersApi.get(employeeId!), enabled: !!employeeId, staleTime: 60_000 });
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Search', kind: 'search', label: t('penalties.searchHint') },
    { key: 'Status', kind: 'select', label: t('fields.status'), options: enumOptions('PenaltyStatus', ENUMS.PenaltyStatus) },
    { key: 'Violation', kind: 'select', label: t('penalties.violation'), options: enumOptions('PenaltyViolation', ENUMS.PenaltyViolation) },
    { key: 'Decision', kind: 'select', label: t('penalties.decision'), options: decisions.options(true) },
    { key: 'Source', kind: 'select', label: t('penalties.source'), options: enumOptions('PenaltySource', ENUMS.PenaltySource) },
    { key: 'TrackId', kind: 'select', label: t('fields.track'), options: opts.tracks, clears: ['WorkSiteId'] },
    { key: 'WorkSiteId', kind: 'select', label: t('fields.workSite'), options: opts.sites },
    { key: 'IssuedBy', kind: 'search', label: t('penalties.issuedBy') },
    { key: 'IssuedFrom', kind: 'date', label: t('penalties.issuedFrom') },
    { key: 'IssuedTo', kind: 'date', label: t('penalties.issuedTo') },
    { key: 'From', kind: 'date', label: t('penalties.enteredFrom') },
    { key: 'To', kind: 'date', label: t('penalties.enteredTo') },
  ];
  const d = query.data;
  const workerName = worker.data ? `${worker.data.employeeNumber} — ${worker.data.name ?? ''}` : (d?.page.items[0]?.name ?? String(employeeId ?? ''));

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.num<Row>('employeeNumber', t('fields.employeeNumber')),
      col.text<Row>('name', t('fields.name'), { minWidth: 170 }),
      col.text<Row>('workSiteName', t('fields.workSite')),
      { field: 'violation', headerName: t('penalties.violation'), width: 170, valueFormatter: (v: string) => label('PenaltyViolation', v) },
      col.text<Row>('violationDates', t('penalties.violationDates')),
      col.text<Row>('issuedBy', t('penalties.issuedBy')),
      col.date<Row>('issuedOn', t('penalties.issuedOn')),
      { field: 'source', headerName: t('penalties.source'), width: 130, valueGetter: (_: unknown, r: Row) => label('PenaltySource', penaltySource(r)) },
      { field: 'decision', headerName: t('penalties.decision'), width: 150, valueFormatter: (v: unknown) => decisions.label(v) },
      col.num<Row>('deductedDays', t('penalties.deductedDays')),
      col.status<Row>('status', t('fields.status'), 'PenaltyStatus', { width: 130 }),
      col.dateTime<Row>('createdAt', t('penalties.enteredAt')),
    ],
    [label, decisions, t],
  );

  return (
    <PageContainer>
      <PageHeader
        title={t('nav.items.penalties')}
        actions={
          can(ACTION_PERMISSIONS.createPenalty) && (
            <Button component={RouterLink} to="/penalties/new" variant="contained" startIcon={<AddIcon />}>
              {t('penalties.new')}
            </Button>
          )
        }
      />
      {d && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          {([
            ['PendingDecision', d.pendingDecision],
            ['Decided', d.pendingAcknowledgement],
            ['Acknowledged', d.pendingApplication],
          ] as const).map(([status, count]) => (
            <Chip
              key={status}
              clickable
              color={list.filters.Status === status ? 'primary' : 'default'}
              variant={list.filters.Status === status ? 'filled' : 'outlined'}
              label={`${t(`penalties.waiting.${status}`)} (${count})`}
              onClick={() => list.setFilter('Status', list.filters.Status === status ? '' : status)}
            />
          ))}
        </Stack>
      )}
      {employeeId !== null && (
        <Chip
          icon={<PersonOutlineIcon />}
          color="primary"
          variant="outlined"
          label={t('penalties.ofWorker', { name: workerName })}
          onDelete={() => list.clearFilter('EmployeeId')}
          sx={{ mb: 2, maxWidth: '100%' }}
        />
      )}
      <FilterPanel list={list} filters={filters} />
      <ServerDataGrid<Row>
        data={d?.page}
        loading={query.isFetching}
        error={query.error}
        onRetry={query.refetch}
        filtered={isFiltered(list, filters)}
        onClearFilters={() => clearFilters(list, filters)}
        getRowId={(r) => r.penaltyId}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => navigate(`/penalties/${r.penaltyId}`)}
        columns={columns}
      />
    </PageContainer>
  );
}
