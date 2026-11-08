import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { candidatesApi, candidatesKeys } from '@/features/staffing/api';
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

type Row = S<'CandidateListItem'>;

export default function CandidatesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const opts = useScopeOptions();
  const list = useListState({ Search: '', Status: '', TrackId: '', RequestNumber: '' });
  const params = list.params as unknown as Q<'ListCandidates'>;
  const query = useQuery({ queryKey: candidatesKeys.list(params), queryFn: ({ signal }) => candidatesApi.list(params, signal), placeholderData: keepPreviousData });
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Search', kind: 'search', label: t('common.search') },
    { key: 'Status', kind: 'select', label: t('fields.status'), options: enumOptions('CandidateStatus', ENUMS.CandidateStatus) },
    { key: 'TrackId', kind: 'select', label: t('fields.track'), options: opts.tracks },
    { key: 'RequestNumber', kind: 'search', inputType: 'number', label: t('staffing.number') },
  ];

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.text<Row>('name', t('fields.name'), { minWidth: 180 }),
      col.text<Row>('nationalityName', t('fields.nationality')),
      col.num<Row>('requestNumber', t('staffing.number'), { width: 90 }),
      col.text<Row>('trackName', t('fields.track')),
      col.text<Row>('workSiteName', t('fields.workSite')),
      col.text<Row>('jobName', t('fields.job')),
      col.text<Row>('nominatedBy', t('candidates.nominatedBy')),
      { field: 'recruitedBy', headerName: t('candidates.recruitedBy'), width: 140, valueFormatter: (v: string) => label('LaborParty', v) },
      col.status<Row>('status', t('fields.status'), 'CandidateStatus', { width: 170 }),
      col.dateTime<Row>('statusChangedAt', t('common.statusChangedAt')),
    ],
    [label, t],
  );

  return (
    <PageContainer>
      <PageHeader title={t('nav.items.candidates')} />
      <FilterPanel list={list} filters={filters} />
      <ServerDataGrid<Row>
        columns={columns}
        data={query.data}
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
        onRowClick={(r) => navigate(`/staffing-requests/${r.requestNumber}`)}
      />
    </PageContainer>
  );
}
