import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { SnackbarContext as Ctx } from './snackbarContext';
import { Alert, Snackbar, type AlertColor } from '@mui/material';

interface Toast {
  id: number;
  message: string;
  severity: AlertColor;
}


export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Toast[]>([]);
  const notify = useCallback((message: string, severity: AlertColor = 'success') => {
    setQueue((q) => [...q, { id: Date.now() + Math.random(), message, severity }]);
  }, []);
  const current = queue[0];
  const close = () => setQueue((q) => q.slice(1));
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Snackbar
        key={current?.id}
        open={!!current}
        autoHideDuration={current?.severity === 'error' ? 8000 : 4000}
        onClose={(_, reason) => reason !== 'clickaway' && close()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {current ? (
          <Alert variant="filled" severity={current.severity} onClose={close} sx={{ minWidth: 320 }}>
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Ctx.Provider>
  );
}
