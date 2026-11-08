import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

/** Renders `ui` inside a data router at `url`; returns the router so tests can inspect/navigate history. */
export function renderWithRouter(ui: ReactElement, url = '/') {
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries: [url] });
  const result = render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
  return { ...result, router, search: () => router.state.location.search };
}
