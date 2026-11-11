import { useMemo } from 'react';
import { Button, Tab, Tabs } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/authContext';
import { ACTION_PERMISSIONS } from '@/constants/permissions';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { leavesApi, leavesKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { FilterPanel } from '@/components/tables/FilterPanel';
import { clearFilters, isFiltered, type FilterDef } from '@/components/tables/filters';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { ToneChip } from '@/components/common/StatusChip';
import { useListState } from '@/hooks/useListState';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useScopeOptions } from '@/features/shared/options';
import { ENUMS } from '@/constants/enums';
import type { Q, S } from '@/types/api';
import { formatDate } from '@/utils/format';

type Row = S<'LeaveListItem'>;

export default function LeavesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useAuth();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const list = useListState({ Tab: 'All', Search: '', Type: '', TrackId: '', WorkSiteId: '', From: '', To: '', LateReturn: false as boolean });
  const opts = useScopeOptions(list.filters.TrackId);
  const params = { ...list.params, LateReturn: list.filters.LateReturn || undefined } as unknown as Q<'ListLeaves'>;
  const query = useQuery({ queryKey: leavesKeys.list(params), queryFn: ({ signal }) => leavesApi.list(params, signal), placeholderData: keepPreviousData });
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Search', kind: 'search', label: t('common.search') },
    { key: 'Type', kind: 'select', label: t('leaves.type'), options: enumOptions('LeaveType', ENUMS.LeaveType) },
    { key: 'TrackId', kind: 'select', label: t('fields.track'), options: opts.tracks, clears: ['WorkSiteId'] },
    { key: 'WorkSiteId', kind: 'select', label: t('fields.workSite'), options: opts.sites },
    { key: 'From', kind: 'date', label: t('common.from') },
    { key: 'To', kind: 'date', label: t('common.to') },
    { key: 'LateReturn', kind: 'switch', label: t('leaves.lateReturnOnly') },
  ];
  const counts = (query.data?.counts ?? {}) as Record<string, number>;

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.num<Row>('employeeNumber', t('fields.employeeNumber')),
      col.text<Row>('name', t('fields.name'), { minWidth: 170 }),
      col.text<Row>('workSiteName', t('fields.workSite')),
      col.status<Row>('type', t('leaves.type'), 'LeaveType', { width: 110 }),
      col.date<Row>('fromDate', t('common.from')),
      col.date<Row>('toDate', t('common.to')),
      col.num<Row>('days', t('common.days'), { width: 80 }),
      col.bool<Row>('requiresTravel', t('leaves.travel'), t('common.yes'), t('common.no')),
      col.status<Row>('status', t('fields.status'), 'LeaveStatus', { width: 160 }),
      {
        field: 'resumedOn',
        headerName: t('leaves.resumedOn'),
        width: 150,
        renderCell: (p) => (p.row.overdueDays > 0 ? <ToneChip tone="error" label={t('leaves.overdueDays', { count: p.row.overdueDays })} /> : formatDate(p.row.resumedOn)),
      },
    ],
    [t],
  );

  return (
    <PageContainer>
      <PageHeader
        title={t('nav.items.leaves')}
        actions={
          can(ACTION_PERMISSIONS.createLeave) && (
            <Button component={RouterLink} to="/leaves/new" variant="contained" startIcon={<AddIcon />}>
              {t('leaves.new')}
            </Button>
          )
        }
      />
      <Tabs value={list.filters.Tab} onChange={(_, v: string) => list.setFilter('Tab', v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        {ENUMS.LeaveTab.map((tab) => (
          <Tab key={tab} value={tab} label={`${label('LeaveTab', tab)}${counts[tab] !== undefined ? ` (${counts[tab]})` : ''}`} />
        ))}
      </Tabs>
      <FilterPanel list={list} filters={filters} />
      <ServerDataGrid<Row>
        data={query.data?.page}
        loading={query.isFetching}
        error={query.error}
        onRetry={query.refetch}
        filtered={isFiltered(list, filters)}
        onClearFilters={() => clearFilters(list, filters)}
        getRowId={(r) => r.id}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => navigate(`/leaves/${r.id}`)}
        columns={columns}
      />
    </PageContainer>
  );
}
