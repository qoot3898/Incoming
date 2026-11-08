import { useState } from 'react';
import { Button, Chip, Grid2 as Grid, IconButton, List, ListItem, ListItemButton, ListItemText, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminKeys, laborSettingsApi } from '../api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState, EmptyState, LoadingState } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { ToneChip } from '@/components/common/StatusChip';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FormDialog } from '@/components/forms/FormDialog';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { useListState } from '@/hooks/useListState';
import { useTabParam } from '@/hooks/useTabParam';
import { FilterPanel } from '@/components/tables/FilterPanel';
import type { FilterDef } from '@/components/tables/filters';
import type { S } from '@/types/api';

const LABOR_TABS = ['tracks', 'scopes'] as const;

export default function LaborSettingsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useTabParam(LABOR_TABS, 'tracks');
  return (
    <PageContainer>
      <PageHeader title={t('nav.items.laborSettings')} />
      <Tabs value={tab} onChange={(_, v: (typeof LABOR_TABS)[number]) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="tracks" label={t('laborSettings.tracks')} />
        <Tab value="scopes" label={t('laborSettings.userScopes')} />
      </Tabs>
      {tab === 'tracks' ? <TracksTab /> : <ScopesTab />}
    </PageContainer>
  );
}

type Track = S<'LaborTrackItem'>;
type TrackValues = { number: number | null; name: string | null; managementId: number | null; isActive: boolean };

