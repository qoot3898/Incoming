import { memo, useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { attendanceApi, attendanceKeys } from './api';
import { addDays, CODE_COLORS, ENTERABLE, type Code } from './codes';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary, EmptyState, LoadingState } from '@/components/common/States';
import { StatusChip, ToneChip } from '@/components/common/StatusChip';
import { InfoGrid } from '@/components/common/InfoGrid';
import { PrintFormButton } from '@/components/common/FileButtons';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { useSnackbar } from '@/app/providers/snackbarContext';
import { tasksKeys } from '@/features/tasks/api';
import { formatDate, formatDateTime, todayIso } from '@/utils/format';
import { errorMessage, type ApiError } from '@/services/api/errors';
import { alpha } from '@mui/material/styles';
import { brand } from '@/app/theme/brand';
import type { S } from '@/types/api';

type Sheet = S<'AttendanceSheetDetails'>;
type Cell = S<'AttendanceSheetCell'>;
type Changes = Record<string, Code | null>;

const keyOf = (employeeId: number, date: string) => `${employeeId}|${date}`;

function editable(sheet: Sheet, w: S<'AttendanceSheetWorker'>, c: Cell) {
  return sheet.canRecord && !w.locked && (c.kind === 'Unrecorded' || c.kind === 'Recorded') && c.isOpenDay !== false;
}

export default function AttendanceSheetPage() {
  const sheetId = Number(useParams().sheetId);
  const query = useQuery({ queryKey: attendanceKeys.sheet(sheetId), queryFn: () => attendanceApi.sheet(sheetId) });
  return <QueryBoundary query={query}>{(sheet) => <SheetView sheet={sheet} />}</QueryBoundary>;
}

