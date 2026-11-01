import { useMemo } from 'react';
import { Box, Button, Stack } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { attendanceApi, attendanceKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/tables/FilterBar';
import { SearchField } from '@/components/tables/SearchField';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { SelectField } from '@/components/forms/SelectField';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { col } from '@/components/tables/columns';
import { ToneChip } from '@/components/common/StatusChip';
import { useListState } from '@/hooks/useListState';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useScopeOptions } from '@/features/shared/options';
import { ENUMS } from '@/constants/enums';
import { tasksKeys } from '@/features/tasks/api';
import type { Q, S } from '@/types/api';

type Row = S<'AbsenceIncidentListItem'>;

export default function AbsenceIncidentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enumOptions = useEnumOptions();
  const list = useListState({ Search: '', Status: 'Open', TrackId: '', WorkSiteId: '' });
  const opts = useScopeOptions(list.filters.TrackId);
  const params = list.params as unknown as Q<'ListAbsenceIncidents'>;
  const query = useQuery({ queryKey: [...attendanceKeys.all, 'incidents', params], queryFn: () => attendanceApi.incidents(params), placeholderData: keepPreviousData });
  const excuse = useApiMutation((v: S<'ExcuseAbsenceIncidentRequest'> & { id: number }) => attendanceApi.excuse(v.id, v), {
    invalidate: [attendanceKeys.all, tasksKeys.all],
    rethrow: true,
  });

  const excuseAsync = excuse.mutateAsync;
  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.num<Row>('employeeNumber', t('fields.employeeNumber')),
      col.text<Row>('name', t('fields.name'), { minWidth: 170, renderCell: (p) => <RouterLink to={`/workers/${p.row.employeeId}`}>{p.row.name}</RouterLink> }),
      col.text<Row>('workSiteName', t('fields.workSite')),
      col.date<Row>('firstDate', t('incidents.firstDate')),
      col.date<Row>('lastDate', t('incidents.lastDate')),
      {
        field: 'days',
        headerName: t('common.days'),
        width: 120,
        renderCell: (p) => (p.row.atThreshold ? <ToneChip tone="error" label={`${p.row.days} · ${t('incidents.threshold')}`} /> : p.row.days),
      },
      col.status<Row>('status', t('fields.status'), 'AbsenceIncidentStatus', { width: 120 }),
      col.text<Row>('reportedBy', t('incidents.reportedBy')),
      col.text<Row>('resolution', t('incidents.resolution')),
      {
        field: 'actions',
        headerName: '',
        minWidth: 330,
        flex: 1,
        sortable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
            {p.row.canExcuse && (
              <ActionFormButton<{ resolution: string | null; recodeDays: boolean }>
                label={t('incidents.excuse')}
                size="small"
                description={t('incidents.excuseHint')}
                fields={[
                  { name: 'resolution', kind: 'textarea', label: t('incidents.resolutionRef'), required: true, maxLength: 500 },
                  { name: 'recodeDays', kind: 'boolean', label: t('incidents.recodeDays') },
                ]}
                defaultValues={{ recodeDays: true }}
                onSubmit={(v) => excuseAsync({ id: p.row.id, resolution: v.resolution, recodeDays: v.recodeDays })}
              />
            )}
            {p.row.status === 'Open' && !p.row.penaltyId && (
              <Button size="small" onClick={() => navigate(`/penalties/new?incidentId=${p.row.id}`)}>
                {t('incidents.toPenalty')}
              </Button>
            )}
            {p.row.status === 'Open' && !p.row.terminationId && p.row.atThreshold && (
              <Button size="small" color="error" onClick={() => navigate(`/terminations/new?employeeId=${p.row.employeeId}&incidentId=${p.row.id}`)}>
                {t('incidents.toTermination')}
              </Button>
            )}
            {p.row.penaltyId && (
              <Button size="small" component={RouterLink} to={`/penalties/${p.row.penaltyId}`}>
                {t('incidents.viewPenalty')}
              </Button>
            )}
            {p.row.terminationId && (
              <Button size="small" component={RouterLink} to={`/terminations/${p.row.terminationId}`}>
                {t('incidents.viewTermination')}
              </Button>
            )}
          </Stack>
        ),
      },
    ],
    [excuseAsync, navigate, t],
  );

  return (
    <Box>
      <PageHeader title={t('nav.items.incidents')} subtitle={t('incidents.subtitle')} />
      <FilterBar onReset={list.reset}>
        <SearchField label={t('common.search')} value={list.filters.Search} onCommit={(v) => list.setFilter('Search', v)} />
        <SelectField label={t('fields.status')} value={list.filters.Status} emptyLabel={false} options={enumOptions('AbsenceIncidentListStatus', ENUMS.AbsenceIncidentListStatus)} onChange={(v) => list.setFilter('Status', v)} />
        <SelectField label={t('fields.track')} value={list.filters.TrackId} options={opts.tracks} onChange={(v) => list.setFilters({ ...list.filters, TrackId: v, WorkSiteId: '' })} />
        <SelectField label={t('fields.workSite')} value={list.filters.WorkSiteId} options={opts.sites} onChange={(v) => list.setFilter('WorkSiteId', v)} />
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
        columns={columns}
      />
    </Box>
  );
}
