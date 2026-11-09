import { useCallback, useMemo, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { registrationApi, registrationKeys } from './api';
import { COLUMN_GROUPS, defaultsFor, rowIssues, splitServerErrors, toInput, type RegistrationRow, type RowIssue } from './registrationRow';
import { RegistrationRowEditor, type RowChoices } from './RegistrationRowEditor';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState, LoadingState, EmptyState } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
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
type RowErrors = Record<number, Partial<Record<string, string>>>;

export default function RegistrationPage() {
  const { t } = useTranslation();
  const enumOptions = useEnumOptions();
  const queue = useQuery({ queryKey: [...registrationKeys.all, 'queue'], queryFn: registrationApi.queue });
  const options = useQuery({ queryKey: [...registrationKeys.all, 'options'], queryFn: registrationApi.options, staleTime: 600_000 });
  const [selection, setSelection] = useState<(string | number)[]>([]);
  const [rows, setRows] = useState<RegistrationRow[] | null>(null);
  const [rowErrors, setRowErrors] = useState<RowErrors>({});
  const [serverError, setServerError] = useState<{ error: ApiError; rest: string[] } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [result, setResult] = useState<S<'RegisteredWorker'>[] | null>(null);

  const register = useApiMutation(registrationApi.register, {
    invalidate: [registrationKeys.all, candidatesKeys.all, staffingKeys.all, permitsKeys.all],
    rethrow: true,
    success: t('registration.done'),
  });

  const o = options.data;
  const libyan = useMemo(() => new Set(o?.libyanNationalityIds ?? []), [o]);
  const canWaive = o?.canRegisterWithoutPassport ?? false;
  const choices = useMemo<RowChoices>(() => {
    const choice = (list: S<'RegistrationChoice'>[] = []) => list.map((c) => ({ value: c.id, label: c.name ?? String(c.number) }));
    return {
      nationalities: choice(o?.nationalities),
      cities: choice(o?.cities),
      departments: choice(o?.departments),
      genders: enumOptions('Gender', ENUMS.Gender),
      maritalStatuses: enumOptions('MaritalStatus', ENUMS.MaritalStatus),
    };
  }, [o, enumOptions]);

  // Stable across renders so memoized rows only re-render when their own data changes.
  const update = useCallback((idx: number, patch: Partial<RegistrationRow>) => {
    setRows((current) => (current ? current.map((x, i) => (i === idx ? { ...x, ...patch } : x)) : current));
    setRowErrors((current) => {
      if (!current[idx]) return current;
      const cleared = { ...current[idx] };
      Object.keys(patch).forEach((k) => delete cleared[k]);
      return { ...current, [idx]: cleared };
    });
  }, []);

  if (queue.isLoading || options.isLoading) return <LoadingState />;
  if (queue.error || options.error) return <ErrorState error={queue.error ?? options.error} onRetry={() => void (queue.error ? queue.refetch() : options.refetch())} />;
  const items = queue.data ?? [];
  const columnCount = COLUMN_GROUPS.reduce((n, g) => n + g.fields.length, 0) - (canWaive ? 0 : 1);

  const issueText = (issue: RowIssue) => (issue.code === 'required' ? t('validation.required') : t(`registration.issues.${issue.code}`, { max: issue.max }));

  const start = () => {
    if (!o) return;
    setResult(null);
    setServerError(null);
    setRowErrors({});
    setDuplicateWarning(false);
    const chosen = new Set(selection);
    setRows(items.filter((i) => chosen.has(i.candidateId)).map((i) => defaultsFor(i, o)));
  };

  const submit = async (confirmDuplicates: boolean) => {
    if (!rows) return;
    const today = todayIso();
    const errs: RowErrors = {};
    rows.forEach((r, i) => {
      const issues = rowIssues(r, { libyan: libyan.has(Number(r.nationalityId)), canWaive, today });
      if (issues.length) errs[i] = Object.fromEntries(issues.map((x) => [x.field, issueText(x)]));
    });
    setRowErrors(errs);
    if (Object.keys(errs).length) {
      setServerError(null);
      return;
    }
    setServerError(null);
    try {
      const res = await register.mutateAsync({
        confirmDuplicates,
        workers: rows.map((r) => toInput(r, { libyan: libyan.has(Number(r.nationalityId)) })),
      });
      setResult(res);
      setRows(null);
      setSelection([]);
      setDuplicateWarning(false);
    } catch (e) {
      const err = e as ApiError;
      // The duplicate-passport rule (AC-10) asks for confirmation instead of refusing.
      if ((err.code === API_ERROR_CODES.confirmationRequired || err.status === 409) && !confirmDuplicates) setDuplicateWarning(true);
      const split = splitServerErrors(err.fieldErrors);
      setRowErrors(split.rows);
      setServerError({ error: err, rest: split.rest });
    }
  };

  const invalidCount = Object.values(rowErrors).filter((e) => Object.values(e).some(Boolean)).length;

  return (
    <PageContainer>
      <PageHeader title={t('nav.items.registration')} />
      {result && (
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
      )}
      {!rows ? (
        <SectionCard
          title={t('registration.queue')}
          action={
            <Button variant="contained" startIcon={<HowToRegOutlinedIcon />} disabled={selection.length === 0} onClick={start}>
              {t('registration.registerSelected', { count: selection.length })}
            </Button>
          }
          noPadding
        >
          {items.length === 0 ? (
            <EmptyState title={t('registration.empty')} />
          ) : (
            <LocalDataGrid<QueueItem>
              rows={items}
              getRowId={(r) => r.candidateId}
              checkboxSelection
              selection={selection}
              onSelectionChange={setSelection}
              columns={[
                col.text<QueueItem>('name', t('fields.name'), { minWidth: 180 }),
                col.text<QueueItem>('nationalityName', t('fields.nationality')),
                col.num<QueueItem>('requestNumber', t('staffing.number')),
                col.text<QueueItem>('trackName', t('fields.track')),
                col.text<QueueItem>('workSiteName', t('fields.workSite')),
                col.text<QueueItem>('jobName', t('fields.job')),
                col.dateTime<QueueItem>('approvedAt', t('candidates.approvedAt')),
              ]}
            />
          )}
        </SectionCard>
      ) : (
        <SectionCard title={t('registration.formTitle', { count: rows.length })} noPadding>
          <Stack spacing={1.5} sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('registration.rulesHint')}
            </Typography>
            {canWaive && <Alert severity="info">{t('registration.waiverHint')}</Alert>}
            {invalidCount > 0 && !serverError && <Alert severity="error">{t('registration.rowsInvalid', { count: invalidCount })}</Alert>}
            {serverError && (
              <Alert severity={duplicateWarning ? 'warning' : 'error'}>
                {serverError.error.detail || serverError.error.title}
                {serverError.rest.map((m) => (
                  <div key={m}>{m}</div>
                ))}
                {duplicateWarning && <div>{t('registration.duplicateHint')}</div>}
              </Alert>
            )}
          </Stack>
          <TableContainer sx={{ maxHeight: '65vh' }}>
            <Table stickyHeader size="small" aria-label={t('registration.formTitle', { count: rows.length })}>
              <TableHead>
                <TableRow>
                  {COLUMN_GROUPS.map((g) => (
                    <TableCell
                      key={g.key}
                      colSpan={g.key === 'passport' && !canWaive ? g.fields.length - 1 : g.fields.length}
                      sx={{ bgcolor: brand.surfaceHead, fontWeight: 700, borderInlineEnd: 1, borderColor: 'divider' }}
                    >
                      {t(`registration.groups.${g.key}`)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  {COLUMN_GROUPS.flatMap((g) => g.fields)
                    .filter((f) => canWaive || f !== 'passportWaived')
                    .map((c) => (
                      <TableCell key={c} sx={{ top: 37, whiteSpace: 'nowrap' }}>
                        {t(`registration.cols.${c}`)}
                      </TableCell>
                    ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => (
                  <RegistrationRowEditor
                    key={r.candidateId}
                    row={r}
                    index={i}
                    choices={choices}
                    libyan={libyan.has(Number(r.nationalityId))}
                    canWaive={canWaive}
                    errors={rowErrors[i]}
                    columnCount={columnCount}
                    onChange={update}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Paper square elevation={0} sx={{ p: 2, display: 'flex', gap: 1, borderTop: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={() => submit(false)} disabled={register.isPending}>
              {register.isPending ? t('common.saving') : t('registration.submit', { count: rows.length })}
            </Button>
            {duplicateWarning && (
              <Button variant="contained" color="warning" onClick={() => submit(true)} disabled={register.isPending}>
                {t('registration.confirmDuplicates')}
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button color="inherit" onClick={() => setRows(null)} disabled={register.isPending}>
              {t('common.back')}
            </Button>
          </Paper>
        </SectionCard>
      )}
    </PageContainer>
  );
}
