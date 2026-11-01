import { Box, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transfersApi, transfersKeys } from './api';
import { TransferForm } from './TransferForm';
import { PageHeader } from '@/components/common/PageHeader';
import { usePrefilledWorker } from '@/components/forms/usePrefilledWorker';
import { useApiMutation } from '@/hooks/useApiMutation';

export default function TransferCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [worker, setWorker] = usePrefilledWorker();
  const submit = useApiMutation(transfersApi.submit, {
    invalidate: [transfersKeys.all, ['tasks']],
    rethrow: true,
    success: t('transfers.submitted'),
    onSuccess: (r) => navigate(`/transfers/${r.id}`),
  });
  return (
    <Box>
      <PageHeader title={t('transfers.new')} subtitle={t('transfers.newHint')} breadcrumbs={[{ label: t('nav.items.transfers'), to: '/transfers' }]} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 820 }}>
        <TransferForm worker={worker} onWorkerChange={setWorker} submitLabel={t('transfers.submit')} onSubmit={(b) => submit.mutateAsync(b)} onCancel={() => navigate(-1)} />
      </Paper>
    </Box>
  );
}
