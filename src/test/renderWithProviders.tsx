import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '@/app/providers/authContext';
import { SnackbarContext, type SnackbarApi } from '@/app/providers/snackbarContext';

interface Options {
  /** Permission codes the signed-in user holds (`can` checks them). */
  permissions?: string[];
  /** Router location and the route path that mounts `ui` (for pages that read route params). */
  url?: string;
  path?: string;
  notify?: SnackbarApi['notify'];
}

/** Renders `ui` with the providers screens need: query cache, router, a signed-in user and the snackbar. */
export function renderWithProviders(ui: ReactElement, { permissions = [], url = '/', path = '*', notify = () => undefined }: Options = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const auth = {
    status: 'authenticated',
    user: null,
    sessionExpired: false,
    login: () => Promise.reject(new Error('not used')),
    logout: () => Promise.resolve(),
    reload: () => Promise.resolve(),
    can: (codes) => !codes || codes.length === 0 || codes.some((c) => permissions.includes(c)),
  } satisfies AuthContextValue;
  const router = createMemoryRouter([{ path, element: ui }], { initialEntries: [url] });
  const result = render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <SnackbarContext.Provider value={{ notify }}>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </SnackbarContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { ...result, client, router };
}
