import { useMemo } from 'react';
import { Box, Button, Chip, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { penaltiesApi, penaltiesKeys } from './api';
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

type Row = S<'PenaltyListItem'>;

export default function PenaltiesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const opts = useScopeOptions();
  const list = useListState({ Status: '', Violation: '', Decision: '', WorkSiteId: '', From: '', To: '', Search: '' });
  const params = list.params as unknown as Q<'ListPenalties'>;
  const query = useQuery({ queryKey: [...penaltiesKeys.all, 'list', params], queryFn: () => penaltiesApi.list(params), placeholderData: keepPreviousData });
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
    <Box>
      <PageHeader
        title={t('nav.items.penalties')}
        subtitle={t('penalties.subtitle')}
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
      <FilterBar onReset={list.reset}>
        <SearchField label={t('common.search')} value={list.filters.Search} onCommit={(v) => list.setFilter('Search', v)} />
        <SelectField label={t('fields.status')} value={list.filters.Status} options={enumOptions('PenaltyStatus', ENUMS.PenaltyStatus)} onChange={(v) => list.setFilter('Status', v)} />
        <SelectField label={t('penalties.violation')} value={list.filters.Violation} options={enumOptions('PenaltyViolation', ENUMS.PenaltyViolation)} onChange={(v) => list.setFilter('Violation', v)} />
        <SelectField label={t('penalties.decision')} value={list.filters.Decision} options={enumOptions('PenaltyDecision', ENUMS.PenaltyDecision)} onChange={(v) => list.setFilter('Decision', v)} />
        <SelectField label={t('fields.workSite')} value={list.filters.WorkSiteId} options={opts.sites} onChange={(v) => list.setFilter('WorkSiteId', v)} />
        <TextField type="date" label={t('common.from')} value={list.filters.From} onChange={(e) => list.setFilter('From', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label={t('common.to')} value={list.filters.To} onChange={(e) => list.setFilter('To', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </FilterBar>
      <ServerDataGrid<Row>
        data={d?.page}
        loading={query.isFetching}
        error={query.error}
        getRowId={(r) => r.penaltyId}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => navigate(`/penalties/${r.penaltyId}`)}
        columns={columns}
      />
    </Box>
  );
}