function SheetView({ sheet }: { sheet: Sheet }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const { notify } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [changes, setChanges] = useState<Changes>({});
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [lastResult, setLastResult] = useState<S<'AttendanceSaveResult'> | null>(null);
  const days = useMemo(() => Array.from({ length: sheet.dayCount || sheet.workers[0]?.cells.length || 0 }, (_, i) => addDays(sheet.periodStart, i)), [sheet]);
  const invalidate = [attendanceKeys.all, tasksKeys.all, ['workers'], ['penalties'], ['terminations']];

  const save = useApiMutation((body: S<'RecordAttendanceRequest'>) => attendanceApi.record(sheet.id, body), {
    invalidate,
    rethrow: true,
    success: false,
    onSuccess: (r) => {
      setLastResult(r);
      setChanges({});
      notify(t('attendance.savedResult', { days: r.changedDays, workers: r.workers }));
    },
  });
  const submit = useApiMutation((v: S<'SubmitAttendanceSheetRequest'>) => attendanceApi.submit(sheet.id, v), { invalidate, rethrow: true });
  const review = useApiMutation(() => attendanceApi.review(sheet.id), { invalidate });
  const receive = useApiMutation(() => attendanceApi.receive(sheet.id), { invalidate });

  const pending = Object.keys(changes).length;
  const needsReason = sheet.status !== 'Open';

  const doSave = async (correctionReason: string | null) => {
    try {
      await save.mutateAsync({
        correctionReason,
        changes: Object.entries(changes).map(([k, code]) => {
          const [employeeId, date] = k.split('|');
          return { employeeId: Number(employeeId), date, code };
        }),
      });
      setReasonOpen(false);
      setReason('');
    } catch (e) {
      notify(errorMessage(e as ApiError), 'error');
    }
  };

  const valueOf = (employeeId: number, date: string, c: Cell): Code | null => {
    const k = keyOf(employeeId, date);
    return k in changes ? changes[k] : (c.code ?? null);
  };
  // Stable identity so memoized month rows are not invalidated on every render.
  const setCode = useCallback((employeeId: number, date: string, c: Cell, code: Code | null) => {
    const k = keyOf(employeeId, date);
    setChanges((prev) => {
      const next = { ...prev };
      if ((c.code ?? null) === code) delete next[k];
      else next[k] = code;
      return next;
    });
  }, []);

  return (
    <Box>
      <PageHeader
        title={t('attendance.sheetTitle', { site: sheet.workSiteName, month: sheet.month, year: sheet.year })}
        subtitle={`${sheet.trackName ?? ''} · ${formatDate(sheet.periodStart)} – ${formatDate(sheet.periodEnd)}`}
        breadcrumbs={[{ label: t('nav.items.attendance'), to: '/attendance' }]}
        meta={
          <Stack direction="row" spacing={1}>
            <StatusChip enumName="AttendanceSheetStatus" value={sheet.status} />
            {sheet.isLocked && <ToneChip tone="neutral" label={t('attendance.locked')} />}
          </Stack>
        }
        actions={
          <>
            {sheet.canSubmit && (
              <ActionFormButton<S<'SubmitAttendanceSheetRequest'>>
                label={t('attendance.submit')}
                variant="contained"
                description={pending ? t('attendance.unsavedWarning') : t('attendance.submitHint')}
                fields={[
                  { name: 'supervisorName', kind: 'text', label: t('attendance.supervisor'), half: true, maxLength: 200 },
                  { name: 'submittedOn', kind: 'date', label: t('attendance.submittedOn'), half: true, required: true },
                ]}
                defaultValues={{ supervisorName: sheet.supervisorName, submittedOn: todayIso() }}
                onSubmit={(v) => submit.mutateAsync(v)}
              />
            )}
            {sheet.canReview && (
              <Button variant="contained" onClick={() => review.mutate(undefined)} disabled={review.isPending}>
                {t('attendance.review')}
              </Button>
            )}
            {sheet.canReceive && (
              <Button variant="contained" color="success" onClick={() => receive.mutate(undefined)} disabled={receive.isPending}>
                {t('attendance.receive')}
              </Button>
            )}
            <PrintFormButton code="F06" recordId={sheet.id} />
          </>
        }
      />
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <InfoGrid
          columns={4}
          items={[
            { label: t('attendance.supervisor'), value: sheet.supervisorName },
            { label: t('attendance.submittedOn'), value: sheet.submittedOn ? `${formatDate(sheet.submittedOn)} — ${sheet.submittedBy ?? ''}` : '—' },
            { label: t('attendance.reviewedAt'), value: sheet.reviewedAt ? `${formatDateTime(sheet.reviewedAt)} — ${sheet.reviewedBy ?? ''}` : '—' },
            { label: t('attendance.receivedAt'), value: sheet.receivedAt ? `${formatDateTime(sheet.receivedAt)} — ${sheet.receivedBy ?? ''}` : '—' },
          ]}
        />
      </Paper>
      {lastResult && (lastResult.incidents > 0 || lastResult.dismissals > 0 || lastResult.conflicts.length > 0) && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setLastResult(null)}>
          {t('attendance.saveEffects', { incidents: lastResult.incidents, dismissals: lastResult.dismissals })}
          {lastResult.conflicts.map((c, i) => (
            <div key={i}>{typeof c === 'string' ? c : JSON.stringify(c)}</div>
          ))}
        </Alert>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 1 }}>
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)}>
          <Tab label={t('attendance.dayView')} />
          <Tab label={t('attendance.monthView')} />
          <Tab label={t('attendance.deviceDifferences')} />
        </Tabs>
        {sheet.canRecord && (
          <Stack direction="row" spacing={1} alignItems="center">
            {pending > 0 && <Typography variant="body2" color="warning.main">{t('attendance.pendingChanges', { count: pending })}</Typography>}
            <Button color="inherit" disabled={!pending} onClick={() => setChanges({})}>
              {t('common.discard')}
            </Button>
            <Button variant="contained" startIcon={<SaveOutlinedIcon />} disabled={!pending || save.isPending} onClick={() => (needsReason ? setReasonOpen(true) : doSave(null))}>
              {t('common.save')}
            </Button>
          </Stack>
        )}
      </Stack>
      <Legend />
      {sheet.workers.length === 0 ? (
        <Paper variant="outlined">
          <EmptyState title={t('attendance.noWorkers')} />
        </Paper>
      ) : tab === 0 ? (
        <DayView sheet={sheet} days={days} valueOf={valueOf} setCode={setCode} />
      ) : tab === 1 ? (
        <MonthView sheet={sheet} days={days} setCode={setCode} changes={changes} />
      ) : (
        <DeviceDifferences sheetId={sheet.id} />
      )}
      <Dialog open={reasonOpen} onClose={() => setReasonOpen(false)}>
        <DialogTitle>{t('attendance.correctionReason')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('attendance.correctionHint', { status: label('AttendanceSheetStatus', sheet.status) })}
          </Typography>
          <TextField autoFocus multiline minRows={3} label={t('common.reason')} value={reason} onChange={(e) => setReason(e.target.value)} required />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setReasonOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="contained" disabled={!reason.trim() || save.isPending} onClick={() => doSave(reason.trim())}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function useCodeShort() {
  const { t } = useTranslation();
  return (c: Code | null | undefined) => (c ? t(`attendance.short.${c}`) : '');
}

