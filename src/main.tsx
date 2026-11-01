import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { i18nReady } from '@/i18n';
import { AppProviders } from '@/app/providers/AppProviders';
import { router } from '@/app/router';

const root = createRoot(document.getElementById('root')!);

// Render once the active language is loaded (immediate for Arabic; one small chunk for English).
// If the locale chunk fails, render anyway — the Arabic fallback strings are bundled.
void i18nReady
  .catch(() => undefined)
  .then(() => {
    root.render(
      <StrictMode>
        <AppProviders>
          <RouterProvider router={router} />
        </AppProviders>
      </StrictMode>,
    );
  });
