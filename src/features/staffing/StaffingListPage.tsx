import { useMemo } from 'react';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/authContext';
import { ACTION_PERMISSIONS } from '@/constants/permissions';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { staffingApi, staffingKeys } from './api';
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

type Row = S<'StaffingRequestListItem'>;

export default function StaffingListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useAuth();
  const enumOptions = useEnumOptions();
  const list = useListState({ Number: '', Status: '', TrackId: '', WorkSiteId: '', Reason: '', From: '', To: '' });
  const opts = useScopeOptions(list.filters.TrackId);
  const params = list.params as unknown as Q<'ListStaffingRequests'>;
  const query = useQuery({ queryKey: staffingKeys.list(params), queryFn: ({ signal }) => staffingApi.list(params, signal), placeholderData: keepPreviousData });
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Number', kind: 'search', inputType: 'number', label: t('staffing.number') },
    { key: 'Status', kind: 'select', label: t('fields.status'), options: enumOptions('StaffingRequestStatus', ENUMS.StaffingRequestStatus) },
    { key: 'Reason', kind: 'select', label: t('staffing.reason'), options: enumOptions('StaffingReason', ENUMS.StaffingReason) },
    { key: 'TrackId', kind: 'select', label: t('fields.track'), options: opts.tracks, clears: ['WorkSiteId'] },
    { key: 'WorkSiteId', kind: 'select', label: t('fields.workSite'), options: opts.sites },
    { key: 'From', kind: 'date', label: t('common.from') },
    { key: 'To', kind: 'date', label: t('common.to') },
  ];

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
    <PageContainer>
      <PageHeader
        title={t('nav.items.staffing')}
        actions={
          can(ACTION_PERMISSIONS.createStaffingRequest) && (
            <Button component={RouterLink} to="/staffing-requests/new" variant="contained" startIcon={<AddIcon />}>
              {t('staffing.new')}
            </Button>
          )
        }
      />
      <FilterPanel list={list} filters={filters} />
      <ServerDataGrid<Row>
        columns={columns}
        data={query.data}
        loading={query.isFetching}
        error={query.error}
        onRetry={query.refetch}
        filtered={isFiltered(list, filters)}
        onClearFilters={() => clearFilters(list, filters)}
        getRowId={(r) => r.number}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => navigate(`/staffing-requests/${r.number}`)}
      />
    </PageContainer>
  );
}
