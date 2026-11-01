import { useMemo } from 'react';
import { Box, Button, Tab, Tabs, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { terminationsApi, terminationsKeys } from './api';
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

type Row = S<'TerminationListItem'>;
const COUNT_KEY: Record<string, keyof S<'TerminationCounts'>> = { All: 'all', PendingOperations: 'pendingOperations', Approved: 'approved', Clearance: 'clearance', Closed: 'closed' };

export default function TerminationsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const list = useListState({ Stage: 'All', Search: '', Reason: '', Initiator: '', TrackId: '', WorkSiteId: '', From: '', To: '' });
  const opts = useScopeOptions(list.filters.TrackId);
  const params = list.params as unknown as Q<'ListTerminations'>;
  const query = useQuery({ queryKey: [...terminationsKeys.all, 'list', params], queryFn: () => terminationsApi.list(params), placeholderData: keepPreviousData });
  const counts = query.data?.counts;

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.num<Row>('employeeNumber', t('fields.employeeNumber')),
      col.text<Row>('name', t('fields.name'), { minWidth: 170 }),
      col.text<Row>('workSiteName', t('fields.workSite')),
      { field: 'reason', headerName: t('terminations.reason'), width: 130, valueFormatter: (v: string) => label('TerminationReason', v) },
      { field: 'initiatedBy', headerName: t('terminations.initiator'), width: 130, valueFormatter: (v: string) => label('TerminationInitiator', v) },
      col.date<Row>('requestDate', t('terminations.requestDate')),
      col.date<Row>('terminationDate', t('terminations.terminationDate')),
      col.status<Row>('status', t('fields.status'), 'TerminationStatus', { width: 140 }),
      { field: 'clearance', headerName: t('terminations.clearance'), width: 110, valueGetter: (_: unknown, r: Row) => `${r.clearanceRecorded}/${r.clearanceTotal}` },
      col.bool<Row>('settlementApproved', t('terminations.settlement'), t('common.yes'), t('common.no')),
    ],
    [label, t],
  );

  return (
    <Box>
      <PageHeader
        title={t('nav.items.terminations')}
        subtitle={t('terminations.subtitle')}
        actions={
          <Button component={RouterLink} to="/terminations/new" variant="contained" startIcon={<AddIcon />}>
            {t('terminations.new')}
          </Button>
        }
      />
      <Tabs value={list.filters.Stage} onChange={(_, v: string) => list.setFilter('Stage', v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        {ENUMS.TerminationStage.map((s) => (
          <Tab key={s} value={s} label={`${label('TerminationStage', s)}${counts ? ` (${counts[COUNT_KEY[s]]})` : ''}`} />
        ))}
      </Tabs>
      <FilterBar onReset={list.reset}>
        <SearchField label={t('common.search')} value={list.filters.Search} onCommit={(v) => list.setFilter('Search', v)} />
        <SelectField label={t('terminations.reason')} value={list.filters.Reason} options={enumOptions('TerminationReason', ENUMS.TerminationReason)} onChange={(v) => list.setFilter('Reason', v)} />
        <SelectField label={t('terminations.initiator')} value={list.filters.Initiator} options={enumOptions('TerminationInitiator', ENUMS.TerminationInitiator)} onChange={(v) => list.setFilter('Initiator', v)} />
        <SelectField label={t('fields.track')} value={list.filters.TrackId} options={opts.tracks} onChange={(v) => list.setFilters({ ...list.filters, TrackId: v, WorkSiteId: '' })} />
        <SelectField label={t('fields.workSite')} value={list.filters.WorkSiteId} options={opts.sites} onChange={(v) => list.setFilter('WorkSiteId', v)} />
        <TextField type="date" label={t('common.from')} value={list.filters.From} onChange={(e) => list.setFilter('From', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label={t('common.to')} value={list.filters.To} onChange={(e) => list.setFilter('To', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </FilterBar>
      <ServerDataGrid<Row>
        data={query.data?.page}
        loading={query.isFetching}
        error={query.error}
        getRowId={(r) => r.id}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => navigate(`/terminations/${r.id}`)}
        columns={columns}
      />
    </Box>
  );
}
