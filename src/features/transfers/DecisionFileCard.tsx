import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DECISION_FILE_ACCEPT, transfersApi, transfersKeys } from './api';
import { SectionCard } from '@/components/common/SectionCard';
import { RefusalHint } from '@/components/common/RefusalHint';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FileActionButton } from '@/components/common/FileButtons';
import { FormDialog } from '@/components/forms/FormDialog';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useSnackbar } from '@/app/providers/snackbarContext';
import { API_ERROR_CODES, isApiError } from '@/services/api/errors';
import type { TransferOptions } from '@/services/api/client';
import { formatBytes } from '@/utils/files';
import { formatDateTime } from '@/utils/format';
import type { S } from '@/types/api';

/** The API says the state moved on (a party decided meanwhile, the file went): the card must be re-read. */
const isStale = (e: unknown) => isApiError(e) && (e.code === API_ERROR_CODES.concurrencyConflict || e.status === 404 || e.status === 422);

/**
 * «قرار النقل» (TL-N12): the optional PDF attached to a transfer request, reviewed by the parties before they
 * decide. Attach / replace / delete follow `canChangeDecisionFile`; when the API refuses (a party already decided
 * in this round, or the approvals are complete) `decisionFileRefusal` is shown instead. Anyone who can see the
 * request may open the file (every opening is audited by the API).
 */
export function DecisionFileCard({ transfer: d }: { transfer: S<'TransferDetails'> }) {
  const { t, i18n } = useTranslation();
  const { notify } = useSnackbar();
  const qc = useQueryClient();
  const [attachOpen, setAttachOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const file = d.decisionFile;
  const refresh = () => qc.invalidateQueries({ queryKey: transfersKeys.all });

  const attach = useApiMutation((vars: { file: File; transfer: TransferOptions }) => transfersApi.attachDecisionFile(d.id, vars.file, vars.transfer), {
    invalidate: [transfersKeys.all],
    rethrow: true,
    success: t('transfers.decisionFile.attached'),
  });
  const remove = useApiMutation(() => transfersApi.removeDecisionFile(d.id), { invalidate: [transfersKeys.all], success: t('transfers.decisionFile.removed') });

  const submitFile = async (v: { file: File | null }, transfer: TransferOptions) => {
    if (!v.file) return;
    try {
      await attach.mutateAsync({ file: v.file, transfer });
    } catch (e) {
      if (!isStale(e)) throw e;
      // 409: a party decided in the same moment → show the new state and close. 422/404: keep the API's reason in the dialog.
      await refresh();
      if (isApiError(e) && e.code === API_ERROR_CODES.concurrencyConflict) notify(t('transfers.decisionFile.conflict'), 'warning');
      else throw e;
    }
  };

  const actions = d.canChangeDecisionFile && (
    <Stack direction="row" spacing={1}>
      <Button size="small" startIcon={<UploadFileOutlinedIcon />} onClick={() => setAttachOpen(true)}>
        {file ? t('transfers.decisionFile.replace') : t('transfers.decisionFile.attach')}
      </Button>
      {file && (
        <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setConfirmDelete(true)}>
          {t('transfers.decisionFile.remove')}
        </Button>
      )}
    </Stack>
  );

  return (
    <SectionCard title={t('transfers.decisionFile.title')} subheader={t('transfers.decisionFile.hint')} action={actions || undefined}>
      <Stack spacing={1.5}>
        {file ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap title={file.fileName ?? undefined}>
                {file.fileName ?? t('transfers.decisionFile.title')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {[formatBytes(file.size, i18n.language), file.attachedAt ? `${t('transfers.decisionFile.attachedAt')} ${formatDateTime(file.attachedAt)}` : null].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
            <FileActionButton
              label={t('transfers.decisionFile.open')}
              fileName={file.fileName ?? `transfer-${d.id}-decision.pdf`}
              icon={<PictureAsPdfOutlinedIcon />}
              action={() => transfersApi.openDecisionFile(d.id)}
            />
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('transfers.decisionFile.none')}
          </Typography>
        )}
        {!d.canChangeDecisionFile && <RefusalHint text={d.decisionFileRefusal} />}
      </Stack>
      {attachOpen && (
        <FormDialog<{ file: File | null }>
          open
          onClose={() => setAttachOpen(false)}
          title={file ? t('transfers.decisionFile.replace') : t('transfers.decisionFile.attach')}
          description={file ? t('transfers.decisionFile.replaceHint') : undefined}
          fields={[{ name: 'file', kind: 'file', label: t('transfers.decisionFile.fileLabel'), accept: DECISION_FILE_ACCEPT, required: true, helperText: t('transfers.decisionFile.fileHint') }]}
          submitLabel={file ? t('transfers.decisionFile.replace') : t('transfers.decisionFile.attach')}
          onSubmit={submitFile}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        title={t('transfers.decisionFile.remove')}
        message={t('transfers.decisionFile.removeConfirm')}
        confirmLabel={t('common.delete')}
        destructive
        loading={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(undefined, {
            onError: (e) => {
              if (isStale(e)) void refresh();
            },
            onSettled: () => setConfirmDelete(false),
          })
        }
      />
    </SectionCard>
  );
}
