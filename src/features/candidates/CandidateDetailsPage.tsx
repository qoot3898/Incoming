import { useMemo } from 'react';
import { Box, Button, Grid2 as Grid, Link, Stack, Typography } from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { candidatesApi, candidatesKeys, staffingKeys } from '@/features/staffing/api';
import { registrationApi } from '@/features/registration/api';
import { CANDIDATE_LIMITS, useCandidateFields, type CandidateValues } from './candidateFields';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { InfoGrid } from '@/components/common/InfoGrid';
import { StatusChip } from '@/components/common/StatusChip';
import { FileActionButton } from '@/components/common/FileButtons';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { useAuth } from '@/app/providers/authContext';
import { useSnackbar } from '@/app/providers/snackbarContext';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { ACTION_PERMISSIONS } from '@/constants/permissions';
import { API_ERROR_CODES, isApiError } from '@/services/api/errors';
import { formatBytes } from '@/utils/files';
import { formatDateTime } from '@/utils/format';
import type { S } from '@/types/api';

type Details = S<'CandidateDetails'>;
type Nomination = S<'CandidateNominationItem'>;

/**
 * The candidate card (TL-N13): his data, the copies attached to him and every nomination of his on a request
 * within the user's scope. What the user may do (`canEdit`, `canWithdraw`, `canRestore`, `canNominate`) comes
 * from the API; the card never decides it from the candidate's state.
 */
export default function CandidateDetailsPage() {
  const { t } = useTranslation();
  const id = Number(useParams().candidateId);
  const query = useQuery({ queryKey: candidatesKeys.detail(id), queryFn: () => candidatesApi.get(id) });

  return (
    <QueryBoundary query={query}>
      {(d) => (
        <Box>
          <PageHeader
            title={d.name ?? t('candidates.card.data')}
            subtitle={[d.nationalityName, d.jobName].filter(Boolean).join(' · ')}
            breadcrumbs={[{ label: t('candidates.listTitle'), to: '/candidates' }]}
            meta={<StatusChip enumName="CandidatePoolStatus" value={d.poolStatus} />}
            actions={<Actions d={d} />}
          />
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Stack spacing={3}>
                <DataSection d={d} />
                <DocumentsSection d={d} />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 7 }}>
              <NominationsSection d={d} />
            </Grid>
          </Grid>
        </Box>
      )}
    </QueryBoundary>
  );
}

function Actions({ d }: { d: Details }) {
  const { t } = useTranslation();
  const { notify } = useSnackbar();
  const qc = useQueryClient();
  const fields = useCandidateFields();
  const invalidate = [candidatesKeys.all, staffingKeys.all];
  const update = useApiMutation((v: CandidateValues) => candidatesApi.update(d.id, { ...v, rowVersion: d.rowVersion }), { invalidate, rethrow: true, success: t('candidates.saved') });
  const withdraw = useApiMutation((v: S<'WithdrawCandidateRequest'>) => candidatesApi.withdraw(d.id, v), { invalidate, rethrow: true, success: t('candidates.withdrawn') });
  const restore = useApiMutation(() => candidatesApi.restore(d.id), { invalidate, success: t('candidates.restored') });
  const nominate = useApiMutation((requestNumber: number) => candidatesApi.nominate(requestNumber, { candidateIds: [d.id] }), { invalidate, rethrow: true, success: false });

  const saveChanges = async (v: CandidateValues) => {
    try {
      await update.mutateAsync(v);
    } catch (e) {
      if (!(isApiError(e) && e.code === API_ERROR_CODES.concurrencyConflict)) throw e;
      // Someone corrected the candidate after this card was read: show the current data instead of overwriting it.
      notify(t('candidates.conflict'), 'warning');
      await qc.invalidateQueries({ queryKey: candidatesKeys.detail(d.id) });
    }
  };

  return (
    <>
      {d.canNominate && (
        <ActionFormButton<{ requestNumber: number | null }>
          label={t('candidates.nominate')}
          variant="contained"
          description={t('candidates.nominateHint')}
          submitLabel={t('candidates.nominate')}
          fields={[{ name: 'requestNumber', kind: 'number', label: t('candidates.requestNumber'), required: true, min: 1, step: 1 }]}
          onSubmit={async (v) => {
            if (v.requestNumber === null) return;
            await nominate.mutateAsync(v.requestNumber);
            notify(t('candidates.nominatedOn', { number: v.requestNumber }), 'success');
          }}
        />
      )}
      {d.canEdit && (
        <ActionFormButton<CandidateValues>
          label={t('candidates.edit')}
          dialogTitle={t('candidates.editTitle')}
          fields={fields}
          defaultValues={{ name: d.name, nationalityId: d.nationalityId, recruitedBy: d.recruitedBy, phone: d.phone, jobId: d.jobId, nominatedBy: d.nominatedBy, notes: d.notes }}
          onSubmit={saveChanges}
        />
      )}
      {d.canRestore && (
        <Button variant="contained" onClick={() => restore.mutate(undefined)} disabled={restore.isPending}>
          {t('candidates.restore')}
        </Button>
      )}
      {d.canWithdraw && (
        <ActionFormButton<S<'WithdrawCandidateRequest'>>
          label={t('candidates.withdraw')}
          color="error"
          destructive
          description={t('candidates.withdrawHint')}
          submitLabel={t('candidates.withdraw')}
          fields={[{ name: 'reason', kind: 'textarea', label: t('candidates.withdrawReason'), required: true, maxLength: CANDIDATE_LIMITS.notes }]}
          onSubmit={(v) => withdraw.mutateAsync(v)}
        />
      )}
    </>
  );
}

