import { Box, Button } from '@mui/material';
import { useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@/components/common/States';

export function RouteError() {
  const error = useRouteError();
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 4 }}>
      <ErrorState error={error} />
      <Button sx={{ mt: 2 }} onClick={() => window.location.reload()}>
        {t('common.reload')}
      </Button>
    </Box>
  );
}
