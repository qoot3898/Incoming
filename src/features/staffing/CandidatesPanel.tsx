import { useMemo, useState } from 'react';
import { Alert, Box, Button, Stack, Typography, Card, CardContent, Link } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { candidatesApi, candidatesKeys, staffingKeys } from './api';
import { NominateCandidatesDialog } from './NominateCandidatesDialog';
import { useCandidateFields, type CandidateValues } from '@/features/candidates/candidateFields';
import { useScopeOptions } from '@/features/shared/options';
import { QueryBoundary, EmptyState } from '@/components/common/States';
import { StatusChip } from '@/components/common/StatusChip';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { formatDateTime } from '@/utils/format';
import type { S } from '@/types/api';

type Candidate = S<'RequestCandidateItem'>;

/**
 * The nominations on a request (TL-N13): candidates are chosen from the candidate list or added new, and may be
 * nominated from the moment the request is submitted; interviews start once it is approved. Cancelling a
 * nomination sends the candidate back to the list with his data and copies. Since TL-N15 the interview is the
 * whole chain: a candidate accepted in it is approved and goes to registration (no General Manager decision).
 */
export function CandidatesPanel({ requestNumber, jobName }: { requestNumber: number; jobName?: string | null }) {
  const { t } = useTranslation();
  const fields = useCandidateFields();
  // A candidate added here is for this request's job unless the user picks another (the directory is read by name).
  const requestJobId = useScopeOptions().jobIdByName(jobName);
  const query = useQuery({ queryKey: staffingKeys.candidates(requestNumber), queryFn: () => candidatesApi.forRequest(requestNumber) });
  const invalidate = [staffingKeys.all, candidatesKeys.all];
  const add = useApiMutation((v: CandidateValues) => candidatesApi.add({ ...v, requestNumber }), { invalidate, rethrow: true, success: t('candidates.added') });
  const [nominateOpen, setNominateOpen] = useState(false);

  return (
    <QueryBoundary query={query}>
      {(rc) => (
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
                <Stack direction="row" spacing={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('staffing.count')}
                    </Typography>
                    <Typography variant="h6">{rc.count}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('staffing.approvedCount')}
                    </Typography>
                    <Typography variant="h6">{rc.approvedCount}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('fields.status')}
                    </Typography>
                    <Box>
                      <StatusChip enumName="StaffingRequestStatus" value={rc.status} />
                    </Box>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {rc.canAdd && (
                    <>
                      <Button variant="contained" startIcon={<PlaylistAddCheckOutlinedIcon />} onClick={() => setNominateOpen(true)}>
                        {t('candidates.nominateFromList')}
                      </Button>
                      <ActionFormButton<CandidateValues>
                        label={t('candidates.newCandidate')}
                        dialogTitle={t('candidates.add')}
                        startIcon={<PersonAddAlt1OutlinedIcon />}
                        description={t('candidates.addAndNominateHint')}
                        fields={fields}
                        defaultValues={{ jobId: requestJobId }}
                        onSubmit={(v) => add.mutateAsync(v)}
                      />
                    </>
                  )}
                </Stack>
              </Stack>
              {!rc.acceptsCandidates && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {rc.canAdd ? t('candidates.interviewsAfterApproval') : t('candidates.notAccepting')}
                </Typography>
              )}
              {rc.interviewCriterion && (
                <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                  <strong>{t('candidates.interviewCriterion')}: </strong>
                  {rc.interviewCriterion}
                </Alert>
              )}
            </CardContent>
          </Card>
          {rc.candidates.length === 0 ? (
            <Card>
              <EmptyState title={t('candidates.none')} />
            </Card>
          ) : (
            <RequestCandidatesGrid rc={rc} />
          )}
          {nominateOpen && <NominateCandidatesDialog requestNumber={requestNumber} jobName={jobName} onClose={() => setNominateOpen(false)} />}
        </Stack>
      )}
    </QueryBoundary>
  );
}

