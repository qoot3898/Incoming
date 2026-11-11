import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { candidatesApi, candidatesKeys, staffingKeys } from './api';
import { QueryBoundary, EmptyState } from '@/components/common/States';
import { StatusChip } from '@/components/common/StatusChip';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useScopeOptions } from '@/features/shared/options';
import { formatDateTime } from '@/utils/format';
import type { S } from '@/types/api';
import { errorMessage, type ApiError } from '@/services/api/errors';

type Candidate = S<'RequestCandidateItem'>;

export function CandidatesPanel({ requestNumber }: { requestNumber: number }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const opts = useScopeOptions();
  const query = useQuery({ queryKey: staffingKeys.candidates(requestNumber), queryFn: () => candidatesApi.forRequest(requestNumber) });
  const invalidate = [staffingKeys.all, candidatesKeys.all];
  const add = useApiMutation(candidatesApi.add, { invalidate, rethrow: true });
  const interview = useApiMutation((v: { id: number; accepted: boolean; notes: string | null }) => candidatesApi.interview(v.id, { accepted: v.accepted, notes: v.notes }), { invalidate, rethrow: true });
  const cancel = useApiMutation((v: { id: number; reason: string | null }) => candidatesApi.cancel(v.id, { reason: v.reason }), { invalidate, rethrow: true });
  const [decideOpen, setDecideOpen] = useState(false);

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
                    <ActionFormButton<S<'AddCandidateRequest'>>
                      label={t('candidates.add')}
                      variant="contained"
                      startIcon={<PersonAddAlt1OutlinedIcon />}
                      fields={[
                        { name: 'name', kind: 'text', label: t('fields.name'), required: true, maxLength: 200 },
                        { name: 'nationalityId', kind: 'select', label: t('fields.nationality'), required: true, half: true, options: opts.nationalities },
                        {
                          name: 'recruitedBy',
                          kind: 'select',
                          label: t('candidates.recruitedBy'),
                          required: true,
                          half: true,
                          options: enumOptions('LaborParty', ['LaborSection', 'Operations'] as const),
                        },
                        { name: 'nominatedBy', kind: 'text', label: t('candidates.nominatedBy'), maxLength: 200 },
                      ]}
                      onSubmit={(v) => add.mutateAsync({ ...v, requestNumber })}
                    />
                  )}
                  {rc.canDecide && (
                    <Button variant="contained" color="secondary" onClick={() => setDecideOpen(true)}>
                      {t('candidates.gmDecision')}
                    </Button>
                  )}
                </Stack>
              </Stack>
              {!rc.acceptsCandidates && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {t('candidates.notAccepting')}
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
            <LocalDataGrid<Candidate>
              rows={rc.candidates}
              getRowId={(r) => r.id}
              columns={[
                col.text<Candidate>('name', t('fields.name'), { minWidth: 180 }),
                col.text<Candidate>('nationalityName', t('fields.nationality')),
                col.text<Candidate>('nominatedBy', t('candidates.nominatedBy')),
                { field: 'recruitedBy', headerName: t('candidates.recruitedBy'), width: 140, valueFormatter: (v: string) => label('LaborParty', v) },
                col.status<Candidate>('status', t('fields.status'), 'CandidateStatus', { width: 170 }),
                {
                  field: 'interview',
                  headerName: t('candidates.interview'),
                  width: 170,
                  valueGetter: (_: unknown, r: Candidate) => (r.interview ? `${label('ApprovalDecision', r.interview.decision)} · ${formatDateTime(r.interview.decidedAt)}` : '—'),
                },
                {
                  field: 'employee',
                  headerName: t('fields.employeeNumber'),
                  width: 110,
                  renderCell: (p) => (p.row.employeeId ? <RouterLink to={`/workers/${p.row.employeeId}`}>{p.row.employeeNumber}</RouterLink> : '—'),
                },
                {
                  field: 'actions',
                  headerName: '',
                  minWidth: 230,
                  flex: 1,
                  sortable: false,
                  renderCell: (p) => (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
                      {rc.canInterview && p.row.status === 'Interview' && !p.row.interviewRefusal && (
                        <ActionFormButton<{ accepted: string; notes: string | null }>
                          label={t('candidates.recordInterview')}
                          size="small"
                          description={rc.interviewCriterion ?? undefined}
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
                          onSubmit={(v) => interview.mutateAsync({ id: p.row.id, accepted: v.accepted === 'true', notes: v.notes })}
                        />
                      )}
                      {rc.canInterview && p.row.status === 'Interview' && !!p.row.interviewRefusal && (
                        <Typography variant="caption" color="warning.main" title={p.row.interviewRefusal} sx={{ lineHeight: 1.3, whiteSpace: 'normal' }}>
                          {p.row.interviewRefusal}
                        </Typography>
                      )}
                      {p.row.canCancel && (
                        <ActionFormButton<{ reason: string | null }>
                          label={t('common.cancel')}
                          size="small"
                          color="error"
                          dialogTitle={t('candidates.cancel')}
                          destructive
                          fields={[{ name: 'reason', kind: 'textarea', label: t('common.reason'), required: true, maxLength: 500 }]}
                          onSubmit={(v) => cancel.mutateAsync({ id: p.row.id, reason: v.reason })}
                        />
                      )}
                    </Stack>
                  ),
                },
              ]}
            />
          )}
          <DecideDialog open={decideOpen} onClose={() => setDecideOpen(false)} rc={rc} />
        </Stack>
      )}
    </QueryBoundary>
  );
}

