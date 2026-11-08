import { useState, useMemo } from 'react';
import { Button, Typography } from '@mui/material';
import { StatusChip } from '@/components/common/StatusChip';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { attendanceApi, attendanceKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { FilterPanel } from '@/components/tables/FilterPanel';
import { clearFilters, isFiltered, type FilterDef } from '@/components/tables/filters';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { FormDialog } from '@/components/forms/FormDialog';
import { col } from '@/components/tables/columns';
import { useListState } from '@/hooks/useListState';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useScopeOptions } from '@/features/shared/options';
import { ENUMS } from '@/constants/enums';
import { dateTimeFormat } from '@/utils/format';
import type { Q, S } from '@/types/api';

const MONTH_OPTS: Intl.DateTimeFormatOptions = { month: 'long' };
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

type Row = S<'AttendanceSheetListItem'>;

export default function AttendanceSheetsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const enumOptions = useEnumOptions();
  const now = new Date();
  const list = useListState({ Year: now.getFullYear(), Month: now.getMonth() + 1, TrackId: '', WorkSiteId: '', Status: 'All' });
  const opts = useScopeOptions(list.filters.TrackId);
  const params = list.params as unknown as Q<'ListAttendanceSheets'>;
  const query = useQuery({ queryKey: attendanceKeys.sheets(params), queryFn: ({ signal }) => attendanceApi.sheets(params, signal), placeholderData: keepPreviousData });
  const [toOpen, setToOpen] = useState<Row | null>(null);
  const open = useApiMutation(attendanceApi.open, { invalidate: [attendanceKeys.all], rethrow: true, success: t('attendance.opened'), onSuccess: (r) => navigate(`/attendance/sheets/${r.id}`) });
  const monthName = (m: number) => dateTimeFormat(MONTH_OPTS, i18n.language === 'ar' ? 'ar-LY' : 'en-GB').format(new Date(2000, m - 1, 1));
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Year', kind: 'search', inputType: 'number', label: t('attendance.year') },
    { key: 'Month', kind: 'select', label: t('attendance.month'), emptyLabel: false, options: MONTHS.map((m) => ({ value: m, label: monthName(m) })) },
    { key: 'Status', kind: 'select', label: t('fields.status'), emptyLabel: false, options: enumOptions('AttendanceSheetListStatus', ENUMS.AttendanceSheetListStatus) },
    { key: 'TrackId', kind: 'select', label: t('fields.track'), options: opts.tracks, clears: ['WorkSiteId'] },
    { key: 'WorkSiteId', kind: 'select', label: t('fields.workSite'), options: opts.sites },
  ];

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.text<Row>('trackName', t('fields.track')),
      { field: 'workSiteName', headerName: t('fields.workSite'), flex: 1, minWidth: 160, valueGetter: (_: unknown, r: Row) => `${r.workSiteNumber} — ${r.workSiteName ?? ''}` },
      col.num<Row>('workers', t('attendance.workers')),
      col.num<Row>('absentDays', t('attendance.absentDays')),
      {
        field: 'status',
        headerName: t('fields.status'),
        width: 140,
        renderCell: (p) =>
          p.row.status ? (
            <StatusChip enumName="AttendanceSheetStatus" value={p.row.status} />
          ) : (
            <Typography variant="caption" color="text.secondary">
              {t('attendance.notOpened')}
            </Typography>
          ),
      },
      col.text<Row>('supervisorName', t('attendance.supervisor')),
      col.date<Row>('submittedOn', t('attendance.submittedOn')),
      col.dateTime<Row>('receivedAt', t('attendance.receivedAt')),
      {
        field: 'actions',
        headerName: '',
        width: 140,
        sortable: false,
        renderCell: (p) =>
          p.row.sheetId ? (
            <Button size="small" onClick={() => navigate(`/attendance/sheets/${p.row.sheetId}`)}>
              {t('common.open')}
            </Button>
          ) : p.row.canOpen ? (
            <Button
              size="small"
              variant="contained"
              onClick={(e) => {
                e.stopPropagation();
                setToOpen(p.row);
              }}
            >
              {t('attendance.openSheet')}
            </Button>
          ) : null,
      },
    ],
    [navigate, t],
  );

  return (
    <PageContainer>
      <PageHeader title={t('nav.items.attendance')} />
      <FilterPanel list={list} filters={filters} />
      <ServerDataGrid<Row>
        data={query.data}
        loading={query.isFetching}
        error={query.error}
        onRetry={query.refetch}
        filtered={isFiltered(list, filters)}
        onClearFilters={() => clearFilters(list, filters)}
        getRowId={(r) => `${r.trackId}-${r.workSiteId}`}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => r.sheetId && navigate(`/attendance/sheets/${r.sheetId}`)}
        columns={columns}
      />
      {toOpen && (
        <FormDialog<{ supervisorName: string | null }>
          open
          onClose={() => setToOpen(null)}
          title={t('attendance.openSheetFor', { site: toOpen.workSiteName, month: monthName(list.filters.Month), year: list.filters.Year })}
          fields={[{ name: 'supervisorName', kind: 'text', label: t('attendance.supervisor'), maxLength: 200 }]}
          defaultValues={{ supervisorName: toOpen.supervisorName }}
          submitLabel={t('attendance.openSheet')}
          onSubmit={(v) =>
            open.mutateAsync({ trackId: toOpen.trackId, workSiteId: toOpen.workSiteId, year: list.filters.Year, month: list.filters.Month, supervisorName: v.supervisorName })
          }
        />
      )}
    </PageContainer>
  );
}
