import { useMemo, useState } from 'react';
import { Alert, Box, Button, FormControlLabel, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { reportsApi } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState, EmptyState } from '@/components/common/States';
import { SelectField } from '@/components/forms/SelectField';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useEmptyOverlay, useGridLocaleText } from '@/components/tables/gridHooks';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { saveBlob } from '@/services/api/download';
import { errorMessage, toApiError } from '@/services/api/errors';
import { useSnackbar } from '@/app/providers/snackbarContext';
import { resolveLink } from '@/features/tasks/links';
import { formatDate, formatDateTime } from '@/utils/format';
import type { S } from '@/types/api';

const PAGE_SIZES = [25, 50, 100];
const INITIAL_STATE = { pagination: { paginationModel: { pageSize: 50 } } };

type Criteria = S<'LaborReportCriteria'>;
type Kind = NonNullable<Criteria['kind']>;
type Filter =
  | 'period' | 'track' | 'workSite' | 'job' | 'nationality' | 'requestNumber' | 'employeeNumber' | 'requestReason' | 'requestStatus'
  | 'candidateResult' | 'recruitedBy' | 'fileStatus' | 'compliance' | 'waitingParty' | 'minimumWaitingDays' | 'custodyStatus'
  | 'nearThresholdOnly' | 'violation' | 'decision' | 'leaveType' | 'leaveStatus' | 'lateReturnOnly' | 'transferInitiator'
  | 'evaluationState' | 'evaluationResult' | 'terminationReason' | 'terminationInitiator' | 'terminationStatus' | 'permitStatus' | 'procedure';

/** Filters per report as listed in SRS §8 (RPT-01…RPT-13) plus FR-69 procedure steps. */
const FILTERS: Record<Kind, Filter[]> = {
  StaffingRequests: ['track', 'workSite', 'requestReason', 'requestStatus', 'period'],
  Candidates: ['requestNumber', 'track', 'candidateResult', 'recruitedBy'],
  Workers: ['track', 'workSite', 'job', 'nationality', 'fileStatus'],
  OnboardingCompliance: ['track', 'workSite', 'compliance', 'period'],
  PendingStartApprovals: ['waitingParty', 'minimumWaitingDays', 'track', 'workSite'],
  PassportCustody: ['custodyStatus', 'track', 'workSite'],
  Attendance: ['track', 'workSite', 'period', 'employeeNumber', 'nearThresholdOnly'],
  Penalties: ['track', 'workSite', 'violation', 'decision', 'period'],
  Leaves: ['leaveType', 'leaveStatus', 'track', 'workSite', 'period', 'lateReturnOnly'],
  Transfers: ['track', 'workSite', 'transferInitiator', 'period'],
  Evaluations: ['evaluationState', 'evaluationResult', 'track', 'workSite'],
  Terminations: ['terminationReason', 'terminationInitiator', 'terminationStatus', 'track', 'workSite', 'job', 'period'],
  EntryPermits: ['track', 'workSite', 'permitStatus', 'period'],
  ProcedureSteps: ['procedure', 'period'],
};

interface EnumFilter {
  key: keyof Criteria;
  enumName: keyof typeof ENUMS;
  label: string;
  subset?: readonly string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DT = /^\d{4}-\d{2}-\d{2}T/;

export default function ReportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const { notify } = useSnackbar();
  const options = useQuery({ queryKey: ['reports', 'options'], queryFn: reportsApi.options, staleTime: 600_000 });
  const [c, setC] = useState<Criteria>({ kind: 'StaffingRequests', nearThresholdOnly: false, lateReturnOnly: false });
  const [exporting, setExporting] = useState<string | null>(null);
  const run = useApiMutation(reportsApi.run, { success: false });
  const kind = (c.kind ?? 'StaffingRequests') as Kind;
  const filters = FILTERS[kind];
  const set = <K extends keyof Criteria>(k: K, v: Criteria[K]) => setC((p) => ({ ...p, [k]: v }));
  const num = (v: string) => (v ? Number(v) : null);

  const o = options.data;
  const tracks = (o?.tracks ?? []).map((x) => ({ value: x.id, label: x.name ?? '' }));
  const sites = (o?.trackSites ?? []).filter((s) => !c.trackId || s.trackId === c.trackId).map((x) => ({ value: x.id, label: `${x.number} — ${x.name ?? ''}` }));
  const uniqueSites = [...new Map(sites.map((s) => [s.value, s])).values()];

  const exportAs = async (format: 'Pdf' | 'Excel') => {
    setExporting(format);
    try {
      const { blob, fileName } = await reportsApi.export({ criteria: c, format });
      saveBlob(blob, fileName ?? `${kind}.${format === 'Pdf' ? 'pdf' : 'xlsx'}`);
    } catch (e) {
      notify(errorMessage(await toApiError(e, t('errors.fileFailed'))), 'error');
    } finally {
      setExporting(null);
    }
  };

