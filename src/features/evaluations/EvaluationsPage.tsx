import { Box, Button, Tab, Tabs } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { evaluationsApi, evaluationsKeys } from './api';
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
import { formatDate } from '@/utils/format';
import type { Q, S } from '@/types/api';

type Due = S<'EvaluationDueItem'>;
type Row = S<'EvaluationListItem'>;

export default function EvaluationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const list = useListState({ Tab: 'Due', Search: '', TrackId: '', WorkSiteId: '', Result: '' });
  const opts = useScopeOptions(list.filters.TrackId);
  const isDue = list.filters.Tab === 'Due';
  const params = list.params as unknown as Q<'ListEvaluations'>;
  const due = useQuery({ queryKey: [...evaluationsKeys.all, 'due', params], queryFn: () => evaluationsApi.due(params), placeholderData: keepPreviousData, enabled: isDue });
  const all = useQuery({ queryKey: [...evaluationsKeys.all, 'list', params], queryFn: () => evaluationsApi.list(params), placeholderData: keepPreviousData, enabled: !isDue });

  const paging = { page: list.page, pageSize: list.pageSize, onPageChange: list.setPage, onPageSizeChange: list.setPageSize };

  return (
    <Box>
      <PageHeader
        title={t('nav.items.evaluations')}
        subtitle={t('evaluations.subtitle')}
        actions={
          <Button component={RouterLink} to="/evaluations/new" variant="contained" startIcon={<AddIcon />}>
            {t('evaluations.new')}
          </Button>
        }
      />
      <Tabs value={list.filters.Tab} onChange={(_, v: string) => list.setFilter('Tab', v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        {ENUMS.EvaluationTab.map((tab) => (
          <Tab key={tab} value={tab} label={label('EvaluationTab', tab)} />
        ))}
      </Tabs>
      <FilterBar onReset={list.reset}>
        <SearchField label={t('common.search')} value={list.filters.Search} onCommit={(v) => list.setFilter('Search', v)} />
        <SelectField label={t('fields.track')} value={list.filters.TrackId} options={opts.tracks} onChange={(v) => list.setFilters({ ...list.filters, TrackId: v, WorkSiteId: '' })} />
        <SelectField label={t('fields.workSite')} value={list.filters.WorkSiteId} options={opts.sites} onChange={(v) => list.setFilter('WorkSiteId', v)} />
        {!isDue && <SelectField label={t('evaluations.result')} value={list.filters.Result} options={enumOptions('EvaluationResult', ENUMS.EvaluationResult)} onChange={(v) => list.setFilter('Result', v)} />}
      </FilterBar>
      {isDue ? (
        <ServerDataGrid<Due>
          {...paging}
          data={due.data}
          loading={due.isFetching}
          error={due.error}
          getRowId={(r) => r.employeeId}
          onRowClick={(r) => navigate(`/evaluations/new?employeeNumber=${r.employeeNumber}`)}
          columns={[
            col.num<Due>('employeeNumber', t('fields.employeeNumber')),
            col.text<Due>('name', t('fields.name'), { minWidth: 170 }),
            col.text<Due>('siteName', t('fields.workSite')),
            col.text<Due>('jobName', t('fields.job')),
            col.date<Due>('startDate', t('fields.startDate')),
            { field: 'dueDate', headerName: t('evaluations.dueDate'), width: 160, renderCell: (p) => (p.row.late ? <ToneChip tone="error" label={`${formatDate(p.row.dueDate)} · ${t('tasks.late')}`} /> : formatDate(p.row.dueDate)) },
            { field: 'go', headerName: '', width: 130, sortable: false, renderCell: () => <Button size="small">{t('evaluations.evaluate')}</Button> },
          ]}
        />
      ) : (
        <ServerDataGrid<Row>
          {...paging}
          data={all.data}
          loading={all.isFetching}
          error={all.error}
          getRowId={(r) => r.id}
          onRowClick={(r) => navigate(`/evaluations/${r.id}`)}
          columns={[
            col.num<Row>('employeeNumber', t('fields.employeeNumber')),
            col.text<Row>('name', t('fields.name'), { minWidth: 170 }),
            col.text<Row>('siteName', t('fields.workSite')),
            col.date<Row>('evaluationDate', t('evaluations.date')),
            col.text<Row>('evaluatorName', t('evaluations.evaluator')),
            col.status<Row>('result', t('evaluations.result'), 'EvaluationResult', { width: 120 }),
            { field: 'recommendation', headerName: t('evaluations.recommendation'), width: 160, valueFormatter: (v: string | null) => label('EvaluationRecommendation', v) },
            { field: 'review', headerName: t('evaluations.review'), width: 160, valueFormatter: (v: string | null) => (v ? label('EvaluationReview', v) : t('evaluations.notReviewed')) },
          ]}
        />
      )}
    </Box>
  );
}
