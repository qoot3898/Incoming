import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transfersApi, transfersKeys } from './api';
import { TransferForm } from './TransferForm';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { FormCard } from '@/components/forms/FormLayout';
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
    <PageContainer width="form">
      <PageHeader title={t('transfers.new')} breadcrumbs={[{ label: t('nav.items.transfers'), to: '/transfers' }]} />
      <FormCard>
        <TransferForm
          worker={worker}
          onWorkerChange={setWorker}
          submitLabel={t('transfers.submit')}
          onSubmit={(b) => submit.mutateAsync(b)}
          onCancel={() => navigate('/transfers')}
          guardUnsaved
        />
      </FormCard>
    </PageContainer>
  );
}
