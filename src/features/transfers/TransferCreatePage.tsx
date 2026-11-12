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
import { useSnackbar } from '@/app/providers/snackbarContext';
import { errorMessage, toApiError } from '@/services/api/errors';
import type { S } from '@/types/api';

interface Submission {
  body: S<'TransferRequestInput'>;
  decisionFile: File | null;
}

export default function TransferCreatePage() {
  const { t } = useTranslation();
  const { notify } = useSnackbar();
  const navigate = useNavigate();
  const back = useReturnTo();
  const [worker, setWorker] = usePrefilledWorker();
  // TL-N12: the request is submitted as JSON first, then the optional decision PDF is attached to it. A failed
  // attachment must not read as a failed submission (a retry would file the request twice): the request exists,
  // so the user is told and taken to its page where the file can be attached again.
  const submit = useApiMutation(
    async ({ body, decisionFile }: Submission) => {
      const { id } = await transfersApi.submit(body);
      if (!decisionFile) return { id, attachProblem: null };
      try {
        await transfersApi.attachDecisionFile(id, decisionFile);
        return { id, attachProblem: null };
      } catch (e) {
        const err = await toApiError(e, t('errors.generic'));
        return { id, attachProblem: err.fieldErrors?.file?.[0] ?? errorMessage(err) };
      }
    },
    {
      invalidate: [transfersKeys.all, ['tasks'], ['workers']],
      rethrow: true,
      success: t('transfers.submitted'),
      onSuccess: (r) => {
        if (r.attachProblem) notify(t('transfers.decisionFile.attachLater', { reason: r.attachProblem }), 'warning');
        navigate(r.attachProblem ? `/transfers/${r.id}` : (back ?? `/transfers/${r.id}`));
      },
    },
  );
  return (
    <PageContainer width="form">
      <PageHeader title={t('transfers.new')} breadcrumbs={[{ label: t('nav.items.transfers'), to: '/transfers' }]} />
      <FormCard>
        <TransferForm
          worker={worker}
          onWorkerChange={setWorker}
          submitLabel={t('transfers.submit')}
          withDecisionFile
          onSubmit={(body, decisionFile) => submit.mutateAsync({ body, decisionFile })}
          onCancel={() => navigate(back ?? '/transfers')}
          guardUnsaved
        />
      </FormCard>
    </PageContainer>
  );
}