function DecideDialog({ open, onClose, rc }: { open: boolean; onClose: () => void; rc: S<'RequestCandidates'> }) {
  const { t } = useTranslation();
  const pending = rc.candidates.filter((c) => c.status === 'PendingGeneralManager' && !c.decisionRefusal);
  const [selected, setSelected] = useState<number[]>([]);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const decide = useApiMutation(candidatesApi.decide, { invalidate: [staffingKeys.all, candidatesKeys.all], rethrow: true });
  const selectedSet = new Set(selected);
  const excluded = pending.filter((c) => !selectedSet.has(c.id)).map((c) => c.id);

  const submit = async () => {
    setError(null);
    if (excluded.length > 0 && !reason.trim()) {
      setError(t('candidates.excludeReasonRequired'));
      return;
    }
    try {
      await decide.mutateAsync({ requestNumber: rc.number, approveIds: selected, excludeIds: excluded, reason: reason.trim() || null, note: note.trim() || null });
      onClose();
    } catch (e) {
      setError(errorMessage(e as ApiError));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} TransitionProps={{ onEnter: () => setSelected(pending.map((c) => c.id)) }}>
      <DialogTitle>{t('candidates.gmDecision')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t('candidates.gmDecisionHint')}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {pending.length === 0 ? (
            <EmptyState title={t('candidates.noPendingDecision')} />
          ) : (
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selected.length === pending.length}
                    indeterminate={selected.length > 0 && selected.length < pending.length}
                    onChange={(e) => setSelected(e.target.checked ? pending.map((c) => c.id) : [])}
                  />
                }
                label={<strong>{t('candidates.approveAll')}</strong>}
              />
              {pending.map((c) => (
                <Box key={c.id} sx={{ ps: 3, paddingInlineStart: 3 }}>
                  <FormControlLabel
                    control={<Checkbox checked={selectedSet.has(c.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))} />}
                    label={`${c.name} — ${c.nationalityName ?? ''}`}
                  />
                </Box>
              ))}
            </Box>
          )}
          <TextField label={t('candidates.excludeReason')} value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} helperText={t('candidates.excludeReasonHint', { count: excluded.length })} />
          <TextField label={t('workflow.note')} value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="contained" onClick={submit} disabled={decide.isPending || pending.length === 0}>
          {selected.length === 0 ? t('candidates.rejectList') : t('candidates.saveDecision', { approved: selected.length, excluded: excluded.length })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
