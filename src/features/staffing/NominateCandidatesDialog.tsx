import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { candidatesApi, candidatesKeys, staffingKeys } from './api';
import { CandidatePoolPicker } from '@/features/candidates/CandidatePoolPicker';
import type { PoolCandidate } from '@/features/candidates/candidateSearch';
import { useScopeOptions } from '@/features/shared/options';
import { useApiMutation } from '@/hooks/useApiMutation';
import { errorMessage, type ApiError } from '@/services/api/errors';

interface Props {
  requestNumber: number;
  /** The request's job: the list starts narrowed to the candidates recorded for it. */
  jobName: string | null | undefined;
  onClose: () => void;
}

/**
 * Nominates available candidates of the candidate list on a request (TL-N13). The API refuses a candidate who
 * is no longer available (withdrawn, registered, nominated elsewhere) with a reason per candidate, which is
 * shown here; the whole nomination is then not saved.
 */
export function NominateCandidatesDialog({ requestNumber, jobName, onClose }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const qc = useQueryClient();
  const { jobs, jobIdByName } = useScopeOptions();
  const initialJobId = jobIdByName(jobName);
  const [chosen, setChosen] = useState<PoolCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const nominate = useApiMutation((ids: number[]) => candidatesApi.nominate(requestNumber, { candidateIds: ids }), {
    invalidate: [staffingKeys.all, candidatesKeys.all],
    rethrow: true,
    success: t('candidates.nominatedFromList'),
  });

  const submit = async () => {
    setError(null);
    try {
      await nominate.mutateAsync(chosen.map((c) => c.id));
      onClose();
    } catch (e) {
      setError(errorMessage(e as ApiError));
      // The list may have changed under the picker (someone else nominated or withdrew a candidate).
      void qc.invalidateQueries({ queryKey: candidatesKeys.all });
    }
  };

  return (
    <Dialog open onClose={nominate.isPending ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={phone}>
      <DialogTitle>{t('candidates.nominateFromList')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {t('candidates.nominateFromListHint')}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {/* Keyed so the job filter follows the request's job once the job directory has loaded. */}
          <CandidatePoolPicker
            key={initialJobId ?? 'all'}
            value={chosen}
            onChange={setChosen}
            label={t('candidates.pickerLabel')}
            jobOptions={jobs}
            initialJobId={initialJobId}
            helperText={chosen.length > 0 ? t('candidates.pickerChosen', { count: chosen.length }) : undefined}
            disabled={nominate.isPending}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={nominate.isPending}>
          {t('common.cancel')}
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={nominate.isPending || chosen.length === 0}>
          {t('candidates.nominate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