/** One row per nomination; columns are rebuilt only when the request's flags or the language change. */
function RequestCandidatesGrid({ rc }: { rc: S<'RequestCandidates'> }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const invalidate = [staffingKeys.all, candidatesKeys.all];
  const interview = useApiMutation((v: { id: number; accepted: boolean; notes: string | null }) => candidatesApi.interview(v.id, { accepted: v.accepted, notes: v.notes }), { invalidate, rethrow: true });
  const cancel = useApiMutation((v: { id: number; reason: string | null }) => candidatesApi.cancel(v.id, { reason: v.reason }), { invalidate, rethrow: true });
  const { canInterview, interviewCriterion } = rc;
  // TL-N15: the General Manager decision only exists on nominations decided before it was removed.
  const showGeneralManager = rc.candidates.some((c) => c.generalManager);
  const interviewMutate = interview.mutateAsync;
  const cancelMutate = cancel.mutateAsync;

  const columns = useMemo<GridColDef<Candidate>[]>(() => {
    const step = (s: Candidate['interview']) => (s ? `${label('ApprovalDecision', s.decision)} · ${formatDateTime(s.decidedAt)}` : '—');
    const interviewDescription = (
      <>
        {interviewCriterion && <div>{interviewCriterion}</div>}
        <div>{t('candidates.acceptApproves')}</div>
      </>
    );
    return [
      {
        field: 'name',
        headerName: t('fields.name'),
        flex: 1,
        minWidth: 180,
        renderCell: (p) => (
          <Link component={RouterLink} to={`/candidates/${p.row.id}`} underline="hover" onClick={(e) => e.stopPropagation()}>
            {p.row.name}
          </Link>
        ),
      },
      col.status<Candidate>('status', t('fields.status'), 'CandidateStatus', { width: 170 }),
      // The row's actions sit next to its status: the grid scrolls sideways and they must stay in view.
      {
        field: 'actions',
        headerName: '',
        minWidth: 230,
        flex: 1,
        sortable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
            {canInterview && p.row.status === 'Interview' && !p.row.interviewRefusal && (
              <ActionFormButton<{ accepted: string; notes: string | null }>
                label={t('candidates.recordInterview')}
                size="small"
                description={interviewDescription}
                fields={[
                  {
                    name: 'accepted',
                    kind: 'select',
                    label: t('candidates.interviewResult'),
                    required: true,
                    options: [
                      { value: 'true', label: t('candidates.accepted') },
                      { value: 'false', label: t('candidates.notAccepted') },
                    ],
                  },
                  { name: 'notes', kind: 'textarea', label: t('candidates.experienceNotes'), maxLength: 1000 },
                ]}
                onSubmit={(v) => interviewMutate({ id: p.row.id, accepted: v.accepted === 'true', notes: v.notes })}
              />
            )}
            {canInterview && p.row.status === 'Interview' && !!p.row.interviewRefusal && (
              <Typography variant="caption" color="warning.main" title={p.row.interviewRefusal} sx={{ lineHeight: 1.3, whiteSpace: 'normal' }}>
                {p.row.interviewRefusal}
              </Typography>
            )}
            {p.row.canCancel && (
              <ActionFormButton<{ reason: string | null }>
                label={t('candidates.cancel')}
                size="small"
                color="error"
                description={t('candidates.cancelHint')}
                destructive
                fields={[{ name: 'reason', kind: 'textarea', label: t('common.reason'), required: true, maxLength: 500 }]}
                onSubmit={(v) => cancelMutate({ id: p.row.id, reason: v.reason })}
              />
            )}
          </Stack>
        ),
      },
      col.text<Candidate>('phone', t('candidates.phone'), { minWidth: 130 }),
      col.text<Candidate>('nationalityName', t('fields.nationality')),
      col.text<Candidate>('nominatedBy', t('candidates.nominatedBy')),
      { field: 'recruitedBy', headerName: t('candidates.recruitedBy'), width: 140, valueFormatter: (v: string) => label('LaborParty', v) },
      { field: 'interview', headerName: t('candidates.interview'), width: 170, valueGetter: (_: unknown, r: Candidate) => step(r.interview) },
      ...(showGeneralManager
        ? [{ field: 'generalManager', headerName: t('candidates.gmDecision'), width: 170, valueGetter: (_: unknown, r: Candidate) => step(r.generalManager) } satisfies GridColDef<Candidate>]
        : []),
      {
        field: 'employee',
        headerName: t('fields.employeeNumber'),
        width: 110,
        renderCell: (p) => (p.row.employeeId ? <RouterLink to={`/workers/${p.row.employeeId}`}>{p.row.employeeNumber}</RouterLink> : '—'),
      },
    ];
  }, [t, label, canInterview, interviewCriterion, showGeneralManager, interviewMutate, cancelMutate]);

  return <LocalDataGrid<Candidate> rows={rc.candidates} getRowId={(r) => r.id} columns={columns} />;
}
