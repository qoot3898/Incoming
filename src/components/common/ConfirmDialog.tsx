import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, destructive, loading, onConfirm, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button variant="contained" color={destructive ? 'error' : 'primary'} onClick={onConfirm} disabled={loading}>
          {confirmLabel ?? t('common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
