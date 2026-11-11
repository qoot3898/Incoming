import { useCallback, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, Paper, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { keepPreviousData, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { adminKeys, directoriesApi } from '../api';
import { entryFields, extraValues, isBaseEntry, type Entry, type EntryValues } from './directoryFields';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState, EmptyState, LoadingState } from '@/components/common/States';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ToneChip } from '@/components/common/StatusChip';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { FilterPanel } from '@/components/tables/FilterPanel';
import type { FilterDef } from '@/components/tables/filters';
import { FormDialog } from '@/components/forms/FormDialog';
import { SelectField } from '@/components/forms/SelectField';
import { col } from '@/components/tables/columns';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useListState } from '@/hooks/useListState';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { DIRECTORY_RULES, DIRECTORY_SLUGS, type DirectoryRules } from '@/constants/directories';
import type { Q, S } from '@/types/api';

type Listing = S<'DirectoryListing'>;

export default function DirectoriesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const slug = useParams().slug ?? DIRECTORY_SLUGS[0] ?? '';
  const [custom, setCustom] = useState('');

  return (
    <PageContainer>
      <PageHeader title={t('nav.items.directories')} />
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          {DIRECTORY_SLUGS.length > 0 && (
            <SelectField
              label={t('directories.directory')}
              value={DIRECTORY_SLUGS.includes(slug) ? slug : ''}
              emptyLabel={t('directories.choose')}
              options={DIRECTORY_SLUGS.map((s) => ({ value: s, label: t(`directories.lists.${s}`, { defaultValue: s }) }))}
              onChange={(v) => navigate(`/admin/directories/${v}`)}
              sx={{ maxWidth: 320 }}
            />
          )}
          <Stack
            direction="row"
            spacing={1}
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (custom.trim()) navigate(`/admin/directories/${encodeURIComponent(custom.trim())}`);
            }}
          >
            <TextField label={t('directories.slug')} value={custom} onChange={(e) => setCustom(e.target.value)} sx={{ maxWidth: 260 }} slotProps={{ htmlInput: { dir: 'ltr' } }} />
            <Button type="submit" variant="outlined">
              {t('common.open')}
            </Button>
          </Stack>
        </Stack>
        {DIRECTORY_SLUGS.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {t('directories.slugsNotConfigured')}
          </Typography>
        )}
      </Paper>
      {slug ? (
        // Keyed by slug: each list starts with its own state (and its own search in the URL).
        <Directory key={slug} slug={slug} />
      ) : (
        <Paper variant="outlined">
          <EmptyState title={t('directories.choose')} />
        </Paper>
      )}
    </PageContainer>
  );
}

function Directory({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const rules = DIRECTORY_RULES[slug];
  const list = useListState({ Search: '', Active: '' });
  const { Search, Active } = list.filters;
  const params = useMemo<Q<'ListDirectoryEntries'>>(() => ({ Search: Search || undefined, Active: Active === '' ? undefined : Active === 'true' }), [Search, Active]);
  const key = useMemo(() => [...adminKeys.directories, slug], [slug]);
  const q = useQuery({ queryKey: [...key, params], queryFn: ({ signal }) => directoriesApi.list(slug, params, signal), placeholderData: keepPreviousData });
  const invalidate = useMemo<QueryKey[]>(() => [key, ['shared'], ['registration']], [key]);
  const { mutate: toggleActive } = useApiMutation((v: { id: number; active: boolean }) => directoriesApi.setActive(slug, v.id, { active: v.active }), { invalidate });
  const remove = useApiMutation((id: number) => directoriesApi.remove(slug, id), { invalidate });
  const [editing, setEditing] = useState<Entry | 'new' | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Entry | null>(null);

  // Edit from the entry's current state (fresh rowVersion), so a stale list row does not end in a conflict.
  const openEdit = useCallback(
    async (row: Entry) => {
      setOpening(row.id);
      try {
        setEditing(await qc.fetchQuery({ queryKey: [...key, 'entry', row.id], queryFn: () => directoriesApi.get(slug, row.id), staleTime: 0 }));
      } catch {
        setEditing(row);
      } finally {
        setOpening(null);
      }
    },
    [qc, key, slug],
  );

  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Search', kind: 'search', label: t('directories.search'), wide: true },
    {
      key: 'Active',
      kind: 'select',
      label: t('directories.state'),
      options: [
        { value: 'true', label: t('directories.active') },
        { value: 'false', label: t('directories.inactive') },
      ],
    },
  ];
  const columns = useDirectoryColumns(q.data, rules, { opening, onEdit: openEdit, onToggle: toggleActive, onDelete: setToDelete });

  if (q.isLoading) return <LoadingState />;
  if (!q.data) return q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : null;
  const d = q.data;

  return (
    <Stack spacing={2}>
      <DirectoryHeader listing={d} onAdd={() => setEditing('new')} />
      <FilterPanel list={list} filters={filters} />
      <LocalDataGrid<Entry> rows={d.entries} getRowId={(r) => r.id} loading={q.isFetching} columns={columns} emptyText={list.activeKeys.length ? t('common.noResults') : undefined} />
      <DirectoryHints listing={d} rules={rules} />
      <EntryDialog slug={slug} listing={d} rules={rules} editing={editing} invalidate={invalidate} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!toDelete}
        title={t('common.delete')}
        message={t('directories.deleteConfirm', { name: toDelete?.name })}
        destructive
        loading={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSettled: () => setToDelete(null) })}
      />
    </Stack>
  );
}

