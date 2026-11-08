import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { workersApi, workersKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { FilterPanel } from '@/components/tables/FilterPanel';
import { clearFilters, isFiltered, type FilterDef } from '@/components/tables/filters';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { useListState } from '@/hooks/useListState';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { useScopeOptions } from '@/features/shared/options';
import { ENUMS } from '@/constants/enums';
import type { Q, S } from '@/types/api';
import { StatusChip, ToneChip } from '@/components/common/StatusChip';

type Row = S<'LaborWorkerListItem'>;

export default function WorkersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enumOptions = useEnumOptions();
  const list = useListState({ Text: '', Status: '', TrackId: '', WorkSiteId: '', JobId: '', NationalityId: '', ManagementId: '', StartFrom: '', StartTo: '', Sort: '' });
  const opts = useScopeOptions(list.filters.TrackId);
  const params = list.params as unknown as Q<'SearchLaborWorkers'>;
  const query = useQuery({ queryKey: workersKeys.list(params), queryFn: ({ signal }) => workersApi.search(params, signal), placeholderData: keepPreviousData });

  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Text', kind: 'search', label: t('workers.searchLabel'), chipLabel: t('common.search'), wide: true },
    { key: 'Status', kind: 'select', label: t('fields.status'), options: enumOptions('LaborStatus', ENUMS.LaborStatus) },
    { key: 'TrackId', kind: 'select', label: t('fields.track'), options: opts.tracks, clears: ['WorkSiteId'] },
    { key: 'WorkSiteId', kind: 'select', label: t('fields.workSite'), options: opts.sites },
    { key: 'JobId', kind: 'select', label: t('fields.job'), options: opts.jobs },
    { key: 'NationalityId', kind: 'select', label: t('fields.nationality'), options: opts.nationalities },
    { key: 'ManagementId', kind: 'select', label: t('fields.management'), options: opts.managements },
    { key: 'StartFrom', kind: 'date', label: t('workers.startFrom') },
    { key: 'StartTo', kind: 'date', label: t('workers.startTo') },
    {
      key: 'Sort',
      kind: 'select',
      label: t('workers.sort'),
      emptyLabel: t('workers.sortDefault'),
      options: [
        { value: 'Number', label: t('workers.sortNumber') },
        { value: 'Name', label: t('workers.sortName') },
      ],
    },
  ];

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.num<Row>('employeeNumber', t('fields.employeeNumber')),
      col.text<Row>('name', t('fields.name'), { minWidth: 200, flex: 1.4 }),
      col.text<Row>('nationalityName', t('fields.nationality')),
      col.text<Row>('passportNumber', t('fields.passportNumber')),
      col.text<Row>('trackName', t('fields.track')),
      col.text<Row>('workSiteName', t('fields.workSite')),
      col.text<Row>('jobName', t('fields.job')),
      col.date<Row>('startDate', t('fields.startDate')),
      col.status<Row>('status', t('fields.status'), 'LaborStatus', {
        renderCell: (p) => (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
            <StatusChip enumName="LaborStatus" value={p.row.status} />
            {p.row.onLeave && <ToneChip tone="warning" label={t('workers.onLeave')} />}
          </Box>
        ),
        width: 190,
      }),
    ],
    [t],
  );

  return (
    <PageContainer>
      <PageHeader title={t('nav.items.workers')} />
      <FilterPanel list={list} filters={filters} />
      <ServerDataGrid<Row>
        columns={columns}
        data={query.data}
        loading={query.isFetching}
        error={query.error}
        onRetry={query.refetch}
        filtered={isFiltered(list, filters)}
        onClearFilters={() => clearFilters(list, filters)}
        getRowId={(r) => r.employeeId}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => navigate(`/workers/${r.employeeId}`)}
      />
    </PageContainer>
  );
}