  const table = run.data;
  const gridLocaleText = useGridLocaleText();
  const gridSlots = useEmptyOverlay(t('reports.noRows'));
  const columns = useMemo<GridColDef[]>(
    () =>
      (table?.columns ?? []).map((col, i) => ({
        field: `c${i}`,
        headerName: col.title ?? '',
        flex: col.width ? col.width : 1,
        minWidth: 110,
        align: col.alignment === 'End' ? 'right' : col.alignment === 'Center' ? 'center' : 'left',
        headerAlign: col.alignment === 'End' ? 'right' : col.alignment === 'Center' ? 'center' : 'left',
        valueFormatter: (v: unknown) => {
          if (v === null || v === undefined || v === '') return '—';
          if (typeof v === 'string' && ISO_DATE.test(v)) return formatDate(v);
          if (typeof v === 'string' && ISO_DT.test(v)) return formatDateTime(v);
          return String(v);
        },
      })),
    [table],
  );
  const rows = useMemo(
    () => (table?.rows ?? []).map((r, idx) => ({ id: idx, __link: r.link, ...Object.fromEntries(r.cells.map((v, i) => [`c${i}`, v])) })),
    [table],
  );

  const sel = (f: Filter) => {
    switch (f) {
      case 'track':
        return <SelectField key={f} label={t('fields.track')} value={c.trackId} options={tracks} onChange={(v) => setC((p) => ({ ...p, trackId: num(v), workSiteId: null }))} />;
      case 'workSite':
        return <SelectField key={f} label={t('fields.workSite')} value={c.workSiteId} options={uniqueSites} onChange={(v) => set('workSiteId', num(v))} />;
      case 'job':
        return <SelectField key={f} label={t('fields.job')} value={c.jobId} options={(o?.jobs ?? []).map((x) => ({ value: x.id, label: x.name ?? '' }))} onChange={(v) => set('jobId', num(v))} />;
      case 'nationality':
        return <SelectField key={f} label={t('fields.nationality')} value={c.nationalityId} options={(o?.nationalities ?? []).map((x) => ({ value: x.id, label: x.name ?? '' }))} onChange={(v) => set('nationalityId', num(v))} />;
      case 'period':
        return [
          <TextField key="from" type="date" label={t('common.from')} value={c.from ?? ''} onChange={(e) => set('from', e.target.value || null)} slotProps={{ inputLabel: { shrink: true } }} />,
          <TextField key="to" type="date" label={t('common.to')} value={c.to ?? ''} onChange={(e) => set('to', e.target.value || null)} slotProps={{ inputLabel: { shrink: true } }} />,
        ];
      case 'requestNumber':
        return <TextField key={f} type="number" label={t('staffing.number')} value={c.requestNumber ?? ''} onChange={(e) => set('requestNumber', num(e.target.value))} />;
      case 'employeeNumber':
        return <TextField key={f} type="number" label={t('fields.employeeNumber')} value={c.employeeNumber ?? ''} onChange={(e) => set('employeeNumber', num(e.target.value))} />;
      case 'minimumWaitingDays':
        return <TextField key={f} type="number" label={t('reports.minimumWaitingDays')} value={c.minimumWaitingDays ?? ''} onChange={(e) => set('minimumWaitingDays', num(e.target.value))} />;
      case 'nearThresholdOnly':
        return <FormControlLabel key={f} control={<Switch checked={!!c.nearThresholdOnly} onChange={(e) => set('nearThresholdOnly', e.target.checked)} />} label={t('reports.nearThresholdOnly')} />;
      case 'lateReturnOnly':
        return <FormControlLabel key={f} control={<Switch checked={!!c.lateReturnOnly} onChange={(e) => set('lateReturnOnly', e.target.checked)} />} label={t('leaves.lateReturnOnly')} />;
      default: {
        const map: Partial<Record<Filter, EnumFilter>> = {
          requestReason: { key: 'requestReason', enumName: 'StaffingReason', label: t('staffing.reason') },
          requestStatus: { key: 'requestStatus', enumName: 'StaffingRequestStatus', label: t('fields.status') },
          candidateResult: { key: 'candidateResult', enumName: 'CandidateStatus', label: t('reports.candidateResult') },
          recruitedBy: { key: 'recruitedBy', enumName: 'LaborParty', label: t('candidates.recruitedBy'), subset: ['LaborSection', 'Operations'] },
          fileStatus: { key: 'fileStatus', enumName: 'LaborStatus', label: t('fields.status') },
          compliance: { key: 'compliance', enumName: 'LaborComplianceState', label: t('reports.compliance') },
          waitingParty: { key: 'waitingParty', enumName: 'LaborParty', label: t('workflow.waitingFor'), subset: ['LaborSection', 'HumanResources', 'Operations', 'GeneralManager'] },
          custodyStatus: { key: 'custodyStatus', enumName: 'PassportCustodyStatus', label: t('fields.status') },
          violation: { key: 'violation', enumName: 'PenaltyViolation', label: t('penalties.violation') },
          decision: { key: 'decision', enumName: 'PenaltyDecision', label: t('penalties.decision') },
          leaveType: { key: 'leaveType', enumName: 'LeaveType', label: t('leaves.type') },
          leaveStatus: { key: 'leaveStatus', enumName: 'LeaveStatus', label: t('fields.status') },
          transferInitiator: { key: 'transferInitiator', enumName: 'TransferInitiator', label: t('transfers.initiatedBy') },
          evaluationState: { key: 'evaluationState', enumName: 'LaborEvaluationState', label: t('fields.status') },
          evaluationResult: { key: 'evaluationResult', enumName: 'EvaluationResult', label: t('evaluations.result') },
          terminationReason: { key: 'terminationReason', enumName: 'TerminationReason', label: t('terminations.reason') },
          terminationInitiator: { key: 'terminationInitiator', enumName: 'TerminationInitiator', label: t('terminations.initiator') },
          terminationStatus: { key: 'terminationStatus', enumName: 'TerminationStatus', label: t('fields.status') },
          permitStatus: { key: 'permitStatus', enumName: 'EntryPermitStatus', label: t('fields.status') },
          procedure: { key: 'procedure', enumName: 'LaborProcedure', label: t('reports.procedure') },
        };
        const m = map[f];
        if (!m) return null;
        const values = (m.subset ?? ENUMS[m.enumName]) as readonly string[];
        return (
          <SelectField
            key={f}
            label={m.label}
            value={(c[m.key] as string | null | undefined) ?? ''}
            options={enumOptions(m.enumName, values)}
            onChange={(v) => setC((p) => ({ ...p, [m.key]: v || null }))}
          />
        );
      }
    }
  };

