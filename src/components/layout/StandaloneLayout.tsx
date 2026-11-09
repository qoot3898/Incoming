import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';
import { layout } from '@/app/theme/layout';

interface Props {
  children: ReactNode;
  /** Extra header controls (e.g. sign out). */
  actions?: ReactNode;
  /** Save the language choice to the account (signed-in pages only). */
  persistLanguage?: boolean;
  width?: keyof typeof layout.pageWidth;
}

/**
 * Shell for pages outside the app layout: the public complaint form and the assignment-letter
 * gate. Brand, language switch and a centered content column; no navigation.
 */
export function StandaloneLayout({ children, actions, persistLanguage = false, width = 'narrow' }: Props) {
  const { t } = useTranslation();
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Box component="header" sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: { xs: 2, sm: 3 }, minHeight: layout.headerHeight }}>
          <BrandMark size={34} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {t('app.company')}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="div">
              {t('app.name')}
            </Typography>
          </Box>
          <LanguageSwitcher persistToServer={persistLanguage} />
          {actions}
        </Stack>
      </Box>
      <Box component="main" id="main" sx={{ flex: 1, display: 'flex', justifyContent: 'center', p: layout.pagePadding }}>
        <Box sx={{ width: '100%', maxWidth: layout.pageWidth[width], minWidth: 0 }}>{children}</Box>
      </Box>
    </Box>
  );
}
