import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { brand } from '@/app/theme/brand';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation } from 'react-i18next';
import type { S } from '@/types/api';

/** Shows a one-time temporary password returned by the backend. */
export function TempPasswordDialog({ result, onClose }: { result: S<'TemporaryPasswordResult'> | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!result} onClose={onClose} maxWidth="xs">
      <DialogTitle>{t('users.tempPasswordTitle')}</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('users.tempPasswordHint')}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          {t('users.userName')}: <strong>{result?.userName}</strong>
        </Typography>
        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: brand.creamSoft, borderRadius: 2, fontFamily: 'monospace', fontSize: '1.1rem', textAlign: 'center', direction: 'ltr', userSelect: 'all' }}>
          {result?.temporaryPassword}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<ContentCopyIcon />} onClick={() => result?.temporaryPassword && navigator.clipboard?.writeText(result.temporaryPassword).catch(() => undefined)}>
          {t('common.copy')}
        </Button>
        <Button variant="contained" onClick={onClose}>
          {t('common.done')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
