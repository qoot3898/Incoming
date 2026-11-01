import { useMemo } from 'react';
import { Box, TextField } from '@mui/material';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { workersApi, workersKeys } from './api';
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
import { StatusChip, ToneChip } from '@/components/common/StatusChip';

type Row = S<'LaborWorkerListItem'>;

export default function WorkersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enumOptions = useEnumOptions();
  const list = useListState({ Text: '', Status: '', TrackId: '', WorkSiteId: '', JobId: '', NationalityId: '', ManagementId: '', StartFrom: '', StartTo: '', Sort: '' });
  const opts = useScopeOptions(list.filters.TrackId);
  const params = list.params as unknown as Q<'SearchLaborWorkers'>;
  const query = useQuery({ queryKey: workersKeys.list(params), queryFn: () => workersApi.search(params), placeholderData: keepPreviousData });

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.num<Row>('employeeNumber', t('fields.employeeNumber')),
      col.text<Row>('name', t('fields.name'), { minWidth: 200, flex: 1.4 }),
      col.text<Row>('nationalityName', t('fields.nationality')),
      col.text<Row>('passportNumber', t('fields.passportNumber')),
      col.text<Row>('trackName', t('fields.track')),
      col.text<Row>('workSiteName', t('fields.workSite')),
      col.text<Row>('jobName', t('fields.job')),
      col.date<Row>('startDate', t('fields.startDate')),
      col.status<Row>('status', t('fields.status'), 'LaborStatus', {
        renderCell: (p) => (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
            <StatusChip enumName="LaborStatus" value={p.row.status} />
            {p.row.onLeave && <ToneChip tone="warning" label={t('workers.onLeave')} />}
          </Box>
        ),
        width: 190,
      }),
    ],
    [t],
  );

  return (
    <Box>
      <PageHeader title={t('nav.items.workers')} subtitle={t('workers.subtitle')} />
      <FilterBar onReset={list.reset}>
        <SearchField label={t('workers.searchLabel')} value={list.filters.Text} onCommit={(v) => list.setFilter('Text', v)} sx={{ gridColumn: { md: 'span 2' } }} />
        <SelectField label={t('fields.status')} value={list.filters.Status} options={enumOptions('LaborStatus', ENUMS.LaborStatus)} onChange={(v) => list.setFilter('Status', v)} />
        <SelectField label={t('fields.track')} value={list.filters.TrackId} options={opts.tracks} onChange={(v) => list.setFilters({ ...list.filters, TrackId: v, WorkSiteId: '' })} />
        <SelectField label={t('fields.workSite')} value={list.filters.WorkSiteId} options={opts.sites} onChange={(v) => list.setFilter('WorkSiteId', v)} />
        <SelectField label={t('fields.job')} value={list.filters.JobId} options={opts.jobs} onChange={(v) => list.setFilter('JobId', v)} />
        <SelectField label={t('fields.nationality')} value={list.filters.NationalityId} options={opts.nationalities} onChange={(v) => list.setFilter('NationalityId', v)} />
        <SelectField label={t('fields.management')} value={list.filters.ManagementId} options={opts.managements} onChange={(v) => list.setFilter('ManagementId', v)} />
        <TextField type="date" label={t('workers.startFrom')} value={list.filters.StartFrom} onChange={(e) => list.setFilter('StartFrom', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label={t('workers.startTo')} value={list.filters.StartTo} onChange={(e) => list.setFilter('StartTo', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <SelectField
          label={t('workers.sort')}
          value={list.filters.Sort}
          emptyLabel={t('workers.sortDefault')}
          options={[
            { value: 'Number', label: t('workers.sortNumber') },
            { value: 'Name', label: t('workers.sortName') },
          ]}
          onChange={(v) => list.setFilter('Sort', v)}
        />
      </FilterBar>
      <ServerDataGrid<Row>
        columns={columns}
        data={query.data}
        loading={query.isFetching}
        error={query.error}
        getRowId={(r) => r.employeeId}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => navigate(`/workers/${r.employeeId}`)}
      />
    </Box>
  );
}