function Legend() {
  const label = useEnumLabel();
  const short = useCodeShort();
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
      {(Object.keys(CODE_COLORS) as Code[]).map((c) => (
        <Stack key={c} direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 22, height: 22, borderRadius: 1, display: 'grid', placeItems: 'center', bgcolor: CODE_COLORS[c].bg, color: CODE_COLORS[c].fg, fontSize: 12, fontWeight: 700 }}>{short(c)}</Box>
          <Typography variant="caption">{label('AttendanceCode', c)}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

interface ViewProps {
  sheet: Sheet;
  days: string[];
  valueOf: (employeeId: number, date: string, c: Cell) => Code | null;
  setCode: (employeeId: number, date: string, c: Cell, code: Code | null) => void;
}

function DayView({ sheet, days, valueOf, setCode }: ViewProps) {
  const { t } = useTranslation();
  const short = useCodeShort();
  const label = useEnumLabel();
  const today = todayIso();
  const initial = days.includes(today) ? today : sheet.lastOpenDay && days.includes(sheet.lastOpenDay) ? sheet.lastOpenDay : days[0];
  const [day, setDay] = useState(initial);
  const idx = days.indexOf(day);

  const markAllPresent = () =>
    sheet.workers.forEach((w) => {
      const c = w.cells[idx];
      if (c && editable(sheet, w, c) && !valueOf(w.employeeId, day, c)) setCode(w.employeeId, day, c, 'Present');
    });

  return (
    <Paper variant="outlined">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }} alignItems={{ sm: 'center' }}>
        <TextField select label={t('common.date')} value={day} onChange={(e) => setDay(e.target.value)} sx={{ maxWidth: 220 }}>
          {days.map((d) => (
            <MenuItem key={d} value={d}>
              {formatDate(d)}
            </MenuItem>
          ))}
        </TextField>
        {sheet.canRecord && (
          <Button onClick={markAllPresent} variant="outlined">
            {t('attendance.markAllPresent')}
          </Button>
        )}
      </Stack>
      <Box>
        {sheet.workers.map((w) => {
          const c = w.cells[idx];
          if (!c) return null;
          const v = valueOf(w.employeeId, day, c);
          const canEdit = editable(sheet, w, c);
          return (
            <Stack
              key={w.employeeId}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ sm: 'center' }}
              sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {w.employeeNumber} — {w.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {w.jobName} · {label('LaborStatus', w.fileStatus)}
                  {c.kind === 'Leave' && ` · ${label('AttendanceCode', 'ApprovedLeave')}`}
                  {c.correction && ` · ${t('attendance.corrected')}`}
                </Typography>
              </Box>
              {canEdit ? (
                <ToggleButtonGroup exclusive size="small" value={v ?? ''} onChange={(_, val: Code | null) => setCode(w.employeeId, day, c, val || null)} aria-label={w.name ?? ''}>
                  {ENTERABLE.map((code) => (
                    <ToggleButton
                      key={code}
                      value={code}
                      sx={{ minWidth: 44, fontWeight: 700, '&.Mui-selected': { bgcolor: CODE_COLORS[code].bg, color: CODE_COLORS[code].fg } }}
                      aria-label={label('AttendanceCode', code)}
                    >
                      <Tooltip title={label('AttendanceCode', code)}>
                        <span>{short(code)}</span>
                      </Tooltip>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {c.kind === 'Outside' ? t('attendance.outside') : c.kind === 'Future' ? t('attendance.future') : label('AttendanceCode', c.effective ?? v)}
                </Typography>
              )}
            </Stack>
          );
        })}
      </Box>
    </Paper>
  );
}

const CYCLE: (Code | null)[] = [null, 'Present', 'AbsentWithoutPermission', 'ExcusedAbsence', 'Rest'];

const TOTAL_KEYS = ['present', 'absent', 'leave', 'excused', 'rest'] as const;

/**
 * Month grid. Styling lives once on the table (class selectors) instead of a per-cell `sx`,
 * and each worker row is memoized so toggling one cell re-renders one row, not the whole sheet.
 */
function MonthView({ sheet, days, setCode, changes }: Omit<ViewProps, 'valueOf'> & { changes: Changes }) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ overflow: 'auto', maxHeight: '70vh' }}>
      <Box
        component="table"
        sx={{
          borderCollapse: 'separate',
          borderSpacing: 0,
          fontSize: 12,
          minWidth: '100%',
          '& th': { position: 'sticky', top: 0, zIndex: 2, bgcolor: brand.surfaceHead, p: 0.5, borderBottom: 1, borderColor: 'divider', fontWeight: 600 },
          '& th.name': { insetInlineStart: 0, zIndex: 3, p: 1, textAlign: 'start', minWidth: 200 },
          '& th.day': { minWidth: 30 },
          '& th.today': { bgcolor: alpha(brand.leaf, 0.3) },
          '& th.total': { minWidth: 34 },
          '& td': { textAlign: 'center', borderBottom: 1, borderInlineStart: 1, borderColor: 'divider' },
          '& td.name': { position: 'sticky', insetInlineStart: 0, zIndex: 1, bgcolor: 'background.paper', p: 1, borderInlineStart: 0, textAlign: 'start', whiteSpace: 'nowrap' },
          '& td.total': { fontWeight: 600 },
          '& td.cell': { p: 0, fontWeight: 700, height: 30, outlineOffset: '-2px', cursor: 'default' },
          '& td.cell.inactive': { bgcolor: brand.surfaceDisabled },
          '& td.cell.implicit': { opacity: 0.75 },
          '& td.cell.changed': { outline: '2px solid', outlineColor: 'warning.main' },
          '& td.cell.editable': { cursor: 'pointer' },
          '& td.cell.editable:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
        }}
      >
        <thead>
          <tr>
            <th className="name">{t('fields.name')}</th>
            {days.map((d) => (
              <th key={d} className={d === sheet.today ? 'day today' : 'day'}>
                {Number(d.slice(8))}
              </th>
            ))}
            {TOTAL_KEYS.map((k) => (
              <th key={k} className="total">
                {t(`attendance.totals.${k}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.workers.map((w) => (
            <MonthRow key={w.employeeId} sheet={sheet} worker={w} days={days} changes={changes} setCode={setCode} />
          ))}
        </tbody>
      </Box>
      {sheet.canRecord && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 1.5 }}>
          {t('attendance.monthHint')}
        </Typography>
      )}
    </Paper>
  );
}

interface MonthRowProps {
  sheet: Sheet;
  worker: S<'AttendanceSheetWorker'>;
  days: string[];
  changes: Changes;
  setCode: ViewProps['setCode'];
}

/** Re-render a row only when its own pending changes (or its data) change. */
function sameRow(a: MonthRowProps, b: MonthRowProps) {
  if (a.sheet !== b.sheet || a.worker !== b.worker || a.days !== b.days || a.setCode !== b.setCode) return false;
  if (a.changes === b.changes) return true;
  const id = a.worker.employeeId;
  return a.days.every((d) => {
    const k = keyOf(id, d);
    return k in a.changes === k in b.changes && a.changes[k] === b.changes[k];
  });
}

const MonthRow = memo(function MonthRow({ sheet, worker: w, days, changes, setCode }: MonthRowProps) {
  const { t } = useTranslation();
  const short = useCodeShort();
  const label = useEnumLabel();
  return (
    <tr>
      <td className="name">
        <strong>{w.employeeNumber}</strong> {w.name}
      </td>
      {w.cells.map((c, i) => {
        const d = days[i];
        const k = keyOf(w.employeeId, d);
        const changed = k in changes;
        const v = changed ? changes[k] : (c.code ?? null);
        const shown = v ?? (c.kind === 'Leave' ? 'ApprovedLeave' : c.implicit ?? null);
        const canEdit = editable(sheet, w, c);
        const color = shown ? CODE_COLORS[shown] : null;
        const inactive = c.kind === 'Outside' || c.kind === 'Future';
        const title = `${formatDate(d)} — ${shown ? label('AttendanceCode', shown) : c.kind === 'Outside' ? t('attendance.outside') : c.kind === 'Future' ? t('attendance.future') : t('attendance.unrecorded')}`;
        const cycle = () => setCode(w.employeeId, d, c, CYCLE[(CYCLE.indexOf(v) + 1) % CYCLE.length]);
        const className = ['cell', inactive && 'inactive', !v && 'implicit', changed && 'changed', canEdit && 'editable'].filter(Boolean).join(' ');
        return (
          <td
            key={d}
            className={className}
            title={title}
            style={!color ? undefined : inactive ? { color: color.fg } : { backgroundColor: color.bg, color: color.fg }}
            {...(canEdit && {
              role: 'button',
              tabIndex: 0,
              'aria-label': `${w.name ?? w.employeeNumber} · ${title}`,
              onClick: cycle,
              onKeyDown: (e: KeyboardEvent<HTMLTableCellElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  cycle();
                }
              },
            })}
          >
            {short(shown)}
          </td>
        );
      })}
      {TOTAL_KEYS.map((k) => (
        <td key={k} className="total">
          {w.totals[k]}
        </td>
      ))}
    </tr>
  );
}, sameRow);

function DeviceDifferences({ sheetId }: { sheetId: number }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const q = useQuery({ queryKey: [...attendanceKeys.sheet(sheetId), 'device'], queryFn: () => attendanceApi.deviceDifferences(sheetId) });
  type D = S<'DeviceDifference'>;
  if (q.isLoading) return <LoadingState />;
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {t('attendance.deviceHint')}
      </Typography>
      <LocalDataGrid<D>
        rows={q.data ?? []}
        getRowId={(r) => `${r.employeeNumber}-${r.date}`}
        emptyText={t('attendance.noDifferences')}
        columns={[
          col.num<D>('employeeNumber', t('fields.employeeNumber')),
          col.text<D>('name', t('fields.name')),
          col.date<D>('date', t('common.date')),
          { field: 'sheetCode', headerName: t('attendance.sheetCode'), width: 170, valueFormatter: (v: string | null) => label('AttendanceCode', v) },
          col.dateTime<D>('firstRecord', t('attendance.firstRecord')),
        ]}
      />
    </Stack>
  );
}
