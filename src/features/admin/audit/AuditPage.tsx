import { useMemo, useState } from 'react';
import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { adminKeys, auditApi } from '../api';
import { AuditEntryDialog } from './AuditEntryDialog';
import { parseAuditChanges } from './auditChanges';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { FilterPanel } from '@/components/tables/FilterPanel';
import { clearFilters, isFiltered, splitMulti, type FilterDef } from '@/components/tables/filters';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { useListState, type FilterValue } from '@/hooks/useListState';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { ENUMS } from '@/constants/enums';
import type { Q, S } from '@/types/api';

type Row = S<'AuditLogItem'>;

const DEFAULTS = {
  Search: '',
  ActorUserId: '',
  ActionCodes: '',
  Module: '',
  EntityType: '',
  EntityId: '',
  Outcome: '',
  IpAddress: '',
  CorrelationId: '',
  From: '',
  To: '',
  IncludeChanges: false,
};
type Filters = typeof DEFAULTS;

/** One-click views from frontend-guide §7 (sign-ins, failed sign-ins, refused access). */
const PRESETS: { key: string; patch: Partial<Filters> }[] = [
  { key: 'signIns', patch: { ActionCodes: 'Auth.LoginSucceeded,Auth.Logout' } },
  { key: 'failedSignIns', patch: { ActionCodes: 'Auth.LoginFailed' } },
  { key: 'denied', patch: { Outcome: 'Denied' } },
];

/** Users' activity on the system (TL-N6): every sign-in, refusal, change (old → new) and restricted file opening. */
export default function AuditPage() {
  const { t } = useTranslation();
  const enumOptions = useEnumOptions();
  const list = useListState(DEFAULTS);
  const options = useQuery({ queryKey: adminKeys.auditOptions, queryFn: auditApi.options, staleTime: 5 * 60_000 });
  const params = useMemo(() => {
    const { ActionCodes, IncludeChanges, ...rest } = list.params;
    return { ...rest, ActionCodes: splitMulti(ActionCodes), IncludeChanges: IncludeChanges || undefined } as unknown as Q<'SearchAudit'>;
  }, [list.params]);
  const query = useQuery({ queryKey: adminKeys.auditList(params), queryFn: ({ signal }) => auditApi.search(params, signal), placeholderData: keepPreviousData });
  const [selected, setSelected] = useState<Row | null>(null);

  const o = options.data;
  const filters = useMemo<FilterDef<Filters>[]>(() => {
    const actors = (o?.actors ?? []).map((a) => ({
      value: a.id,
      label: `${a.fullName || a.userName || a.id}${a.userName && a.fullName ? ` (${a.userName})` : ''}${a.isActive ? '' : ` — ${t('users.inactive')}`}`,
    }));
    const actions = (o?.actions ?? []).filter((a) => a.code).map((a) => ({ value: a.code!, label: a.name || a.code!, group: a.module ?? undefined }));
    const plain = (values: (string | null)[] = []) => values.filter((v): v is string => !!v).map((v) => ({ value: v, label: v }));
    return [
      { key: 'Search', kind: 'search', label: t('audit.search'), wide: true },
      { key: 'ActorUserId', kind: 'select', label: t('audit.actor'), options: actors },
      { key: 'ActionCodes', kind: 'multiselect', label: t('audit.actions'), options: actions, wide: true },
      { key: 'Module', kind: 'select', label: t('audit.module'), options: plain(o?.modules) },
      { key: 'Outcome', kind: 'select', label: t('audit.outcome'), options: enumOptions('AuditOutcome', ENUMS.AuditOutcome) },
      { key: 'EntityType', kind: 'select', label: t('audit.entityType'), options: plain(o?.entityTypes) },
      { key: 'EntityId', kind: 'search', label: t('audit.entityId') },
      { key: 'IpAddress', kind: 'search', label: t('audit.ipPrefix') },
      { key: 'CorrelationId', kind: 'search', label: t('audit.correlationId') },
      { key: 'From', kind: 'date', label: t('common.from') },
      { key: 'To', kind: 'date', label: t('common.to') },
      { key: 'IncludeChanges', kind: 'switch', label: t('audit.includeChanges') },
    ];
  }, [o, t, enumOptions]);

  const applyPreset = (patch: Partial<Filters>) => {
    // A preset replaces the panel's filters (keeps the page size) in one history entry.
    const cleared = Object.fromEntries(filters.map((f) => [f.key, DEFAULTS[f.key]])) as Record<string, FilterValue>;
    list.setFilters({ ...cleared, ...patch } as Partial<Filters>);
  };
  const presetActive = (patch: Partial<Filters>) => Object.entries(patch).every(([k, v]) => String(list.filters[k as keyof Filters]) === String(v));

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.dateTime<Row>('occurredAt', t('audit.occurredAt'), { width: 170 }),
      {
        field: 'actorName',
        headerName: t('audit.actor'),
        flex: 1,
        minWidth: 160,
        renderCell: (p) => (
          <Box sx={{ lineHeight: 1.3, py: 0.75, minWidth: 0 }}>
            <Typography variant="body2" noWrap>
              {p.row.actorName || '—'}
            </Typography>
            {p.row.actorUserName && (
              <Typography variant="caption" color="text.secondary" noWrap component="div" dir="ltr" sx={{ textAlign: 'start' }}>
                {p.row.actorUserName}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: 'actionName',
        headerName: t('audit.action'),
        flex: 1,
        minWidth: 170,
        renderCell: (p) => (
          <Tooltip title={p.row.actionCode ?? ''}>
            <span>{p.row.actionName || p.row.actionCode || '—'}</span>
          </Tooltip>
        ),
      },
      { field: 'entity', headerName: t('audit.entity'), width: 170, valueGetter: (_: unknown, r: Row) => [r.entityType, r.entityId].filter(Boolean).join(' #') || '—' },
      col.text<Row>('summary', t('audit.summary'), { flex: 2, minWidth: 220 }),
      col.status<Row>('outcome', t('audit.outcome'), 'AuditOutcome', { width: 110 }),
      { ...col.text<Row>('ipAddress', t('audit.ip'), { width: 130, flex: 0 }), renderCell: (p) => <bdi dir="ltr">{p.row.ipAddress ?? '—'}</bdi> },
      {
        field: 'changes',
        headerName: t('audit.changes'),
        width: 110,
        valueGetter: (_: unknown, r: Row) => parseAuditChanges(r.changes).length || null,
        valueFormatter: (v: number | null) => (v ? t('audit.changedEntities', { count: v }) : '—'),
      },
    ],
    [t],
  );

  return (
    <PageContainer>
      <PageHeader title={t('nav.items.audit')} />
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }} role="group" aria-label={t('audit.presets')}>
        {PRESETS.map((p) => {
          const active = presetActive(p.patch);
          return (
            <Chip
              key={p.key}
              clickable
              label={t(`audit.preset.${p.key}`)}
              color={active ? 'primary' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              onClick={() => (active ? list.reset(filters.map((f) => f.key)) : applyPreset(p.patch))}
            />
          );
        })}
      </Stack>
      <FilterPanel list={list} filters={filters} />
      <ServerDataGrid<Row>
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
        onRowClick={setSelected}
        columns={columns}
      />
      {selected && (
        <AuditEntryDialog
          row={selected}
          onClose={() => setSelected(null)}
          onFilter={(patch) => {
            setSelected(null);
            applyPreset(patch as Partial<Filters>);
          }}
        />
      )}
    </PageContainer>
  );
}
