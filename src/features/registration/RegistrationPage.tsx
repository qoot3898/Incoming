import { useCallback, useMemo, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { registrationApi, registrationKeys } from './api';
import { CandidateScanCell } from './CandidateScanCell';
import { COLUMN_GROUPS, defaultsFor, rowIssues, splitServerErrors, toInput, type RegistrationRow, type RowIssue } from './registrationRow';
import { RegistrationRowEditor, type RowChoices } from './RegistrationRowEditor';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState, LoadingState, EmptyState } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { SiteSuggestionsList } from '@/components/common/SiteSuggestionsList';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { candidatesKeys, staffingKeys } from '@/features/staffing/api';
import { permitsKeys } from '@/features/permits/api';
import { API_ERROR_CODES, type ApiError } from '@/services/api/errors';
import { brand } from '@/app/theme/brand';
import { todayIso } from '@/utils/format';
import type { S } from '@/types/api';

type QueueItem = S<'RegistrationQueueItem'>;
type Options = S<'RegistrationOptions'>;
type Registered = S<'RegisteredWorker'>[];
type RowErrors = Record<number, Partial<Record<string, string>>>;

/**
 * Registration (FR-11, TL-N2/N4): pick approved candidates from the queue, then in one table fill their
 * data and attach their scans (passport for a non-Libyan, health certificate for everyone — TL-N2 as
 * amended 2026-11-09), and register them in one all-or-nothing operation.
 */
export default function RegistrationPage() {
  const { t } = useTranslation();
  const queue = useQuery({ queryKey: registrationKeys.queue, queryFn: registrationApi.queue });
  const options = useQuery({ queryKey: registrationKeys.options, queryFn: registrationApi.options, staleTime: 600_000 });
  // Kept here so "Back" from the table returns to the same ticked candidates.
  const [selection, setSelection] = useState<(string | number)[]>([]);
  const [batch, setBatch] = useState<RegistrationRow[] | null>(null);
  const [result, setResult] = useState<Registered | null>(null);

  if (queue.isLoading || options.isLoading) return <LoadingState />;
  const error = queue.error ?? options.error;
  if (error || !options.data) return <ErrorState error={error} onRetry={() => void (queue.error ? queue.refetch() : options.refetch())} />;
  const o = options.data;
  const libyan = new Set(o.libyanNationalityIds);

  const start = (chosen: QueueItem[]) => {
    setResult(null);
    setBatch(chosen.map((i) => defaultsFor(i, o)));
  };

  return (
    <PageContainer>
      <PageHeader title={t('nav.items.registration')} />
      {result && <RegistrationResult result={result} />}
      {batch ? (
        <RegistrationBatch
          initialRows={batch}
          options={o}
          onBack={() => setBatch(null)}
          onRegistered={(r) => {
            setResult(r);
            setBatch(null);
            setSelection([]);
          }}
        />
      ) : (
        <RegistrationQueue items={queue.data ?? []} libyan={libyan} selection={selection} onSelectionChange={setSelection} onStart={start} />
      )}
    </PageContainer>
  );
}

/** Registered workers and their new employee numbers; their scans are now in each worker's attachments. */
function RegistrationResult({ result }: { result: Registered }) {
  const { t } = useTranslation();
  return (
    <Alert severity="success" sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {t('registration.resultTitle', { count: result.length })}
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {result.map((r) => (
          <RouterLink key={r.employeeId} to={`/workers/${r.employeeId}`}>
            {r.employeeNumber} — {r.name}
          </RouterLink>
        ))}
      </Stack>
    </Alert>
  );
}

/** Approved candidates waiting for registration in the user's tracks, with their scans. */
interface QueueProps {
  items: QueueItem[];
  libyan: ReadonlySet<number>;
  selection: (string | number)[];
  onSelectionChange: (ids: (string | number)[]) => void;
  onStart: (chosen: QueueItem[]) => void;
}

