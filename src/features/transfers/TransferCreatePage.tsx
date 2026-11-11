import { useNavigate } from 'react-router-dom';
import { useReturnTo } from '@/hooks/useReturnTo';
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
  const back = useReturnTo();
  const [worker, setWorker] = usePrefilledWorker();
  const submit = useApiMutation(transfersApi.submit, {
    invalidate: [transfersKeys.all, ['tasks'], ['workers']],
    rethrow: true,
    success: t('transfers.submitted'),
    onSuccess: (r) => navigate(back ?? `/transfers/${r.id}`),
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
          onCancel={() => navigate(back ?? '/transfers')}
          guardUnsaved
        />
      </FormCard>
    </PageContainer>
  );
}
