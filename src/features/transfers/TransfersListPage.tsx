import { useMemo } from 'react';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { transfersApi, transfersKeys } from './api';
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

type Row = S<'TransferListItem'>;

export default function TransfersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const list = useListState({ Search: '', Status: '', InitiatedBy: '', TrackId: '', WorkSiteId: '', From: '', To: '' });
  const opts = useScopeOptions(list.filters.TrackId);
  const params = list.params as unknown as Q<'ListTransfers'>;
  const query = useQuery({ queryKey: transfersKeys.list(params), queryFn: ({ signal }) => transfersApi.list(params, signal), placeholderData: keepPreviousData });
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Search', kind: 'search', label: t('common.search') },
    { key: 'Status', kind: 'select', label: t('fields.status'), options: enumOptions('TransferStatus', ENUMS.TransferStatus) },
    { key: 'InitiatedBy', kind: 'select', label: t('transfers.initiatedBy'), options: enumOptions('TransferInitiator', ENUMS.TransferInitiator) },
    { key: 'TrackId', kind: 'select', label: t('fields.track'), options: opts.tracks, clears: ['WorkSiteId'] },
    { key: 'WorkSiteId', kind: 'select', label: t('fields.workSite'), options: opts.sites },
    { key: 'From', kind: 'date', label: t('common.from') },
    { key: 'To', kind: 'date', label: t('common.to') },
  ];

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.num<Row>('employeeNumber', t('fields.employeeNumber')),
      col.text<Row>('name', t('fields.name'), { minWidth: 170 }),
      col.text<Row>('fromSiteName', t('transfers.from')),
      { field: 'proposedSiteName', headerName: t('transfers.to'), flex: 1, minWidth: 140, valueGetter: (_: unknown, r: Row) => r.approvedSiteName ?? r.proposedSiteName ?? '—' },
      { field: 'initiatedBy', headerName: t('transfers.initiatedBy'), width: 120, valueFormatter: (v: string) => label('TransferInitiator', v) },
      col.date<Row>('requestedDate', t('transfers.requestedDate')),
      col.status<Row>('status', t('fields.status'), 'TransferStatus', { width: 140 }),
      { field: 'waitingParties', headerName: t('workflow.waitingFor'), width: 200, valueGetter: (_: unknown, r: Row) => r.waitingParties.map((p) => label('LaborParty', p)).join('، ') || '—' },
      col.date<Row>('actualDate', t('transfers.actualDate')),
    ],
    [label, t],
  );

  return (
    <PageContainer>
      <PageHeader
        title={t('nav.items.transfers')}
        actions={
          <Button component={RouterLink} to="/transfers/new" variant="contained" startIcon={<AddIcon />}>
            {t('transfers.new')}
          </Button>
        }
      />
      <FilterPanel list={list} filters={filters} />
      <ServerDataGrid<Row>
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
        onRowClick={(r) => navigate(`/transfers/${r.id}`)}
        columns={columns}
      />
    </PageContainer>
  );
}
