import { useMemo } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { onboardingApi, onboardingKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/tables/FilterBar';
import { SearchField } from '@/components/tables/SearchField';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { SelectField } from '@/components/forms/SelectField';
import { col } from '@/components/tables/columns';
import { useListState } from '@/hooks/useListState';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { useScopeOptions } from '@/features/shared/options';
import { ENUMS } from '@/constants/enums';
import { ToneChip } from '@/components/common/StatusChip';
import type { Q, S } from '@/types/api';

type Row = S<'OnboardingListItem'>;

export default function OnboardingListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const opts = useScopeOptions();
  const list = useListState({ Stage: 'All', Search: '', TrackId: '' });
  const params = list.params as unknown as Q<'ListOnboarding'>;
  const query = useQuery({ queryKey: [...onboardingKeys.all, 'list', params], queryFn: () => onboardingApi.list(params), placeholderData: keepPreviousData });

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.num<Row>('employeeNumber', t('fields.employeeNumber')),
      col.text<Row>('name', t('fields.name'), { minWidth: 180 }),
      col.text<Row>('trackName', t('fields.track')),
      col.text<Row>('workSiteName', t('fields.workSite')),
      col.status<Row>('fileStatus', t('fields.status'), 'LaborStatus', { width: 120 }),
      col.status<Row>('onboardingStatus', t('onboarding.status'), 'OnboardingStatus', { width: 140 }),
      col.date<Row>('reportedStartDate', t('onboarding.reportedStartDate')),
      col.date<Row>('startDate', t('onboarding.startDate')),
      col.date<Row>('documentsDueDate', t('onboarding.documentsDue')),
      {
        field: 'missingCount',
        headerName: t('onboarding.missing'),
        width: 120,
        renderCell: (p) => (p.row.overdue ? <ToneChip tone="error" label={`${p.row.missingCount} · ${t('onboarding.overdue')}`} /> : p.row.missingCount),
      },
      { field: 'waitingParty', headerName: t('workflow.waitingFor'), width: 150, valueFormatter: (v: string | null) => label('LaborParty', v) },
    ],
    [label, t],
  );

  return (
    <Box>
      <PageHeader title={t('nav.items.onboarding')} subtitle={t('onboarding.subtitle')} />
      <Tabs value={list.filters.Stage} onChange={(_, v: string) => list.setFilter('Stage', v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        {ENUMS.OnboardingStage.map((s) => (
          <Tab key={s} value={s} label={label('OnboardingStage', s)} />
        ))}
      </Tabs>
      <FilterBar onReset={list.reset}>
        <SearchField label={t('common.search')} value={list.filters.Search} onCommit={(v) => list.setFilter('Search', v)} />
        <SelectField label={t('fields.track')} value={list.filters.TrackId} options={opts.tracks} onChange={(v) => list.setFilter('TrackId', v)} />
      </FilterBar>
      <ServerDataGrid<Row>
        data={query.data}
        loading={query.isFetching}
        error={query.error}
        getRowId={(r) => r.employeeId}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => navigate(`/workers/${r.employeeId}/onboarding`)}
        columns={columns}
      />
    </Box>
  );
}
