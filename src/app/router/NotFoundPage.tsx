import { Button, Paper } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/common/States';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 4 }}>
      <EmptyState
        title={t('errors.pageNotFoundTitle')}
        description={t('errors.pageNotFound')}
        action={
          <Button component={Link} to="/" variant="contained" sx={{ mt: 2 }}>
            {t('nav.backHome')}
          </Button>
        }
      />
    </Paper>
  );
}