function DataSection({ d }: { d: Details }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const withdrawn = d.poolStatus === 'Withdrawn';
  return (
    <SectionCard title={t('candidates.card.data')}>
      <InfoGrid
        columns={2}
        items={[
          { label: t('fields.nationality'), value: d.nationalityName },
          { label: t('candidates.phone'), value: d.phone },
          { label: t('candidates.candidateJob'), value: d.jobName },
          { label: t('candidates.recruitedBy'), value: label('LaborParty', d.recruitedBy) },
          { label: t('candidates.nominatedBy'), value: d.nominatedBy },
          { label: t('candidates.card.createdBy'), value: d.createdBy },
          { label: t('common.createdAt'), value: formatDateTime(d.createdAt) },
          {
            label: t('candidates.card.registeredAs'),
            value: d.employeeId ? (
              <Link component={RouterLink} to={`/workers/${d.employeeId}`} underline="hover">
                {d.employeeNumber}
              </Link>
            ) : null,
            hidden: !d.employeeId,
          },
          { label: t('candidates.card.withdrawnAt'), value: formatDateTime(d.withdrawnAt), hidden: !withdrawn },
          { label: t('candidates.card.withdrawalReason'), value: d.withdrawalReason, span: 2, hidden: !withdrawn },
          { label: t('common.notes'), value: d.notes, span: 2, hidden: !d.notes },
        ]}
      />
    </SectionCard>
  );
}

/**
 * The passport and health-certificate copies. They are attached and deleted from the registration screen and
 * opened only by users who register workers, so the open button follows that permission.
 */
function DocumentsSection({ d }: { d: Details }) {
  const { t, i18n } = useTranslation();
  const { can } = useAuth();
  const mayOpen = can(ACTION_PERMISSIONS.registerWorkers);
  return (
    <SectionCard title={t('candidates.card.documents')} subheader={t('candidates.card.scanHint')}>
      {d.documents.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('candidates.card.noDocuments')}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {d.documents.map((doc) => (
            <Stack key={doc.kind} direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {t(`registration.scans.${doc.kind}`)}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {[doc.fileName, formatBytes(doc.size, i18n.language), formatDateTime(doc.attachedAt)].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
              {mayOpen && (
                <FileActionButton
                  label={t('common.open')}
                  fileName={doc.fileName ?? `${doc.kind}-${d.id}`}
                  icon={<PictureAsPdfOutlinedIcon />}
                  action={() => registrationApi.openScan(d.id, doc.kind)}
                />
              )}
            </Stack>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

const stepText = (step: Nomination['interview'], decision: (v: string) => string) => (step ? [decision(step.decision), step.decidedBy].filter(Boolean).join(' · ') : '—');

function NominationsSection({ d }: { d: Details }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  // TL-N15: a General Manager decision only exists on nominations decided before that step was removed.
  const showGeneralManager = d.nominations.some((n) => n.generalManager);
  const columns = useMemo<GridColDef<Nomination>[]>(
    () => [
      {
        field: 'requestNumber',
        headerName: t('candidates.card.request'),
        width: 100,
        renderCell: (p) => (
          <Link component={RouterLink} to={`/staffing-requests/${p.row.requestNumber}`} underline="hover" onClick={(e) => e.stopPropagation()}>
            {p.row.requestNumber}
          </Link>
        ),
      },
      col.text<Nomination>('trackName', t('fields.track')),
      col.text<Nomination>('workSiteName', t('fields.workSite')),
      col.text<Nomination>('jobName', t('candidates.requestJob')),
      col.status<Nomination>('status', t('fields.status'), 'CandidateStatus', { width: 170 }),
      col.text<Nomination>('statusReason', t('common.reason'), { minWidth: 180 }),
      {
        field: 'interview',
        headerName: t('candidates.interview'),
        width: 190,
        valueGetter: (_: unknown, r: Nomination) => stepText(r.interview, (v) => label('ApprovalDecision', v)),
      },
      ...(showGeneralManager
        ? [
            {
              field: 'generalManager',
              headerName: t('candidates.gmDecision'),
              width: 190,
              valueGetter: (_: unknown, r: Nomination) => stepText(r.generalManager, (v) => label('ApprovalDecision', v)),
            } satisfies GridColDef<Nomination>,
          ]
        : []),
      col.dateTime<Nomination>('nominatedAt', t('candidates.card.nominatedAt')),
    ],
    [label, t, showGeneralManager],
  );
  return (
    <SectionCard title={`${t('candidates.card.nominations')} (${d.nominations.length})`} noPadding>
      <LocalDataGrid<Nomination> rows={d.nominations} getRowId={(r) => r.nominationId} columns={columns} emptyText={t('candidates.card.noNominations')} />
    </SectionCard>
  );
}
