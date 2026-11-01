import { useMemo } from 'react';
import { Box, Button, Tab, Tabs, TextField, FormControlLabel, Switch } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { leavesApi, leavesKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/tables/FilterBar';
import { SearchField } from '@/components/tables/SearchField';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { SelectField } from '@/components/forms/SelectField';
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
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const list = useListState({ Tab: 'All', Search: '', Type: '', TrackId: '', WorkSiteId: '', From: '', To: '', LateReturn: false as boolean });
  const opts = useScopeOptions(list.filters.TrackId);
  const params = { ...list.params, LateReturn: list.filters.LateReturn || undefined } as unknown as Q<'ListLeaves'>;
  const query = useQuery({ queryKey: [...leavesKeys.all, 'list', params], queryFn: () => leavesApi.list(params), placeholderData: keepPreviousData });
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
    <Box>
      <PageHeader
        title={t('nav.items.leaves')}
        subtitle={t('leaves.subtitle')}
        actions={
          <Button component={RouterLink} to="/leaves/new" variant="contained" startIcon={<AddIcon />}>
            {t('leaves.new')}
          </Button>
        }
      />
      <Tabs value={list.filters.Tab} onChange={(_, v: string) => list.setFilter('Tab', v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        {ENUMS.LeaveTab.map((tab) => (
          <Tab key={tab} value={tab} label={`${label('LeaveTab', tab)}${counts[tab] !== undefined ? ` (${counts[tab]})` : ''}`} />
        ))}
      </Tabs>
      <FilterBar onReset={list.reset}>
        <SearchField label={t('common.search')} value={list.filters.Search} onCommit={(v) => list.setFilter('Search', v)} />
        <SelectField label={t('leaves.type')} value={list.filters.Type} options={enumOptions('LeaveType', ENUMS.LeaveType)} onChange={(v) => list.setFilter('Type', v)} />
        <SelectField label={t('fields.track')} value={list.filters.TrackId} options={opts.tracks} onChange={(v) => list.setFilters({ ...list.filters, TrackId: v, WorkSiteId: '' })} />
        <SelectField label={t('fields.workSite')} value={list.filters.WorkSiteId} options={opts.sites} onChange={(v) => list.setFilter('WorkSiteId', v)} />
        <TextField type="date" label={t('common.from')} value={list.filters.From} onChange={(e) => list.setFilter('From', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label={t('common.to')} value={list.filters.To} onChange={(e) => list.setFilter('To', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <FormControlLabel control={<Switch checked={list.filters.LateReturn} onChange={(e) => list.setFilter('LateReturn', e.target.checked)} />} label={t('leaves.lateReturnOnly')} />
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
        onRowClick={(r) => navigate(`/leaves/${r.id}`)}
        columns={columns}
      />
    </Box>
  );
}
