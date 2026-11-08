import { useMemo } from 'react';
import { Button, Chip, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { penaltiesApi, penaltiesKeys } from './api';
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

type Row = S<'PenaltyListItem'>;

export default function PenaltiesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const opts = useScopeOptions();
  const list = useListState({ Status: '', Violation: '', Decision: '', WorkSiteId: '', From: '', To: '', Search: '' });
  const params = list.params as unknown as Q<'ListPenalties'>;
  const query = useQuery({ queryKey: penaltiesKeys.list(params), queryFn: ({ signal }) => penaltiesApi.list(params, signal), placeholderData: keepPreviousData });
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Search', kind: 'search', label: t('common.search') },
    { key: 'Status', kind: 'select', label: t('fields.status'), options: enumOptions('PenaltyStatus', ENUMS.PenaltyStatus) },
    { key: 'Violation', kind: 'select', label: t('penalties.violation'), options: enumOptions('PenaltyViolation', ENUMS.PenaltyViolation) },
    { key: 'Decision', kind: 'select', label: t('penalties.decision'), options: enumOptions('PenaltyDecision', ENUMS.PenaltyDecision) },
    { key: 'WorkSiteId', kind: 'select', label: t('fields.workSite'), options: opts.sites },
    { key: 'From', kind: 'date', label: t('common.from') },
    { key: 'To', kind: 'date', label: t('common.to') },
  ];
  const d = query.data;

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.num<Row>('employeeNumber', t('fields.employeeNumber')),
      col.text<Row>('name', t('fields.name'), { minWidth: 170 }),
      col.text<Row>('workSiteName', t('fields.workSite')),
      { field: 'violation', headerName: t('penalties.violation'), width: 170, valueFormatter: (v: string) => label('PenaltyViolation', v) },
      col.text<Row>('violationDates', t('penalties.violationDates')),
      { field: 'decision', headerName: t('penalties.decision'), width: 140, valueFormatter: (v: string | null) => label('PenaltyDecision', v) },
      col.num<Row>('deductedDays', t('penalties.deductedDays')),
      col.status<Row>('status', t('fields.status'), 'PenaltyStatus', { width: 130 }),
      col.dateTime<Row>('createdAt', t('common.createdAt')),
    ],
    [label, t],
  );

  return (
    <PageContainer>
      <PageHeader
        title={t('nav.items.penalties')}
        actions={
          <Button component={RouterLink} to="/penalties/new" variant="contained" startIcon={<AddIcon />}>
            {t('penalties.new')}
          </Button>
        }
      />
      {d && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          {([
            ['PendingDecision', d.pendingDecision],
            ['Decided', d.pendingAcknowledgement],
            ['Acknowledged', d.pendingApplication],
          ] as const).map(([status, count]) => (
            <Chip
              key={status}
              clickable
              color={list.filters.Status === status ? 'primary' : 'default'}
              variant={list.filters.Status === status ? 'filled' : 'outlined'}
              label={`${t(`penalties.waiting.${status}`)} (${count})`}
              onClick={() => list.setFilter('Status', list.filters.Status === status ? '' : status)}
            />
          ))}
        </Stack>
      )}
      <FilterPanel list={list} filters={filters} />
      <ServerDataGrid<Row>
        data={d?.page}
        loading={query.isFetching}
        error={query.error}
        onRetry={query.refetch}
        filtered={isFiltered(list, filters)}
        onClearFilters={() => clearFilters(list, filters)}
        getRowId={(r) => r.penaltyId}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => navigate(`/penalties/${r.penaltyId}`)}
        columns={columns}
      />
    </PageContainer>
  );
}
