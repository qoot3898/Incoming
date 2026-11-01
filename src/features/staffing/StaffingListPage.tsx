import { useMemo } from 'react';
import { Box, Button, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { staffingApi, staffingKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/tables/FilterBar';
import { SearchField } from '@/components/tables/SearchField';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { SelectField } from '@/components/forms/SelectField';
import { col } from '@/components/tables/columns';
import { useListState } from '@/hooks/useListState';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { useScopeOptions } from '@/features/shared/options';
import { ENUMS } from '@/constants/enums';
import type { Q, S } from '@/types/api';

type Row = S<'StaffingRequestListItem'>;

export default function StaffingListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enumOptions = useEnumOptions();
  const list = useListState({ Number: '', Status: '', TrackId: '', WorkSiteId: '', Reason: '', From: '', To: '' });
  const opts = useScopeOptions(list.filters.TrackId);
  const params = list.params as unknown as Q<'ListStaffingRequests'>;
  const query = useQuery({ queryKey: staffingKeys.list(params), queryFn: () => staffingApi.list(params), placeholderData: keepPreviousData });

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.num<Row>('number', t('staffing.number'), { width: 90 }),
      col.dateTime<Row>('createdAt', t('common.createdAt')),
      col.text<Row>('trackName', t('fields.track')),
      col.text<Row>('workSiteName', t('fields.workSite')),
      col.text<Row>('jobName', t('fields.job')),
      { field: 'count', headerName: t('staffing.countApproved'), width: 120, valueGetter: (_: unknown, r: Row) => `${r.approvedCount} / ${r.count}` },
      col.status<Row>('reason', t('staffing.reason'), 'StaffingReason', { width: 130 }),
      col.status<Row>('status', t('fields.status'), 'StaffingRequestStatus', { width: 170 }),
      col.text<Row>('requestedBy', t('staffing.requestedBy')),
    ],
    [t],
  );

  return (
    <Box>
      <PageHeader
        title={t('nav.items.staffing')}
        subtitle={t('staffing.subtitle')}
        actions={
          <Button component={RouterLink} to="/staffing-requests/new" variant="contained" startIcon={<AddIcon />}>
            {t('staffing.new')}
          </Button>
        }
      />
      <FilterBar onReset={list.reset}>
        <SearchField label={t('staffing.number')} type="number" value={list.filters.Number} onCommit={(v) => list.setFilter('Number', v)} />
        <SelectField label={t('fields.status')} value={list.filters.Status} options={enumOptions('StaffingRequestStatus', ENUMS.StaffingRequestStatus)} onChange={(v) => list.setFilter('Status', v)} />
        <SelectField label={t('staffing.reason')} value={list.filters.Reason} options={enumOptions('StaffingReason', ENUMS.StaffingReason)} onChange={(v) => list.setFilter('Reason', v)} />
        <SelectField label={t('fields.track')} value={list.filters.TrackId} options={opts.tracks} onChange={(v) => list.setFilters({ ...list.filters, TrackId: v, WorkSiteId: '' })} />
        <SelectField label={t('fields.workSite')} value={list.filters.WorkSiteId} options={opts.sites} onChange={(v) => list.setFilter('WorkSiteId', v)} />
        <TextField type="date" label={t('common.from')} value={list.filters.From} onChange={(e) => list.setFilter('From', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label={t('common.to')} value={list.filters.To} onChange={(e) => list.setFilter('To', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </FilterBar>
      <ServerDataGrid<Row>
        columns={columns}
        data={query.data}
        loading={query.isFetching}
        error={query.error}
        getRowId={(r) => r.number}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => navigate(`/staffing-requests/${r.number}`)}
      />
    </Box>
  );
}
