import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { AppThemeProvider } from './ThemeProvider';
import { SnackbarProvider } from './SnackbarProvider';
import { AuthProvider } from './AuthProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (status && status >= 400 && status < 500) return false;
        return count < 2;
      },
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <SnackbarProvider>
          <AuthProvider>{children}</AuthProvider>
        </SnackbarProvider>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}
