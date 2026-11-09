import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert, AlertTitle, Box, Button, CircularProgress, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/providers/authContext';
import { useSnackbar } from '@/app/providers/snackbarContext';
import { StandaloneLayout } from '@/components/layout/StandaloneLayout';
import { StatusChip } from '@/components/common/StatusChip';
import { InfoGrid } from '@/components/common/InfoGrid';
import { FileInput } from '@/components/files/FileInput';
import { FormErrorAlert } from '@/components/forms/FormLayout';
import { useFormServerError } from '@/components/forms/useFormServerError';
import { formatDateTime } from '@/utils/format';
import { authApi } from './api';
import { assignmentState, needsAssignment } from './assignment';

const PDF = 'application/pdf,.pdf';
/** While a letter waits for review, re-read the account so an approval opens the system without a new sign-in. */
const POLL_MS = 60_000;

/**
 * Assignment-letter gate (TL-N3): after the first sign-in (and the password change) the user uploads
 * a PDF letter; a reviewer approves it or returns it with a reason. Until then only this screen,
 * the password change, the language and sign-out are available.
 */
export default function AssignmentPage() {
  const { t } = useTranslation();
  const { user, reload, logout } = useAuth();
  const navigate = useNavigate();
  const state = assignmentState(user);
  const a = user?.assignment;
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (state !== 'PendingReview') return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') reload().catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [state, reload]);

  if (!needsAssignment(user)) return <Navigate to="/" replace />;

  const check = async () => {
    setChecking(true);
    try {
      await reload();
    } finally {
      setChecking(false);
    }
  };

  return (
    <StandaloneLayout
      persistLanguage
      actions={
        <Button
          color="inherit"
          startIcon={<LogoutOutlinedIcon />}
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
        >
          {t('auth.logout')}
        </Button>
      }
    >
      <Stack spacing={3}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" component="h1">
              {t('assignment.title')}
            </Typography>
            <StatusChip enumName="AssignmentState" value={state} />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {user?.fullName || user?.userName}
          </Typography>
        </Box>

        {state === 'Required' && <Alert severity="info">{t('assignment.requiredHint')}</Alert>}
        {state === 'Returned' && (
          <Alert severity="warning">
            <AlertTitle>{t('assignment.returnedTitle')}</AlertTitle>
            {a?.reviewNote || t('assignment.returnedNoReason')}
          </Alert>
        )}
        {state === 'PendingReview' && (
          <Alert
            severity="info"
            action={
              <Button color="inherit" size="small" onClick={check} disabled={checking} startIcon={checking ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}>
                {t('assignment.checkStatus')}
              </Button>
            }
          >
            <AlertTitle>{t('assignment.pendingTitle')}</AlertTitle>
            {t('assignment.pendingHint')}
          </Alert>
        )}

        {a?.fileName && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <InfoGrid
              columns={2}
              items={[
                { label: t('assignment.fileName'), value: a.fileName },
                { label: t('assignment.submittedAt'), value: formatDateTime(a.submittedAt) },
                { label: t('assignment.reviewedAt'), value: formatDateTime(a.reviewedAt), hidden: !a.reviewedAt },
              ]}
            />
          </Paper>
        )}

        <UploadForm replacing={state === 'PendingReview'} onUploaded={reload} />
      </Stack>
    </StandaloneLayout>
  );
}

function UploadForm({ replacing, onUploaded }: { replacing: boolean; onUploaded: () => Promise<void> }) {
  const { t } = useTranslation();
  const { notify } = useSnackbar();
  const [file, setFile] = useState<File | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [progress, setProgress] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const { serverError, handleServerError, clearServerError } = useFormServerError((_, message) => setFieldError(message), ['file']);
  const busy = progress !== null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!file) {
      setFieldError(t('validation.required'));
      return;
    }
    clearServerError();
    setFieldError(undefined);
    const ctrl = new AbortController();
    controller.current = ctrl;
    setProgress(0);
    try {
      await authApi.submitAssignment(file, {
        signal: ctrl.signal,
        onUploadProgress: (ev) => setProgress(ev.total ? Math.round((ev.loaded * 100) / ev.total) : 0),
      });
      setFile(null);
      notify(t('assignment.uploaded'), 'success');
      await onUploaded().catch(() => undefined);
    } catch (err) {
      await handleServerError(err);
    } finally {
      controller.current = null;
      setProgress(null);
    }
  };

  return (
    <Paper variant="outlined" component="form" onSubmit={submit} noValidate sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1" component="h2">
          {replacing ? t('assignment.replaceTitle') : t('assignment.uploadTitle')}
        </Typography>
        <FormErrorAlert value={serverError} />
        <FileInput
          label={t('assignment.file')}
          value={file}
          onChange={(f) => {
            setFile(f);
            setFieldError(undefined);
          }}
          accept={PDF}
          required
          disabled={busy}
          error={fieldError}
          helperText={t('assignment.fileHint')}
        />
        {busy && (
          <Box role="status" aria-live="polite">
            <LinearProgress variant={progress > 0 ? 'determinate' : 'indeterminate'} value={progress} />
            <Typography variant="caption" color="text.secondary">
              {progress >= 100 ? t('files.processing') : t('files.uploading', { percent: progress })}
            </Typography>
          </Box>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button type="submit" variant="contained" disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <UploadFileOutlinedIcon />}>
            {busy ? t('common.saving') : t('assignment.submit')}
          </Button>
          {busy && progress < 100 && (
            <Button color="inherit" onClick={() => controller.current?.abort()}>
              {t('files.cancelUpload')}
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
