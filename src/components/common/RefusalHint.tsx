import { Alert } from '@mui/material';

/** Shows the backend's reason why an action is not available right now. */
export function RefusalHint({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <Alert severity="info" variant="outlined" sx={{ py: 0, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
      {text}
    </Alert>
  );
}
