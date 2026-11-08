import { useState } from 'react';
import { Alert, Box, Button, Stack, Tab, Tabs } from '@mui/material';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { permitsApi, permitsKeys } from './api';
import { workersKeys } from '@/features/workers/api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState, LoadingState } from '@/components/common/States';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FileActionButton } from '@/components/common/FileButtons';
import { FilterPanel } from '@/components/tables/FilterPanel';
import { clearFilters, isFiltered, type FilterDef } from '@/components/tables/filters';
import { LocalDataGrid, ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { FormDialog } from '@/components/forms/FormDialog';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { col } from '@/components/tables/columns';
import { useListState } from '@/hooks/useListState';
import { useTabParam } from '@/hooks/useTabParam';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useScopeOptions } from '@/features/shared/options';
import { ENUMS } from '@/constants/enums';
import { todayIso } from '@/utils/format';
import type { Q, S } from '@/types/api';

const PERMIT_TABS = ['queue', 'permits'] as const;

export default function EntryPermitsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useTabParam(PERMIT_TABS, 'queue');
  return (
    <PageContainer>
      <PageHeader title={t('nav.items.permits')} />
      <Tabs
        value={tab}
        onChange={(_, v: (typeof PERMIT_TABS)[number]) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="queue" label={t('permits.distributionQueue')} />
        <Tab value="permits" label={t('permits.permits')} />
      </Tabs>
      {tab === 'queue' ? <DistributionQueueTab /> : <PermitsTab />}
    </PageContainer>
  );
}

type QItem = S<'DistributionQueueItem'>;

function DistributionQueueTab() {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: [...permitsKeys.all, 'queue'], queryFn: permitsApi.distributionQueue });
  const [worker, setWorker] = useState<QItem | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const bulk = useApiMutation(permitsApi.issueCurrentWorkers, {
    invalidate: [permitsKeys.all, workersKeys.all],
    success: false,
    onSuccess: (n) => setBulkResult(n),
  });
  const [bulkResult, setBulkResult] = useState<number | null>(null);

  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} />;
  const data = query.data!;
  return (
    <Stack spacing={2}>
      {data.activeWithoutPermit > 0 && (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={() => setConfirmBulk(true)}>
              {t('permits.issueCurrent')}
            </Button>
          }
        >
          {t('permits.activeWithoutPermit', { count: data.activeWithoutPermit })}
        </Alert>
      )}
      {bulkResult !== null && <Alert severity="success">{t('permits.issuedCount', { count: bulkResult })}</Alert>}
      <LocalDataGrid<QItem>
        rows={data.workers}
        getRowId={(r) => r.employeeId}
        emptyText={t('permits.queueEmpty')}
        columns={[
          col.num<QItem>('employeeNumber', t('fields.employeeNumber')),
          col.text<QItem>('name', t('fields.name'), { minWidth: 180, renderCell: (p) => <RouterLink to={`/workers/${p.row.employeeId}`}>{p.row.name}</RouterLink> }),
          col.text<QItem>('nationalityName', t('fields.nationality')),
          col.text<QItem>('trackName', t('fields.track')),
          col.text<QItem>('workSiteName', t('fields.workSite')),
          col.text<QItem>('jobName', t('fields.job')),
          col.date<QItem>('registeredOn', t('permits.registeredOn')),
          {
            field: 'actions',
            headerName: '',
            width: 170,
            sortable: false,
            renderCell: (p) => (
              <Button size="small" variant="contained" onClick={() => setWorker(p.row)} disabled={p.row.hasLivePermit}>
                {p.row.hasLivePermit ? t('permits.hasPermit') : t('permits.distributeIssue')}
              </Button>
            ),
          },
        ]}
      />
      {worker && <IssueDialog worker={worker} onClose={() => setWorker(null)} />}
      <ConfirmDialog
        open={confirmBulk}
        title={t('permits.issueCurrent')}
        message={t('permits.issueCurrentConfirm', { count: data.activeWithoutPermit })}
        loading={bulk.isPending}
        onClose={() => setConfirmBulk(false)}
        onConfirm={() => bulk.mutate(undefined, { onSettled: () => setConfirmBulk(false) })}
      />
    </Stack>
  );
}