  return (
    <Box>
      <PageHeader title={t('nav.items.reports')} subtitle={t('reports.subtitle')} />
      {options.error && <ErrorState error={options.error} />}
      {o?.scopeEmpty && <Alert severity="warning" sx={{ mb: 2 }}>{t('common.scopeEmpty')}</Alert>}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <SelectField
            label={t('reports.report')}
            value={kind}
            emptyLabel={false}
            options={ENUMS.LaborReportKind.map((k, i) => ({ value: k, label: `${k === 'ProcedureSteps' ? 'FR-69' : `RPT-${String(i + 1).padStart(2, '0')}`} — ${label('LaborReportKind', k)}` }))}
            onChange={(v) => setC({ kind: v as Kind, nearThresholdOnly: false, lateReturnOnly: false })}
            sx={{ maxWidth: 520 }}
          />
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', md: 'repeat(4, minmax(0,1fr))' }, alignItems: 'center' }}>
            {filters.flatMap((f) => sel(f))}
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => run.mutate(c)} disabled={run.isPending}>
              {run.isPending ? t('reports.running') : t('reports.run')}
            </Button>
            <Button variant="outlined" startIcon={<PictureAsPdfOutlinedIcon />} onClick={() => exportAs('Pdf')} disabled={!!exporting}>
              {t('reports.exportPdf')}
            </Button>
            <Button variant="outlined" startIcon={<GridOnOutlinedIcon />} onClick={() => exportAs('Excel')} disabled={!!exporting}>
              {t('reports.exportExcel')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
      {table ? (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">{table.title}</Typography>
            {table.criteria.map((line) => (
              <Typography key={line} variant="caption" color="text.secondary" display="block">
                {line}
              </Typography>
            ))}
            <Typography variant="caption" color="text.secondary">
              {t('reports.rowCount', { count: table.rows.length })}
            </Typography>
          </Box>
          <DataGrid
            autoHeight
            localeText={gridLocaleText}
            rows={rows}
            columns={columns}
            density="compact"
            pageSizeOptions={PAGE_SIZES}
            initialState={INITIAL_STATE}
            onRowClick={(p) => {
              const to = resolveLink(p.row.__link as string | null);
              if (to) navigate(to);
            }}
            slots={gridSlots}
            sx={{ minHeight: 240 }}
          />
        </Paper>
      ) : (
        <Paper variant="outlined">
          <EmptyState title={t('reports.pickAndRun')} description={t('reports.pickAndRunHint')} />
        </Paper>
      )}
    </Box>
  );
}
