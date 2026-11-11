import { useRef, useState, type ChangeEvent } from 'react';
import { Chip, CircularProgress, IconButton, Stack, Tooltip } from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { registrationApi, registrationKeys, type CandidateScanKind } from './api';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useFileProblemText } from '@/components/files/useFileProblemText';
import { useSnackbar } from '@/app/providers/snackbarContext';
import { openBlob } from '@/services/api/download';
import { API_ERROR_CODES, errorMessage, toApiError } from '@/services/api/errors';
import { DEFAULT_MAX_FILE_MB, validateFile } from '@/utils/files';

/** PDF or JPEG/PNG/WebP, as `POST /candidates/{id}/documents` accepts (frontend-guide §2). */
export const SCAN_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

interface Props {
  candidateId: number;
  kind: CandidateScanKind;
  attached: boolean;
  /** The passport scan is not needed for a Libyan candidate. */
  required: boolean;
  /** Status only (queue overview); the scans are attached in the registration table. */
  readOnly?: boolean;
  /** Called after an attach (true) or delete (false) so the registration row updates at once. */
  onChange?: (attached: boolean) => void;
}

/**
 * One scan of an approved candidate in the registration table: state chip + attach / replace, open and
 * delete. Each change updates the row (`onChange`) and re-reads the queue.
 */
export function CandidateScanCell({ candidateId, kind, attached, required, readOnly, onChange }: Props) {
  const { t } = useTranslation();
  const { notify } = useSnackbar();
  const problemText = useFileProblemText();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const label = t(`registration.scans.${kind}`);

  const run = async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await action();
      if (success) notify(success, 'success');
    } catch (e) {
      const err = await toApiError(e, t('errors.fileFailed'));
      notify(err.fieldErrors?.scan?.[0] ?? errorMessage(err), 'error');
      // The candidate was registered or cancelled meanwhile, or the scan changed elsewhere: show the current state.
      if (err.code === API_ERROR_CODES.concurrencyConflict || err.status === 404 || err.status === 422) {
        await qc.invalidateQueries({ queryKey: registrationKeys.queue });
      }
    } finally {
      setBusy(false);
    }
  };

  const refresh = () => qc.invalidateQueries({ queryKey: registrationKeys.queue });

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = validateFile(file, { accept: SCAN_ACCEPT, maxMb: DEFAULT_MAX_FILE_MB });
    if (problem) {
      notify(problemText(problem), 'error');
      return;
    }
    void run(async () => {
      await registrationApi.attachScan(candidateId, kind, file);
      onChange?.(true);
      await refresh();
    }, t('registration.scans.attached', { name: label }));
  };

  const open = () =>
    run(async () => {
      const { blob, fileName } = await registrationApi.openScan(candidateId, kind);
      openBlob(blob, fileName ?? `${kind}-${candidateId}`);
    });

  const remove = () =>
    run(async () => {
      await registrationApi.removeScan(candidateId, kind);
      setConfirmDelete(false);
      onChange?.(false);
      await refresh();
    }, t('registration.scans.removed', { name: label }));

  const chip = attached ? (
    <Chip size="small" color="success" variant="outlined" label={t('registration.scans.ok')} />
  ) : required ? (
    <Chip size="small" color="error" variant="outlined" label={t('registration.scans.missing')} />
  ) : (
    <Chip size="small" variant="outlined" label={t('registration.scans.notRequired')} />
  );

  if (readOnly) return chip;

  return (
    // Clicks here must not toggle the row's selection checkbox.
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: '100%' }} onClick={(e) => e.stopPropagation()}>
      {chip}
      {busy ? (
        <CircularProgress size={18} sx={{ mx: 1 }} aria-label={t('common.loading')} />
      ) : (
        <>
          <Tooltip title={attached ? t('registration.scans.replace', { name: label }) : t('registration.scans.attach', { name: label })}>
            <IconButton size="small" onClick={() => input.current?.click()} aria-label={attached ? t('registration.scans.replace', { name: label }) : t('registration.scans.attach', { name: label })}>
              <UploadFileOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {attached && (
            <>
              <Tooltip title={t('registration.scans.open', { name: label })}>
                <IconButton size="small" onClick={() => void open()} aria-label={t('registration.scans.open', { name: label })}>
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('registration.scans.remove', { name: label })}>
                <IconButton size="small" color="error" onClick={() => setConfirmDelete(true)} aria-label={t('registration.scans.remove', { name: label })}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </>
      )}
      <input ref={input} type="file" accept={SCAN_ACCEPT} hidden onChange={onFile} />
      <ConfirmDialog
        open={confirmDelete}
        title={t('registration.scans.remove', { name: label })}
        message={t('registration.scans.removeConfirm', { name: label })}
        confirmLabel={t('common.delete')}
        destructive
        loading={busy}
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(false)}
      />
    </Stack>
  );
}
