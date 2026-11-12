import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import type { GridColDef } from '@mui/x-data-grid';
import { candidatesApi, candidatesKeys } from '@/features/staffing/api';
import { useCandidateFields, type CandidateValues } from './candidateFields';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { FilterPanel } from '@/components/tables/FilterPanel';
import { clearFilters, isFiltered, type FilterDef } from '@/components/tables/filters';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { useAuth } from '@/app/providers/authContext';
import { useListState } from '@/hooks/useListState';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useScopeOptions } from '@/features/shared/options';
import { PERMISSIONS } from '@/constants/permissions';
import { ENUMS } from '@/constants/enums';
import type { Q, S } from '@/types/api';

type Row = S<'CandidateListItem'>;

/**
 * The candidate list (TL-N13): people recorded with their data, independent of any staffing request.
 * A candidate is nominated on a request (his nomination carries the status, interview and decision) and goes
 * back to the list when that nomination ends. The columns about a request describe his latest nomination and
 * are empty for a candidate who was never nominated or whose request is outside the user's scope.
 */
export default function CandidatesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useAuth();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const opts = useScopeOptions();
  const fields = useCandidateFields();
  const list = useListState({ Search: '', PoolStatus: '', Status: '', JobId: '', NationalityId: '', TrackId: '', RequestNumber: '' });
  const params = list.params as unknown as Q<'ListCandidates'>;
  const query = useQuery({ queryKey: candidatesKeys.list(params), queryFn: ({ signal }) => candidatesApi.list(params, signal), placeholderData: keepPreviousData });
  const add = useApiMutation((v: CandidateValues) => candidatesApi.add(v), { invalidate: [candidatesKeys.all], rethrow: true, success: t('candidates.added') });
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Search', kind: 'search', label: t('common.search'), wide: true },
    { key: 'PoolStatus', kind: 'select', label: t('candidates.poolStatus'), options: enumOptions('CandidatePoolStatus', ENUMS.CandidatePoolStatus) },
    { key: 'Status', kind: 'select', label: t('fields.status'), options: enumOptions('CandidateStatus', ENUMS.CandidateStatus) },
    { key: 'JobId', kind: 'select', label: t('candidates.candidateJob'), options: opts.jobs },
    { key: 'NationalityId', kind: 'select', label: t('fields.nationality'), options: opts.nationalities },
    { key: 'TrackId', kind: 'select', label: t('fields.track'), options: opts.tracks },
    { key: 'RequestNumber', kind: 'search', inputType: 'number', label: t('staffing.number') },
  ];

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.text<Row>('name', t('fields.name'), { minWidth: 180 }),
      col.text<Row>('phone', t('candidates.phone'), { minWidth: 130 }),
      col.text<Row>('nationalityName', t('fields.nationality')),
      col.text<Row>('candidateJobName', t('candidates.candidateJob')),
      col.status<Row>('poolStatus', t('candidates.poolStatus'), 'CandidatePoolStatus', { width: 170 }),
      col.num<Row>('requestNumber', t('staffing.number'), { width: 100 }),
      col.text<Row>('trackName', t('fields.track')),
      col.text<Row>('workSiteName', t('fields.workSite')),
      col.text<Row>('jobName', t('candidates.requestJob')),
      col.status<Row>('status', t('fields.status'), 'CandidateStatus', { width: 170 }),
      col.num<Row>('nominationCount', t('candidates.nominationCount'), { width: 100 }),
      col.text<Row>('nominatedBy', t('candidates.nominatedBy')),
      { field: 'recruitedBy', headerName: t('candidates.recruitedBy'), width: 140, valueFormatter: (v: string) => label('LaborParty', v) },
      col.dateTime<Row>('statusChangedAt', t('common.statusChangedAt')),
    ],
    [label, t],
  );

  return (
    <PageContainer>
      <PageHeader
        title={t('candidates.listTitle')}
        actions={
          can([PERMISSIONS.manageCandidates]) && (
            <ActionFormButton<CandidateValues>
              label={t('candidates.add')}
              variant="contained"
              startIcon={<PersonAddAlt1OutlinedIcon />}
              description={t('candidates.addHint')}
              fields={fields}
              onSubmit={(v) => add.mutateAsync(v)}
            />
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
        getRowId={(r) => r.id}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => navigate(`/candidates/${r.id}`)}
      />
    </PageContainer>
  );
}