function IssueDialog({ worker, onClose }: { worker: QItem; onClose: () => void }) {
  const { t } = useTranslation();
  const sites = useQuery({ queryKey: [...permitsKeys.all, 'sites', worker.employeeId], queryFn: () => permitsApi.distributionSites(worker.employeeId) });
  const issue = useApiMutation((v: S<'IssueEntryPermitRequest'>) => permitsApi.issue(worker.employeeId, v), {
    invalidate: [permitsKeys.all, workersKeys.all],
    rethrow: true,
    success: t('permits.issued'),
  });
  if (sites.isLoading) return null;
  const d = sites.data;
  const options = (d?.sites ?? []).map((s) => ({ value: s.id, label: `${s.number} — ${s.name ?? ''}` }));
  return (
    <FormDialog<S<'IssueEntryPermitRequest'>>
      open
      onClose={onClose}
      title={t('permits.distributeIssueFor', { name: worker.name })}
      description={
        <>
          {sites.error ? <ErrorState error={sites.error} /> : t('permits.issueHint')}
          {d?.livePermitNumber && <Alert severity="warning" sx={{ mt: 1 }}>{t('permits.liveWillBeReplaced', { n: d.livePermitNumber })}</Alert>}
          {d && !d.canChangeSite && <Alert severity="info" sx={{ mt: 1 }}>{t('permits.siteFixed')}</Alert>}
        </>
      }
      fields={[
        { name: 'workSiteId', kind: 'select', label: t('fields.workSite'), required: true, options: d?.canChangeSite === false && d.currentSite ? [{ value: d.currentSite.id, label: d.currentSite.name ?? '' }] : options },
        { name: 'issuedOn', kind: 'date', label: t('permits.issuedOn'), required: true },
      ]}
      defaultValues={{ workSiteId: d?.currentSite?.id ?? worker.workSiteId, issuedOn: todayIso() }}
      submitLabel={t('permits.issue')}
      onSubmit={(v) => issue.mutateAsync(v)}
    />
  );
}

type PItem = S<'EntryPermitListItem'>;

function PermitsTab() {
  const { t } = useTranslation();
  const enumOptions = useEnumOptions();
  const list = useListState({ Search: '', Status: '', TrackId: '', WorkSiteId: '' });
  const opts = useScopeOptions(list.filters.TrackId);
  const params = list.params as unknown as Q<'ListEntryPermits'>;
  const query = useQuery({ queryKey: permitsKeys.list(params), queryFn: ({ signal }) => permitsApi.list(params, signal), placeholderData: keepPreviousData });
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Search', kind: 'search', label: t('common.search') },
    { key: 'Status', kind: 'select', label: t('fields.status'), options: enumOptions('EntryPermitStatus', ENUMS.EntryPermitStatus) },
    { key: 'TrackId', kind: 'select', label: t('fields.track'), options: opts.tracks, clears: ['WorkSiteId'] },
    { key: 'WorkSiteId', kind: 'select', label: t('fields.workSite'), options: opts.sites },
  ];
  const [selected, setSelected] = useState<(string | number)[]>([]);
  const cancel = useApiMutation((v: { id: number; reason: string | null }) => permitsApi.cancel(v.id, { reason: v.reason }), {
    invalidate: [permitsKeys.all, workersKeys.all],
    rethrow: true,
  });

  return (
    <Box>
      <FilterPanel list={list} filters={filters}>
        <FileActionButton
          label={t('permits.printSelected', { count: selected.length })}
          fileName="entry-permits.pdf"
          disabled={selected.length === 0}
          icon={<PrintOutlinedIcon />}
          action={() => permitsApi.print(selected.map(Number))}
        />
      </FilterPanel>
      <ServerDataGrid<PItem>
        data={query.data}
        loading={query.isFetching}
        error={query.error}
        onRetry={query.refetch}
        filtered={isFiltered(list, filters)}
        onClearFilters={() => clearFilters(list, filters)}
        getRowId={(r) => r.permitId}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        checkboxSelection
        onSelectionChange={setSelected}
        columns={[
          col.num<PItem>('number', t('permits.number'), { width: 90 }),
          col.num<PItem>('employeeNumber', t('fields.employeeNumber')),
          col.text<PItem>('name', t('fields.name'), { minWidth: 170, renderCell: (p) => <RouterLink to={`/workers/${p.row.employeeId}`}>{p.row.name}</RouterLink> }),
          col.text<PItem>('trackName', t('fields.track')),
          col.text<PItem>('workSiteName', t('fields.workSite')),
          col.date<PItem>('issuedOn', t('permits.issuedOn')),
          col.date<PItem>('validUntil', t('permits.validUntil')),
          col.status<PItem>('status', t('fields.status'), 'EntryPermitStatus', { width: 110 }),
          {
            field: 'actions',
            headerName: '',
            width: 210,
            sortable: false,
            renderCell: (p) => (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
                <FileActionButton label={t('common.print')} variant="text" fileName={`permit-${p.row.number}.pdf`} action={() => permitsApi.printByNumber(p.row.number)} />
                {p.row.canManage && p.row.status === 'Valid' && (
                  <ActionFormButton<{ reason: string | null }>
                    label={t('common.cancel')}
                    size="small"
                    color="error"
                    variant="text"
                    dialogTitle={t('permits.cancel', { n: p.row.number })}
                    destructive
                    fields={[{ name: 'reason', kind: 'textarea', label: t('common.reason'), required: true, maxLength: 500 }]}
                    onSubmit={(v) => cancel.mutateAsync({ id: p.row.permitId, reason: v.reason })}
                  />
                )}
              </Stack>
            ),
          },
        ]}
      />
    </Box>
  );
}
