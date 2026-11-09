import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { adminKeys, assignmentsApi } from '../api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { InfoGrid } from '@/components/common/InfoGrid';
import { StatusChip, ToneChip } from '@/components/common/StatusChip';
import { FileActionButton } from '@/components/common/FileButtons';
import { FormErrorAlert } from '@/components/forms/FormLayout';
import { useFormServerError } from '@/components/forms/useFormServerError';
import { FilterPanel } from '@/components/tables/FilterPanel';
import { clearFilters, isFiltered, type FilterDef } from '@/components/tables/filters';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { useListState } from '@/hooks/useListState';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useSnackbar } from '@/app/providers/snackbarContext';
import { API_ERROR_CODES, isApiError } from '@/services/api/errors';
import { formatBytes, formatDateTime } from '@/utils/format';
import type { Q, S } from '@/types/api';

type Row = S<'AssignmentListItem'>;
type Counts = Omit<S<'AssignmentList'>, 'page'>;

/** Tabs in work order; `All` is a UI value (the API takes no status for "all"). */
const TABS = ['PendingReview', 'Returned', 'Required', 'Approved', 'All'] as const;
type TabValue = (typeof TABS)[number];

function countOf(counts: Counts | undefined, tab: TabValue): number | undefined {
  if (!counts) return undefined;
  switch (tab) {
    case 'PendingReview':
      return counts.pendingReview;
    case 'Returned':
      return counts.returned;
    case 'Required':
      return counts.required;
    case 'Approved':
      return counts.approved;
    default:
      return counts.pendingReview + counts.returned + counts.required + counts.approved;
  }
}

/** Assignment letters of the users (TL-N3): open each letter and approve it or return it with a reason. */
export default function AssignmentsPage() {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const list = useListState({ Status: 'PendingReview' as TabValue | string, Search: '' });
  const status = list.filters.Status as TabValue;
  const params = { ...list.params, Status: status === 'All' ? undefined : status } as Q<'ListAssignments'>;
  const query = useQuery({ queryKey: adminKeys.assignmentList(params), queryFn: ({ signal }) => assignmentsApi.list(params, signal), placeholderData: keepPreviousData });
  const filters: FilterDef<typeof list.filters>[] = [{ key: 'Search', kind: 'search', label: t('assignment.searchUsers'), wide: true }];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<Row | null>(null);
  const rows = query.data?.page.items;
  // Keep the dialog on the freshest copy of the row (its rowVersion changes when the user replaces the file).
  const selected = selectedId === null ? null : (rows?.find((r) => r.userId === selectedId) ?? snapshot);

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.text<Row>('fullName', t('users.fullName'), { minWidth: 180 }),
      col.text<Row>('userName', t('auth.userName'), { minWidth: 130 }),
      col.text<Row>('employeeNo', t('users.employeeNo'), { width: 120, flex: 0 }),
      col.text<Row>('jobTitle', t('users.jobTitle')),
      col.status<Row>('status', t('fields.status'), 'AssignmentState', { width: 140 }),
      col.text<Row>('fileName', t('assignment.fileName'), { minWidth: 150 }),
      { field: 'size', headerName: t('assignment.size'), width: 100, renderCell: (p) => <bdi dir="ltr">{formatBytes(p.row.size)}</bdi> },
      col.dateTime<Row>('submittedAt', t('assignment.submittedAt')),
      col.text<Row>('reviewedBy', t('assignment.reviewedBy')),
      col.dateTime<Row>('reviewedAt', t('assignment.reviewedAt')),
      {
        field: 'isActive',
        headerName: t('users.status'),
        width: 100,
        renderCell: (p) => (p.row.isActive ? null : <ToneChip tone="neutral" label={t('users.inactive')} />),
      },
    ],
    [t],
  );

  return (
    <PageContainer>
      <PageHeader title={t('nav.items.assignments')} />
      <Tabs value={status} onChange={(_, v: TabValue) => list.setFilter('Status', v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((tab) => {
          const count = countOf(query.data, tab);
          const text = tab === 'All' ? t('common.all') : label('AssignmentState', tab);
          return <Tab key={tab} value={tab} label={count === undefined ? text : `${text} (${count})`} />;
        })}
      </Tabs>
      <FilterPanel list={list} filters={filters} />
      <ServerDataGrid<Row>
        data={query.data?.page}
        loading={query.isFetching}
        error={query.error}
        onRetry={query.refetch}
        filtered={isFiltered(list, filters)}
        onClearFilters={() => clearFilters(list, filters)}
        getRowId={(r) => r.userId}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => {
          setSnapshot(r);
          setSelectedId(r.userId);
        }}
        emptyText={t('assignment.emptyList')}
        columns={columns}
      />
      {selected && <ReviewDialog row={selected} onClose={() => setSelectedId(null)} />}
    </PageContainer>
  );
}

function ReviewDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const qc = useQueryClient();
  const { notify } = useSnackbar();
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | undefined>();
  const [conflict, setConflict] = useState(false);
  const { serverError, handleServerError, clearServerError } = useFormServerError((_, message) => setNoteError(message), ['note']);
  const decide = useApiMutation((v: S<'DecideAssignmentRequest'>) => assignmentsApi.decide(row.userId, v), {
    invalidate: [adminKeys.assignments],
    rethrow: true,
    success: false,
  });
  const canDecide = row.status === 'PendingReview' && !!row.rowVersion;
  const busy = decide.isPending;

  const submit = async (approve: boolean) => {
    const text = note.trim();
    if (!approve && !text) {
      setNoteError(t('assignment.returnReasonRequired'));
      return;
    }
    if (text.length > 500) {
      setNoteError(t('validation.maxLength', { max: 500 }));
      return;
    }
    setNoteError(undefined);
    setConflict(false);
    clearServerError();
    try {
      await decide.mutateAsync({ approve, note: text || null, rowVersion: row.rowVersion ?? undefined });
      notify(approve ? t('assignment.approvedToast') : t('assignment.returnedToast'), 'success');
      onClose();
    } catch (e) {
      // The user replaced the file after it was listed: reload so the reviewer opens the new one.
      if (isApiError(e) && e.code === API_ERROR_CODES.concurrencyConflict) {
        setConflict(true);
        await qc.invalidateQueries({ queryKey: adminKeys.assignments });
        return;
      }
      await handleServerError(e);
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={phone}>
      <DialogTitle>{t('assignment.reviewTitle', { name: row.fullName || row.userName })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {conflict && <Alert severity="warning">{t('assignment.replacedMeanwhile')}</Alert>}
          <FormErrorAlert value={serverError} />
          <InfoGrid
            columns={2}
            items={[
              { label: t('fields.status'), value: <StatusChip enumName="AssignmentState" value={row.status} /> },
              { label: t('auth.userName'), value: row.userName },
              { label: t('users.employeeNo'), value: row.employeeNo },
              { label: t('users.jobTitle'), value: row.jobTitle },
              { label: t('assignment.fileName'), value: row.fileName },
              { label: t('assignment.size'), value: <bdi dir="ltr">{formatBytes(row.size)}</bdi> },
              { label: t('assignment.submittedAt'), value: formatDateTime(row.submittedAt) },
              { label: t('assignment.reviewedBy'), value: row.reviewedBy, hidden: !row.reviewedBy },
              { label: t('assignment.reviewedAt'), value: formatDateTime(row.reviewedAt), hidden: !row.reviewedAt },
              { label: t('assignment.reviewNote'), value: row.reviewNote, span: 2, hidden: !row.reviewNote },
            ]}
          />
          {row.fileName && (
            <Box>
              <FileActionButton
                label={t('assignment.openFile')}
                icon={<PictureAsPdfOutlinedIcon />}
                fileName={row.fileName}
                action={() => assignmentsApi.openFile(row.userId)}
              />
            </Box>
          )}
          {canDecide && (
            <TextField
              label={t('assignment.reviewNote')}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (noteError) setNoteError(undefined);
              }}
              multiline
              minRows={3}
              error={!!noteError}
              helperText={noteError ?? t('assignment.noteHint')}
              slotProps={{ htmlInput: { maxLength: 500 } }}
              disabled={busy}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {canDecide ? t('common.cancel') : t('common.close')}
        </Button>
        {canDecide && (
          <>
            <Button color="warning" variant="outlined" onClick={() => submit(false)} disabled={busy}>
              {t('assignment.return')}
            </Button>
            <Button variant="contained" color="success" onClick={() => submit(true)} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {t('assignment.approve')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
