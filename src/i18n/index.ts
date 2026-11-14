import i18n, { type BackendModule, type ResourceKey } from 'i18next';
import { initReactI18next } from 'react-i18next';
// Arabic is the default and fallback language, so it ships in the main bundle.
import ar from './locales/ar.json';
import { setApiLanguage } from '@/services/api/client';

/** Loads non-bundled locales on demand (English is ~53 kB of JSON most users never need). */
const lazyLocales: BackendModule = {
  type: 'backend',
  init: () => undefined,
  read(language, _namespace, callback) {
    if (language !== 'en') {
      callback(null, {});
      return;
    }
    import('./locales/en.json').then(
      (m) => callback(null, m.default as ResourceKey),
      (e: unknown) => callback(e instanceof Error ? e : new Error(String(e)), null),
    );
  },
};

/** Also read by the inline script in index.html (direction before first paint): rename both together. */
export const LANG_KEY = 'qoot.labor.lang';
export const SUPPORTED_LANGUAGES = ['ar', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function initialLanguage(): AppLanguage {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'ar' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  return 'ar';
}

const lng = initialLanguage();
setApiLanguage(lng);

/** Resolves once the initial language's strings are available (awaited before first render). */
export const i18nReady = i18n
  .use(lazyLocales)
  .use(initReactI18next)
  .init({
    resources: { ar: { translation: ar } },
    partialBundledLanguages: true,
    lng,
    fallbackLng: 'ar',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

i18n.on('languageChanged', (l) => {
  setApiLanguage(l);
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* ignore */
  }
});

export function normalizeLanguage(value?: string | null): AppLanguage | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v.startsWith('ar')) return 'ar';
  if (v.startsWith('en')) return 'en';
  return null;
}

export default i18n;
