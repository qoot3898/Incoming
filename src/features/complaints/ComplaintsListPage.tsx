import { useMemo } from 'react';
import { Tab, Tabs } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { complaintsApi, complaintsKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { FilterPanel } from '@/components/tables/FilterPanel';
import { clearFilters, isFiltered, type FilterDef } from '@/components/tables/filters';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { useListState } from '@/hooks/useListState';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import type { Q, S } from '@/types/api';

type Row = S<'ComplaintListItem'>;
/** `New` (oldest first, the work queue), `Reviewed` and `All` (newest first) — ordering is the API's. */
const TABS = ['New', 'Reviewed', 'All'] as const;
type TabValue = (typeof TABS)[number];

export default function ComplaintsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const list = useListState({ Status: 'New' as TabValue | string, Search: '', From: '', To: '' });
  const status = list.filters.Status as TabValue;
  const params = { ...list.params, Status: status === 'All' ? undefined : status } as Q<'ListComplaints'>;
  const query = useQuery({ queryKey: complaintsKeys.list(params), queryFn: ({ signal }) => complaintsApi.list(params, signal), placeholderData: keepPreviousData });
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Search', kind: 'search', label: t('complaints.search'), wide: true },
    { key: 'From', kind: 'date', label: t('complaints.submittedFrom') },
    { key: 'To', kind: 'date', label: t('complaints.submittedTo') },
  ];
  const newCount = query.data?.newCount;

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.num<Row>('id', t('complaints.number'), { width: 90 }),
      col.dateTime<Row>('submittedAt', t('complaints.submittedAt')),
      col.text<Row>('complainantName', t('complaints.complainantName'), { minWidth: 160 }),
      col.text<Row>('complainantPhone', t('complaints.complainantPhone'), { width: 150, flex: 0, renderCell: (p) => <bdi dir="ltr">{p.value ?? '—'}</bdi> }),
      col.text<Row>('respondentName', t('complaints.respondentName'), { minWidth: 160 }),
      col.text<Row>('location', t('complaints.location')),
      col.text<Row>('details', t('complaints.details'), { flex: 2, minWidth: 220 }),
      col.status<Row>('status', t('fields.status'), 'ComplaintStatus', { width: 120 }),
      col.dateTime<Row>('reviewedAt', t('complaints.reviewedAt')),
    ],
    [t],
  );

  return (
    <PageContainer>
      <PageHeader title={t('nav.items.complaints')} />
      <Tabs value={status} onChange={(_, v: TabValue) => list.setFilter('Status', v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((tab) => {
          const text = tab === 'All' ? t('common.all') : label('ComplaintStatus', tab);
          return <Tab key={tab} value={tab} label={tab === 'New' && newCount !== undefined ? `${text} (${newCount})` : text} />;
        })}
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
        onRowClick={(r) => navigate(`/complaints/${r.id}`)}
        emptyText={status === 'New' ? t('complaints.noNew') : undefined}
        columns={columns}
      />
    </PageContainer>
  );
}
