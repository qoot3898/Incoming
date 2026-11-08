import { useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminKeys, directoriesApi } from '../api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState, EmptyState, LoadingState } from '@/components/common/States';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ToneChip } from '@/components/common/StatusChip';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { FormDialog, type FieldConfig } from '@/components/forms/FormDialog';
import { SelectField } from '@/components/forms/SelectField';
import { col } from '@/components/tables/columns';
import { useApiMutation } from '@/hooks/useApiMutation';
import { DIRECTORY_SLUGS } from '@/constants/directories';
import type { S } from '@/types/api';

type Entry = S<'DirectoryEntryItem'>;
type Values = Record<string, unknown> & { number: number | null; name: string | null };

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
      {slug ? <Directory slug={slug} /> : <Paper variant="outlined"><EmptyState title={t('directories.choose')} /></Paper>}
    </PageContainer>
  );
}

function Directory({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const key = [...adminKeys.directories, slug];
  const q = useQuery({ queryKey: key, queryFn: () => directoriesApi.list(slug) });
  const invalidate = [key, ['shared'], ['registration']];
  const create = useApiMutation((v: S<'CreateDirectoryEntryRequest'>) => directoriesApi.create(slug, v), { invalidate, rethrow: true });
  const update = useApiMutation((v: S<'UpdateDirectoryEntryRequest'> & { id: number }) => directoriesApi.update(slug, v.id, v), { invalidate, rethrow: true });
  const setActive = useApiMutation((v: { id: number; active: boolean }) => directoriesApi.setActive(slug, v.id, { active: v.active }), { invalidate });
  const remove = useApiMutation((id: number) => directoriesApi.remove(slug, id), { invalidate });
  const [editing, setEditing] = useState<Entry | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Entry | null>(null);

  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} />;
  const d = q.data!;
  const extra: FieldConfig<Values>[] = d.fields.map((f) => ({
    name: f.key ?? '',
    label: f.label ?? f.key ?? '',
    ...(f.kind === 'Text' ? { kind: 'text' as const, maxLength: f.maxLength || undefined } : { kind: 'number' as const, min: 0 }),
    half: true,
  }));
  const fields: FieldConfig<Values>[] = [
    { name: 'number', kind: 'number', label: t('directories.number'), required: true, half: true, min: 1 },
    { name: 'name', kind: 'text', label: t('fields.name'), required: true, half: true, maxLength: 200 },
    ...extra,
  ];
  const splitFields = (v: Values) => {
    const out: Record<string, unknown> = {};
    d.fields.forEach((f) => f.key && (out[f.key] = v[f.key]));
    return out;
  };
  const entry = editing && editing !== 'new' ? editing : null;

  return (
    <Stack spacing={2}>
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
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')}>
              {t('directories.add', { item: d.itemTitle })}
            </Button>
          </Box>
        </Stack>
      </Paper>
      <LocalDataGrid<Entry>
        rows={d.entries}
        getRowId={(r) => r.id}
        columns={[
          col.num<Entry>('number', t('directories.number'), { width: 90 }),
          col.text<Entry>('name', t('fields.name'), { flex: 1.5 }),
          ...d.fields.map((f) => ({ field: `f_${f.key}`, headerName: f.label ?? '', width: 140, valueGetter: (_: unknown, r: Entry) => (r.fields[f.key ?? ''] as string | number | null) ?? '—' })),
          { field: 'usageCount', headerName: d.usageLabel ?? t('directories.usage'), width: 120 },
          {
            field: 'isActive',
            headerName: t('directories.active'),
            width: 110,
            renderCell: (p) =>
              p.row.isFixed ? (
                <ToneChip tone="info" label={t('directories.fixed')} />
              ) : (
                <Switch size="small" checked={p.row.isActive} onChange={(e) => setActive.mutate({ id: p.row.id, active: e.target.checked })} inputProps={{ 'aria-label': t('directories.active') }} />
              ),
          },
          {
            field: 'actions',
            headerName: '',
            width: 110,
            sortable: false,
            renderCell: (p) =>
              !p.row.isFixed && (
                <Stack direction="row" alignItems="center" sx={{ height: '100%' }}>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => setEditing(p.row)} aria-label={t('common.edit')}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={p.row.usageCount > 0 ? t('directories.inUse') : t('common.delete')}>
                    <span>
                      <IconButton size="small" disabled={p.row.usageCount > 0} onClick={() => setToDelete(p.row)} aria-label={t('common.delete')}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              ),
          },
        ]}
      />
      {d.entries.some((e) => e.usageCount > 0) && <Alert severity="info">{t('directories.deleteHint')}</Alert>}
      <FormDialog<Values>
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={entry ? t('directories.edit', { item: d.itemTitle }) : t('directories.add', { item: d.itemTitle })}
        fields={fields}
        defaultValues={entry ? { number: entry.number, name: entry.name, ...entry.fields } : { number: d.nextNumber }}
        onSubmit={(v) =>
          entry
            ? update.mutateAsync({ slug, id: entry.id, number: v.number, name: v.name, rowVersion: entry.rowVersion, fields: splitFields(v) })
            : create.mutateAsync({ slug, number: v.number, name: v.name, fields: splitFields(v) })
        }
      />
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