function TracksTab() {
  const { t } = useTranslation();
  const tracks = useQuery({ queryKey: [...adminKeys.labor, 'tracks'], queryFn: laborSettingsApi.tracks });
  const options = useQuery({ queryKey: [...adminKeys.labor, 'options'], queryFn: laborSettingsApi.options, staleTime: 300_000 });
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState<Track | 'new' | null>(null);
  const invalidate = [adminKeys.labor, ['shared']];
  const save = useApiMutation(laborSettingsApi.saveTrack, { invalidate, rethrow: true });

  if (tracks.isLoading) return <LoadingState />;
  if (tracks.error) return <ErrorState error={tracks.error} />;
  const list = tracks.data ?? [];
  const current = list.find((x) => x.id === selected) ?? list[0];
  const entry = editing && editing !== 'new' ? editing : null;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 5 }}>
        <SectionCard
          title={t('laborSettings.tracks')}
          action={
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')}>
              {t('laborSettings.addTrack')}
            </Button>
          }
          noPadding
        >
          {list.length === 0 ? (
            <EmptyState title={t('laborSettings.noTracks')} />
          ) : (
            <List disablePadding>
              {list.map((tr) => (
                <ListItem
                  key={tr.id}
                  disablePadding
                  divider
                  secondaryAction={
                    <Tooltip title={t('common.edit')}>
                      <IconButton size="small" onClick={() => setEditing(tr)} aria-label={t('common.edit')}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemButton selected={current?.id === tr.id} onClick={() => setSelected(tr.id)}>
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <span>
                            {tr.number} — {tr.name}
                          </span>
                          {!tr.isActive && <ToneChip tone="neutral" label={t('directories.inactive')} />}
                        </Stack>
                      }
                      secondary={`${tr.managementName ?? ''} · ${t('laborSettings.siteCount', { count: tr.siteCount })} · ${t('laborSettings.workerCount', { count: tr.activeWorkerCount })}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </SectionCard>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>{current && <TrackSites track={current} workSites={options.data?.workSites ?? []} />}</Grid>
      <FormDialog<TrackValues>
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={entry ? t('laborSettings.editTrack') : t('laborSettings.addTrack')}
        fields={[
          { name: 'number', kind: 'number', label: t('directories.number'), required: true, half: true, min: 1 },
          { name: 'name', kind: 'text', label: t('fields.name'), required: true, half: true, maxLength: 200 },
          { name: 'managementId', kind: 'select', label: t('fields.management'), required: true, options: (options.data?.managements ?? []).map((m) => ({ value: m.id, label: m.name ?? '', disabled: !m.isActive })) },
          { name: 'isActive', kind: 'boolean', label: t('directories.active') },
        ]}
        defaultValues={entry ? { number: entry.number, name: entry.name, managementId: entry.managementId, isActive: entry.isActive } : { isActive: true }}
        onSubmit={(v) => save.mutateAsync({ ...v, id: entry?.id ?? null, rowVersion: entry?.rowVersion ?? '' })}
      />
    </Grid>
  );
}

function TrackSites({ track, workSites }: { track: Track; workSites: S<'DirectoryChoice'>[] }) {
  const { t } = useTranslation();
  const key = [...adminKeys.labor, 'sites', track.id];
  const sites = useQuery({ queryKey: key, queryFn: () => laborSettingsApi.trackSites(track.id) });
  const invalidate = [adminKeys.labor, ['shared']];
  const add = useApiMutation((v: { workSiteId: number | null }) => laborSettingsApi.addTrackSite(track.id, v.workSiteId ?? 0), { invalidate, rethrow: true });
  const remove = useApiMutation((workSiteId: number) => laborSettingsApi.removeTrackSite(track.id, workSiteId), { invalidate });
  const [toRemove, setToRemove] = useState<S<'LaborTrackSiteItem'> | null>(null);
  const existing = new Set((sites.data ?? []).map((s) => s.workSiteId));
  type Site = S<'LaborTrackSiteItem'>;
  return (
    <SectionCard
      title={t('laborSettings.trackSites', { name: track.name })}
      action={
        <ActionFormButton<{ workSiteId: number | null }>
          label={t('laborSettings.addSite')}
          size="small"
          variant="contained"
          fields={[{ name: 'workSiteId', kind: 'select', label: t('fields.workSite'), required: true, options: workSites.filter((w) => !existing.has(w.id)).map((w) => ({ value: w.id, label: `${w.number} — ${w.name ?? ''}`, disabled: !w.isActive })) }]}
          onSubmit={(v) => add.mutateAsync(v)}
        />
      }
      noPadding
    >
      {sites.error ? (
        <ErrorState error={sites.error} />
      ) : (
        <LocalDataGrid<Site>
          rows={sites.data ?? []}
          loading={sites.isLoading}
          getRowId={(r) => r.workSiteId}
          emptyText={t('laborSettings.noSites')}
          columns={[
            { field: 'number', headerName: t('directories.number'), width: 90 },
            { field: 'name', headerName: t('fields.name'), flex: 1 },
            { field: 'activeWorkerCount', headerName: t('laborSettings.activeWorkers'), width: 130 },
            { field: 'isActive', headerName: t('directories.active'), width: 100, valueFormatter: (v: boolean) => (v ? t('common.yes') : t('common.no')) },
            {
              field: 'actions',
              headerName: '',
              width: 70,
              sortable: false,
              renderCell: (p) => (
                <Tooltip title={p.row.activeWorkerCount > 0 ? t('laborSettings.siteHasWorkers') : t('common.remove')}>
                  <span>
                    <IconButton size="small" disabled={p.row.activeWorkerCount > 0} onClick={() => setToRemove(p.row)} aria-label={t('common.remove')}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              ),
            },
          ]}
        />
      )}
      <ConfirmDialog
        open={!!toRemove}
        title={t('laborSettings.removeSite')}
        message={t('laborSettings.removeSiteConfirm', { site: toRemove?.name, track: track.name })}
        destructive
        loading={remove.isPending}
        onClose={() => setToRemove(null)}
        onConfirm={() => toRemove && remove.mutate(toRemove.workSiteId, { onSettled: () => setToRemove(null) })}
      />
    </SectionCard>
  );
}

function ScopesTab() {
  const { t } = useTranslation();
  const label = useEnumLabel();
  // Search and "include inactive" live in the URL like every other list (debounced by SearchField).
  const list = useListState({ search: '', includeInactive: false });
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'search', kind: 'search', label: t('common.search') },
    { key: 'includeInactive', kind: 'switch', label: t('laborSettings.includeInactive') },
  ];
  const params = { search: list.filters.search || undefined, includeInactive: list.filters.includeInactive };
  const scopes = useQuery({
    queryKey: [...adminKeys.labor, 'scopes', params],
    queryFn: ({ signal }) => laborSettingsApi.userScopes(params, signal),
    placeholderData: keepPreviousData,
  });
  const tracks = useQuery({ queryKey: [...adminKeys.labor, 'tracks'], queryFn: laborSettingsApi.tracks });
  const options = useQuery({ queryKey: [...adminKeys.labor, 'options'], queryFn: laborSettingsApi.options, staleTime: 300_000 });
  const invalidate = [adminKeys.labor, ['shared']];
  const add = useApiMutation(laborSettingsApi.addUserScope, { invalidate, rethrow: true });
  const remove = useApiMutation(laborSettingsApi.removeUserScope, { invalidate });
  const [addFor, setAddFor] = useState<S<'LaborUserScopeItem'> | null>(null);
  type Row = S<'LaborUserScopeItem'>;

  return (
    <Stack spacing={2}>
      <FilterPanel list={list} filters={filters} />
      {scopes.error ? (
        <ErrorState error={scopes.error} />
      ) : (
        <LocalDataGrid<Row>
          rows={scopes.data ?? []}
          loading={scopes.isLoading}
          getRowId={(r) => r.userId}
          columns={[
            { field: 'fullName', headerName: t('users.fullName'), flex: 1, minWidth: 160, valueGetter: (_: unknown, r: Row) => r.fullName || r.userName },
            { field: 'roles', headerName: t('users.roles'), flex: 1, minWidth: 160 },
            {
              field: 'scopes',
              headerName: t('laborSettings.scopes'),
              flex: 2,
              minWidth: 260,
              sortable: false,
              renderCell: (p) => (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center" sx={{ height: '100%', py: 0.5 }}>
                  {p.row.scopes.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {t('laborSettings.noScope')}
                    </Typography>
                  )}
                  {p.row.scopes.map((s) => (
                    <Chip key={s.scopeId} size="small" label={`${label('LaborUserScopeKind', s.kind)}: ${s.targetName ?? ''}`} onDelete={() => remove.mutate(s.scopeId)} />
                  ))}
                </Stack>
              ),
            },
            {
              field: 'actions',
              headerName: '',
              width: 120,
              sortable: false,
              renderCell: (p) => (
                <Button size="small" startIcon={<AddIcon />} onClick={() => setAddFor(p.row)}>
                  {t('laborSettings.addScope')}
                </Button>
              ),
            },
          ]}
        />
      )}
      <FormDialog<{ trackId: number | null; workSiteId: number | null }>
        open={!!addFor}
        onClose={() => setAddFor(null)}
        title={t('laborSettings.addScopeFor', { name: addFor?.fullName || addFor?.userName })}
        description={t('laborSettings.addScopeHint')}
        fields={[
          { name: 'trackId', kind: 'select', label: t('fields.track'), options: (tracks.data ?? []).map((x) => ({ value: x.id, label: x.name ?? '' })) },
          { name: 'workSiteId', kind: 'select', label: t('fields.workSite'), options: (options.data?.workSites ?? []).map((x) => ({ value: x.id, label: `${x.number} — ${x.name ?? ''}` })) },
        ]}
        onSubmit={(v) => {
          if (!v.trackId === !v.workSiteId) return Promise.reject({ title: t('laborSettings.scopeOneOf'), fieldErrors: {} });
          return add.mutateAsync({ userId: addFor!.userId, trackId: v.trackId, workSiteId: v.workSiteId });
        }}
      />
    </Stack>
  );
}
