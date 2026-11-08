import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { i18nReady } from '@/i18n';

// Arabic strings are bundled; wait for i18next before rendering components.
beforeAll(async () => {
  await i18nReady;
});

afterEach(() => {
  cleanup();
});

// jsdom has no object URLs; previews only need a placeholder string.
if (!URL.createObjectURL) URL.createObjectURL = vi.fn(() => 'blob:test');
if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn();