function DirectoryHeader({ listing: d, onAdd }: { listing: Listing; onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="h6">{d.title}</Typography>
          {d.description && (
            <Typography variant="body2" color="text.secondary">
              {d.description}
            </Typography>
          )}
        </Box>
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
            {t('directories.add', { item: d.itemTitle })}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

function DirectoryHints({ listing: d, rules }: { listing: Listing; rules: DirectoryRules | undefined }) {
  const { t } = useTranslation();
  const base = rules?.baseEntries;
  return (
    <>
      {d.entries.some((e) => e.usageCount > 0) && <Alert severity="info">{t('directories.deleteHint')}</Alert>}
      {base && <Alert severity="info">{t('directories.baseEntriesHint', { numbers: [...base.numbers].join(', ') })}</Alert>}
    </>
  );
}

interface ColumnActions {
  /** Entry whose fresh copy is being loaded for editing. */
  opening: number | null;
  onEdit: (row: Entry) => Promise<void>;
  onToggle: (v: { id: number; active: boolean }) => void;
  onDelete: (row: Entry) => void;
}

/** Grid columns of a directory: number, name, the list's extra fields (choice values labelled), usage, state and actions. */
function useDirectoryColumns(d: Listing | undefined, rules: DirectoryRules | undefined, { opening, onEdit, onToggle, onDelete }: ColumnActions) {
  const { t } = useTranslation();
  const enumLabel = useEnumLabel();
  return useMemo<GridColDef<Entry>[]>(() => {
    if (!d) return [];
    const show = (fieldKey: string, v: unknown) => {
      const choice = rules?.choices?.[fieldKey];
      if (choice && typeof v === 'string' && v) return enumLabel(choice.enumName, v);
      return (v as string | number | null) ?? '—';
    };
    return [
      col.num<Entry>('number', t('directories.number'), { width: 90 }),
      col.text<Entry>('name', t('fields.name'), { flex: 1.5 }),
      ...d.fields.map((f) => ({ field: `f_${f.key}`, headerName: f.label ?? '', width: 150, valueGetter: (_: unknown, r: Entry) => show(f.key ?? '', r.fields[f.key ?? '']) })),
      { field: 'usageCount', headerName: d.usageLabel ?? t('directories.usage'), width: 120 },
      {
        field: 'isActive',
        headerName: t('directories.active'),
        width: 110,
        renderCell: (p) =>
          p.row.isFixed ? (
            <ToneChip tone="info" label={t('directories.fixed')} />
          ) : (
            <Switch size="small" checked={p.row.isActive} onChange={(e) => onToggle({ id: p.row.id, active: e.target.checked })} inputProps={{ 'aria-label': t('directories.active') }} />
          ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 110,
        sortable: false,
        renderCell: (p) => (p.row.isFixed ? null : <RowActions row={p.row} base={isBaseEntry(rules, p.row)} opening={opening} onEdit={onEdit} onDelete={onDelete} />),
      },
    ];
  }, [d, rules, opening, onEdit, onToggle, onDelete, t, enumLabel]);
}

function RowActions({ row, base, opening, onEdit, onDelete }: { row: Entry; base: boolean } & Pick<ColumnActions, 'opening' | 'onEdit' | 'onDelete'>) {
  const { t } = useTranslation();
  const inUse = row.usageCount > 0;
  const deleteHint = base ? t('directories.baseEntry') : inUse ? t('directories.inUse') : t('common.delete');
  return (
    <Stack direction="row" alignItems="center" sx={{ height: '100%' }}>
      <Tooltip title={t('common.edit')}>
        <span>
          <IconButton size="small" onClick={() => void onEdit(row)} disabled={opening !== null} aria-label={t('common.edit')}>
            {opening === row.id ? <CircularProgress size={16} /> : <EditOutlinedIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={deleteHint}>
        <span>
          <IconButton size="small" disabled={base || inUse} onClick={() => onDelete(row)} aria-label={t('common.delete')}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

interface EntryDialogProps {
  slug: string;
  listing: Listing;
  rules: DirectoryRules | undefined;
  editing: Entry | 'new' | null;
  invalidate: QueryKey[];
  onClose: () => void;
}

/** Add / edit dialog of one directory entry. */
function EntryDialog({ slug, listing: d, rules, editing, invalidate, onClose }: EntryDialogProps) {
  const { t } = useTranslation();
  const enumLabel = useEnumLabel();
  const create = useApiMutation((v: S<'CreateDirectoryEntryRequest'>) => directoriesApi.create(slug, v), { invalidate, rethrow: true });
  const update = useApiMutation((v: S<'UpdateDirectoryEntryRequest'> & { id: number }) => directoriesApi.update(slug, v.id, v), { invalidate, rethrow: true });
  const entry = editing === 'new' ? null : editing;
  const title = entry ? t('directories.edit', { item: d.itemTitle }) : t('directories.add', { item: d.itemTitle });

  const submit = (v: EntryValues) => {
    if (!entry) return create.mutateAsync({ slug, number: v.number, name: v.name, fields: extraValues(d, v) });
    // A list whose numbers are fixed keeps the stored number whatever the (disabled) field holds.
    const number = rules?.lockNumberOnEdit ? entry.number : v.number;
    return update.mutateAsync({ slug, id: entry.id, number, name: v.name, rowVersion: entry.rowVersion, fields: extraValues(d, v) });
  };

  return (
    <FormDialog<EntryValues>
      open={editing !== null}
      onClose={onClose}
      title={title}
      fields={entryFields(d, { rules, entry, t, enumLabel })}
      defaultValues={entry ? { number: entry.number, name: entry.name, ...entry.fields } : { number: d.nextNumber }}
      onSubmit={submit}
    />
  );
}
