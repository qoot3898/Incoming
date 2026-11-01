import { useMemo } from 'react';
import { Box } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { candidatesApi, candidatesKeys } from '@/features/staffing/api';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/tables/FilterBar';
import { SearchField } from '@/components/tables/SearchField';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { SelectField } from '@/components/forms/SelectField';
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
  const query = useQuery({ queryKey: candidatesKeys.list(params), queryFn: () => candidatesApi.list(params), placeholderData: keepPreviousData });

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
    <Box>
      <PageHeader title={t('nav.items.candidates')} subtitle={t('candidates.subtitle')} />
      <FilterBar onReset={list.reset}>
        <SearchField label={t('common.search')} value={list.filters.Search} onCommit={(v) => list.setFilter('Search', v)} />
        <SelectField label={t('fields.status')} value={list.filters.Status} options={enumOptions('CandidateStatus', ENUMS.CandidateStatus)} onChange={(v) => list.setFilter('Status', v)} />
        <SelectField label={t('fields.track')} value={list.filters.TrackId} options={opts.tracks} onChange={(v) => list.setFilter('TrackId', v)} />
        <SearchField label={t('staffing.number')} type="number" value={list.filters.RequestNumber} onCommit={(v) => list.setFilter('RequestNumber', v)} />
      </FilterBar>
      <ServerDataGrid<Row>
        columns={columns}
        data={query.data}
        loading={query.isFetching}
        error={query.error}
        getRowId={(r) => r.id}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => navigate(`/staffing-requests/${r.requestNumber}`)}
      />
    </Box>
  );
}
