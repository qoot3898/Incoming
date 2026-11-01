import { createContext, useContext } from 'react';
import type { AlertColor } from '@mui/material';

export interface SnackbarApi {
  notify: (message: string, severity?: AlertColor) => void;
}

export const SnackbarContext = createContext<SnackbarApi>({ notify: () => undefined });

export const useSnackbar = () => useContext(SnackbarContext);
