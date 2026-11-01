import { Button } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/features/authentication/api';
import { tokenStorage } from '@/services/api/tokenStorage';

export function LanguageSwitcher({ persistToServer = true }: { persistToServer?: boolean }) {
  const { i18n, t } = useTranslation();
  const next = i18n.language === 'ar' ? 'en' : 'ar';
  const toggle = async () => {
    await i18n.changeLanguage(next);
    if (persistToServer && tokenStorage.get()) {
      authApi.setLanguage({ language: next }).catch(() => undefined);
    }
  };
  return (
    <Button color="inherit" startIcon={<TranslateIcon />} onClick={toggle} aria-label={t('header.switchLanguage')} sx={{ minWidth: 0 }}>
      {next === 'en' ? 'English' : 'العربية'}
    </Button>
  );
}