function RegistrationQueue({ items, libyan, selection, onSelectionChange, onStart }: QueueProps) {
  const { t } = useTranslation();
  const columns = useMemo(
    () => [
      col.text<QueueItem>('name', t('fields.name'), { minWidth: 180 }),
      col.text<QueueItem>('nationalityName', t('fields.nationality')),
      {
        field: 'passportScanAttached',
        headerName: t('registration.scans.Passport'),
        minWidth: 120,
        sortable: false,
        renderCell: (p: { row: QueueItem }) => (
          <CandidateScanCell readOnly candidateId={p.row.candidateId} kind="Passport" attached={p.row.passportScanAttached} required={!libyan.has(p.row.nationalityId)} />
        ),
      },
      {
        field: 'healthCertificateScanAttached',
        headerName: t('registration.scans.HealthCertificate'),
        minWidth: 140,
        sortable: false,
        renderCell: (p: { row: QueueItem }) => (
          <CandidateScanCell readOnly candidateId={p.row.candidateId} kind="HealthCertificate" attached={p.row.healthCertificateScanAttached} required />
        ),
      },
      col.num<QueueItem>('requestNumber', t('staffing.number')),
      col.text<QueueItem>('trackName', t('fields.track')),
      col.text<QueueItem>('workSiteName', t('fields.workSite')),
      col.text<QueueItem>('jobName', t('fields.job')),
      col.dateTime<QueueItem>('approvedAt', t('candidates.approvedAt')),
    ],
    [t, libyan],
  );
  const ready = items.filter((i) => selection.includes(i.candidateId));
  return (
    <SectionCard
      title={t('registration.queue')}
      action={
        <Button variant="contained" startIcon={<HowToRegOutlinedIcon />} disabled={ready.length === 0} onClick={() => onStart(ready)}>
          {t('registration.registerSelected', { count: ready.length })}
        </Button>
      }
      noPadding
    >
      {items.length === 0 ? (
        <EmptyState title={t('registration.empty')} />
      ) : (
        <LocalDataGrid<QueueItem> rows={items} getRowId={(r) => r.candidateId} checkboxSelection selection={selection} onSelectionChange={onSelectionChange} columns={columns} />
      )}
    </SectionCard>
  );
}

interface BatchProps {
  initialRows: RegistrationRow[];
  options: Options;
  onBack: () => void;
  onRegistered: (result: Registered) => void;
}

