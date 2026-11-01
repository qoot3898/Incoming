import { useEffect, useMemo, type ReactNode } from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { createAppTheme } from '@/app/theme/theme';

const rtlCache = createCache({ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin] });
const ltrCache = createCache({ key: 'muiltr', stylisPlugins: [prefixer] });

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const direction = i18n.dir(i18n.language);
  const theme = useMemo(() => createAppTheme(direction), [direction]);

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
  }, [direction, i18n.language]);

  return (
    <CacheProvider value={direction === 'rtl' ? rtlCache : ltrCache}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </CacheProvider>
  );
}
