import { useMemo, useState } from 'react';
import { Alert, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import LocationOffOutlinedIcon from '@mui/icons-material/LocationOffOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { adminKeys, laborSettingsApi } from '../api';
import { ChangeCapacityDialog } from './ChangeCapacityDialog';
import { CapacityHistoryDialog } from './CapacityHistoryDialog';
import { capacityState, overCapacityCount, type CapacityState } from './capacity';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/States';
import { ToneChip } from '@/components/common/StatusChip';
import { FilterPanel } from '@/components/tables/FilterPanel';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import type { FilterDef } from '@/components/tables/filters';
import { useAuth } from '@/app/providers/authContext';
import { useListState } from '@/hooks/useListState';
import { PERMISSIONS } from '@/constants/permissions';
import { formatDateTime } from '@/utils/format';
import type { S } from '@/types/api';

type Site = S<'SiteCapacityItem'>;

const TONES = { unlimited: 'neutral', available: 'success', full: 'warning', over: 'error' } as const satisfies Record<CapacityState, string>;

function matches(site: Site, search: string): boolean {
  const q = search.trim().toLowerCase();
  return !q || String(site.number).includes(q) || (site.name ?? '').toLowerCase().includes(q);
}

/** The site's name; a site without coordinates is flagged, as it is skipped when suggestions are ordered by distance. */
function SiteNameCell({ site }: { site: Site }) {
  const { t } = useTranslation();
  const hasCoordinates = site.latitude !== null && site.longitude !== null;
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, height: '100%' }}>
      <Typography variant="body2" noWrap>
        {site.name}
      </Typography>
      {!hasCoordinates && (
        <Tooltip title={t('capacity.noCoordinates')}>
          <LocationOffOutlinedIcon fontSize="small" color="warning" aria-label={t('capacity.noCoordinates')} role="img" />
        </Tooltip>
      )}
    </Stack>
  );
}

function RowActions({ site, canChange, onChange, onHistory }: { site: Site; canChange: boolean; onChange: (s: Site) => void; onHistory: (s: Site) => void }) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" sx={{ alignItems: 'center', height: '100%' }}>
      {canChange && (
        <Tooltip title={t('capacity.change')}>
          <IconButton size="small" color="primary" onClick={() => onChange(site)} aria-label={`${t('capacity.change')}: ${site.name ?? site.number}`}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title={t('capacity.history')}>
        <IconButton size="small" onClick={() => onHistory(site)} aria-label={`${t('capacity.history')}: ${site.name ?? site.number}`}>
          <HistoryOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

function useSiteColumns(onChange: (s: Site) => void, onHistory: (s: Site) => void, canChange: boolean): GridColDef<Site>[] {
  const { t } = useTranslation();
  return useMemo(
    () => [
      col.num<Site>('number', t('directories.number'), { width: 90 }),
      { field: 'name', headerName: t('fields.name'), flex: 1, minWidth: 170, renderCell: (p) => <SiteNameCell site={p.row} /> },
      col.num<Site>('capacity', t('capacity.capacity'), { width: 100, valueFormatter: (v: number | null) => (v === null ? t('capacity.unlimited') : String(v)) }),
      col.num<Site>('occupancy', t('capacity.occupancy'), { width: 100 }),
      col.num<Site>('freePlaces', t('capacity.freePlacesColumn'), { width: 135, valueFormatter: (v: number | null) => (v === null ? '—' : String(v)) }),
      {
        field: 'state',
        headerName: t('fields.status'),
        width: 150,
        sortable: false,
        valueGetter: (_: unknown, r: Site) => capacityState(r),
        renderCell: (p) => {
          const state = p.value as CapacityState;
          return <ToneChip tone={TONES[state]} label={state === 'over' ? t('capacity.states.over', { count: p.row.overCapacity }) : t(`capacity.states.${state}`)} />;
        },
      },
      {
        field: 'lastChange',
        headerName: t('capacity.lastChange'),
        flex: 1,
        minWidth: 170,
        valueGetter: (_: unknown, r: Site) => (r.lastChange ? `${formatDateTime(r.lastChange.changedAt)} — ${r.lastChange.changedBy}` : '—'),
      },
      {
        field: 'actions',
        headerName: '',
        width: canChange ? 96 : 56,
        sortable: false,
        renderCell: (p) => <RowActions site={p.row} canChange={canChange} onChange={onChange} onHistory={onHistory} />,
      },
    ],
    [t, onChange, onHistory, canChange],
  );
}

/**
 * Site capacities (TL-N7): the most workers with an open file a site may hold, its occupancy, and the
 * history of changes. Settings managers read; only `ManageSiteCapacity` changes a capacity or opens a decision.
 */
export default function SiteCapacitiesPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const canChange = can([PERMISSIONS.manageSiteCapacity]);
  const list = useListState({ search: '' });
  const filters: FilterDef<typeof list.filters>[] = [{ key: 'search', kind: 'search', label: t('common.search') }];
  const query = useQuery({ queryKey: adminKeys.siteCapacities, queryFn: laborSettingsApi.siteCapacities });
  // Both dialogs read the site from the list, so a reload shows the new capacity and row version.
  const [changingId, setChangingId] = useState<number | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const sites = useMemo(() => query.data ?? [], [query.data]);
  const columns = useSiteColumns((s) => setChangingId(s.workSiteId), (s) => setHistoryId(s.workSiteId), canChange);
  const rows = useMemo(() => sites.filter((s) => matches(s, list.filters.search)), [sites, list.filters.search]);
  const over = overCapacityCount(sites);
  const changing = sites.find((s) => s.workSiteId === changingId);
  const history = sites.find((s) => s.workSiteId === historyId);

  return (
    <PageContainer>
      <PageHeader title={t('nav.items.siteCapacities')} />
      <Stack spacing={2}>
        {over > 0 && <Alert severity="warning">{t('capacity.overCapacityAlert', { count: over })}</Alert>}
        <FilterPanel list={list} filters={filters} />
        {query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <LocalDataGrid<Site> rows={rows} loading={query.isLoading} getRowId={(r) => r.workSiteId} columns={columns} />}
      </Stack>
      {changing && <ChangeCapacityDialog site={changing} onClose={() => setChangingId(null)} />}
      {history && <CapacityHistoryDialog site={history} canOpenFiles={canChange} onClose={() => setHistoryId(null)} />}
    </PageContainer>
  );
}