/** The registration table: per-row rules before sending, server errors mapped back onto rows and cells. */
function RegistrationBatch({ initialRows, options: o, onBack, onRegistered }: BatchProps) {
  const { t } = useTranslation();
  const choices = useRowChoices(o);
  const libyan = useMemo(() => new Set(o.libyanNationalityIds), [o]);
  const qc = useQueryClient();
  const [rows, setRows] = useState(initialRows);
  const [rowErrors, setRowErrors] = useState<RowErrors>({});
  const [serverError, setServerError] = useState<{ error: ApiError; rest: string[] } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const register = useApiMutation(registrationApi.register, {
    invalidate: [registrationKeys.all, candidatesKeys.all, staffingKeys.all, permitsKeys.all],
    rethrow: true,
    success: t('registration.done'),
  });

  // Stable across renders so memoized rows only re-render when their own data changes.
  const update = useCallback((idx: number, patch: Partial<RegistrationRow>) => {
    setRows((current) => current.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
    setRowErrors((current) => {
      if (!current[idx]) return current;
      const cleared = { ...current[idx] };
      Object.keys(patch).forEach((k) => delete cleared[k]);
      return { ...current, [idx]: cleared };
    });
  }, []);

  const issueText = (issue: RowIssue) => (issue.code === 'required' ? t('validation.required') : t(`registration.issues.${issue.code}`, { max: issue.max }));
  const isLibyan = (r: RegistrationRow) => libyan.has(Number(r.nationalityId));

  const submit = async (confirmDuplicates: boolean) => {
    const today = todayIso();
    const errs: RowErrors = {};
    rows.forEach((r, i) => {
      const issues = rowIssues(r, { libyan: isLibyan(r), today });
      if (issues.length) errs[i] = Object.fromEntries(issues.map((x) => [x.field, issueText(x)]));
    });
    setRowErrors(errs);
    setServerError(null);
    if (Object.keys(errs).length) return;
    try {
      onRegistered(await register.mutateAsync({ confirmDuplicates, workers: rows.map((r) => toInput(r)) }));
    } catch (e) {
      const err = e as ApiError;
      // The duplicate-passport rule (AC-10) asks for confirmation instead of refusing.
      if (err.code === API_ERROR_CODES.confirmationRequired && !confirmDuplicates) setDuplicateWarning(true);
      // A candidate's scans changed while sending: re-read the queue (the server message asks to retry).
      if (err.code === API_ERROR_CODES.concurrencyConflict) void qc.invalidateQueries({ queryKey: registrationKeys.queue });
      const split = splitServerErrors(err.fieldErrors);
      setRowErrors(split.rows);
      setServerError({ error: err, rest: split.rest });
    }
  };

  const invalidCount = Object.values(rowErrors).filter((e) => Object.values(e).some(Boolean)).length;
  const columnCount = COLUMN_GROUPS.reduce((n, g) => n + g.fields.length, 0);
  const title = t('registration.formTitle', { count: rows.length });

  return (
    <SectionCard title={title} noPadding>
      <BatchNotices invalidCount={invalidCount} serverError={serverError} duplicateWarning={duplicateWarning} />
      <TableContainer sx={{ maxHeight: '65vh' }}>
        <Table stickyHeader size="small" aria-label={title}>
          <BatchHead />
          <TableBody>
            {rows.map((r, i) => (
              <RegistrationRowEditor
                key={r.candidateId}
                row={r}
                index={i}
                choices={choices}
                libyan={isLibyan(r)}
                errors={rowErrors[i]}
                columnCount={columnCount}
                onChange={update}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <BatchActions count={rows.length} pending={register.isPending} duplicateWarning={duplicateWarning} onSubmit={submit} onBack={onBack} />
    </SectionCard>
  );
}

function useRowChoices(o: Options): RowChoices {
  const enumOptions = useEnumOptions();
  return useMemo(() => {
    const choice = (list: S<'RegistrationChoice'>[]) => list.map((c) => ({ value: c.id, label: c.name ?? String(c.number) }));
    return {
      nationalities: choice(o.nationalities),
      cities: choice(o.cities),
      departments: choice(o.departments),
      genders: enumOptions('Gender', ENUMS.Gender),
      maritalStatuses: enumOptions('MaritalStatus', ENUMS.MaritalStatus),
    };
  }, [o, enumOptions]);
}

interface NoticeProps {
  invalidCount: number;
  serverError: { error: ApiError; rest: string[] } | null;
  duplicateWarning: boolean;
}

function BatchNotices({ invalidCount, serverError, duplicateWarning }: NoticeProps) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5} sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {t('registration.rulesHint')}
      </Typography>
      {invalidCount > 0 && !serverError && <Alert severity="error">{t('registration.rowsInvalid', { count: invalidCount })}</Alert>}
      {serverError && (
        <Alert severity={duplicateWarning ? 'warning' : 'error'}>
          {serverError.error.detail || serverError.error.title}
          {serverError.rest.map((m) => (
            <div key={m}>{m}</div>
          ))}
          {duplicateWarning && <div>{t('registration.duplicateHint')}</div>}
          {serverError.error.code === API_ERROR_CODES.siteCapacityExceeded && <SiteSuggestionsList suggestions={serverError.error.suggestions ?? []} />}
        </Alert>
      )}
    </Stack>
  );
}

/** Grouped header (identity / passport / health certificate / placement) over the column titles. */
function BatchHead() {
  const { t } = useTranslation();
  const columns = COLUMN_GROUPS.flatMap((g) => g.fields);
  return (
    <TableHead>
      <TableRow>
        {COLUMN_GROUPS.map((g) => (
          <TableCell
            key={g.key}
            colSpan={g.fields.length}
            sx={{ bgcolor: brand.surfaceHead, fontWeight: 700, borderInlineEnd: 1, borderColor: 'divider' }}
          >
            {t(`registration.groups.${g.key}`)}
          </TableCell>
        ))}
      </TableRow>
      <TableRow>
        {columns.map((c) => (
          <TableCell key={c} sx={{ top: 37, whiteSpace: 'nowrap' }}>
            {t(`registration.cols.${c}`)}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

interface ActionsProps {
  count: number;
  pending: boolean;
  duplicateWarning: boolean;
  onSubmit: (confirmDuplicates: boolean) => void;
  onBack: () => void;
}

function BatchActions({ count, pending, duplicateWarning, onSubmit, onBack }: ActionsProps) {
  const { t } = useTranslation();
  return (
    <Paper square elevation={0} sx={{ p: 2, display: 'flex', gap: 1, borderTop: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
      <Button variant="contained" onClick={() => onSubmit(false)} disabled={pending}>
        {pending ? t('common.saving') : t('registration.submit', { count })}
      </Button>
      {duplicateWarning && (
        <Button variant="contained" color="warning" onClick={() => onSubmit(true)} disabled={pending}>
          {t('registration.confirmDuplicates')}
        </Button>
      )}
      <Box sx={{ flex: 1 }} />
      <Button color="inherit" onClick={onBack} disabled={pending}>
        {t('common.back')}
      </Button>
    </Paper>
  );
}
