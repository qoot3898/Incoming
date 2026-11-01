import { useState } from 'react';
import { Button, IconButton, Tooltip, type ButtonProps } from '@mui/material';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useTranslation } from 'react-i18next';
import { sharedApi } from '@/features/shared/api';
import { openBlob } from '@/services/api/download';
import { errorMessage, toApiError } from '@/services/api/errors';
import { useSnackbar } from '@/app/providers/snackbarContext';
import type { S } from '@/types/api';

type FormCode = NonNullable<S<'LaborFormCode'>>;

function useFileAction() {
  const { notify } = useSnackbar();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<{ blob: Blob; fileName?: string }>, fallbackName: string) => {
    setBusy(true);
    try {
      const { blob, fileName } = await fn();
      openBlob(blob, fileName ?? fallbackName);
    } catch (e) {
      notify(errorMessage(await toApiError(e, t('errors.fileFailed'))), 'error');
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

/** Prints an approved form (TL-F01…F11, R01/R02) for a record as PDF (FR-65). */
export function PrintFormButton({ code, recordId, label, variant = 'outlined', size = 'medium' }: { code: FormCode; recordId?: number; label?: string; variant?: ButtonProps['variant']; size?: ButtonProps['size'] }) {
  const { t } = useTranslation();
  const { busy, run } = useFileAction();
  return (
    <Button
      variant={variant}
      size={size}
      startIcon={<PrintOutlinedIcon />}
      disabled={busy}
      onClick={() => run(() => sharedApi.printForm(code, recordId), `TL-${code}-${recordId ?? ''}.pdf`)}
    >
      {label ?? t('common.printForm', { code: `TL-${code}` })}
    </Button>
  );
}

/** Opens an attachment through the restricted attachment endpoint. */
export function AttachmentButton({ attachmentId, label, icon }: { attachmentId: number; label?: string; icon?: boolean }) {
  const { t } = useTranslation();
  const { busy, run } = useFileAction();
  const go = () => run(() => sharedApi.openAttachment(attachmentId), `attachment-${attachmentId}`);
  if (icon) {
    return (
      <Tooltip title={label ?? t('common.openAttachment')}>
        <span>
          <IconButton size="small" onClick={go} disabled={busy} aria-label={label ?? t('common.openAttachment')}>
            <AttachFileIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    );
  }
  return (
    <Button size="small" startIcon={<AttachFileIcon />} onClick={go} disabled={busy}>
      {label ?? t('common.openAttachment')}
    </Button>
  );
}

/** Generic file action button (exports, prints) */
export function FileActionButton({ label, fileName, action, icon, variant = 'outlined', disabled }: { label: string; fileName: string; action: () => Promise<{ blob: Blob; fileName?: string }>; icon?: React.ReactNode; variant?: ButtonProps['variant']; disabled?: boolean }) {
  const { busy, run } = useFileAction();
  return (
    <Button variant={variant} startIcon={icon ?? <PrintOutlinedIcon />} disabled={busy || disabled} onClick={() => run(action, fileName)}>
      {label}
    </Button>
  );
}
