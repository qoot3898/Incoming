import { useMemo } from 'react';
import { Box, Button, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { transfersApi, transfersKeys } from './api';
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

type Row = S<'TransferListItem'>;

export default function TransfersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const list = useListState({ Search: '', Status: '', InitiatedBy: '', TrackId: '', WorkSiteId: '', From: '', To: '' });
  const opts = useScopeOptions(list.filters.TrackId);
  const params = list.params as unknown as Q<'ListTransfers'>;
  const query = useQuery({ queryKey: [...transfersKeys.all, 'list', params], queryFn: () => transfersApi.list(params), placeholderData: keepPreviousData });

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
    <Box>
      <PageHeader
        title={t('nav.items.transfers')}
        subtitle={t('transfers.subtitle')}
        actions={
          <Button component={RouterLink} to="/transfers/new" variant="contained" startIcon={<AddIcon />}>
            {t('transfers.new')}
          </Button>
        }
      />
      <FilterBar onReset={list.reset}>
        <SearchField label={t('common.search')} value={list.filters.Search} onCommit={(v) => list.setFilter('Search', v)} />
        <SelectField label={t('fields.status')} value={list.filters.Status} options={enumOptions('TransferStatus', ENUMS.TransferStatus)} onChange={(v) => list.setFilter('Status', v)} />
        <SelectField label={t('transfers.initiatedBy')} value={list.filters.InitiatedBy} options={enumOptions('TransferInitiator', ENUMS.TransferInitiator)} onChange={(v) => list.setFilter('InitiatedBy', v)} />
        <SelectField label={t('fields.track')} value={list.filters.TrackId} options={opts.tracks} onChange={(v) => list.setFilters({ ...list.filters, TrackId: v, WorkSiteId: '' })} />
        <SelectField label={t('fields.workSite')} value={list.filters.WorkSiteId} options={opts.sites} onChange={(v) => list.setFilter('WorkSiteId', v)} />
        <TextField type="date" label={t('common.from')} value={list.filters.From} onChange={(e) => list.setFilter('From', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label={t('common.to')} value={list.filters.To} onChange={(e) => list.setFilter('To', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </FilterBar>
      <ServerDataGrid<Row>
        data={query.data}
        loading={query.isFetching}
        error={query.error}
        getRowId={(r) => r.id}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => navigate(`/transfers/${r.id}`)}
        columns={columns}
      />
    </Box>
  );
}
