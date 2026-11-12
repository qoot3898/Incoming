import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminKeys, laborSettingsApi } from '../api';
import { CAPACITY_MAX, CAPACITY_MIN, capacityProblem } from './capacity';
import { FormDialog } from '@/components/forms/FormDialog';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useSnackbar } from '@/app/providers/snackbarContext';
import { API_ERROR_CODES, isApiError } from '@/services/api/errors';
import type { TransferOptions } from '@/services/api/client';
import type { S } from '@/types/api';

type Site = S<'SiteCapacityItem'>;
type Values = { capacity: number | null; file: File | null };

/**
 * Changes a site's capacity (TL-N7): an optional whole number from 0 to 10000 (empty = no limit) and an
 * optional PDF of the decision. The site's `rowVersion` rides along, so a change made meanwhile is refused
 * with `CONCURRENCY_CONFLICT`; the list is then reloaded and the dialog closes.
 */
export function ChangeCapacityDialog({ site, onClose }: { site: Site; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { notify } = useSnackbar();
  const change = useApiMutation((vars: { values: Values; transfer: TransferOptions }) => laborSettingsApi.changeSiteCapacity(site.workSiteId, { ...vars.values, rowVersion: site.rowVersion }, vars.transfer), {
    invalidate: [adminKeys.siteCapacities],
    rethrow: true,
    success: t('capacity.saved'),
  });

  const submit = async (values: Values, transfer: TransferOptions) => {
    try {
      await change.mutateAsync({ values, transfer });
    } catch (e) {
      if (!(isApiError(e) && e.code === API_ERROR_CODES.concurrencyConflict)) throw e;
      // Someone changed the site after this list was read: show the new state instead of overwriting it.
      notify(t('capacity.conflict'), 'warning');
      await qc.invalidateQueries({ queryKey: adminKeys.siteCapacities });
    }
  };

  return (
    <FormDialog<Values>
      open
      onClose={onClose}
      title={t('capacity.changeFor', { site: `${site.number} — ${site.name ?? ''}` })}
      description={t('capacity.changeHint', { occupancy: site.occupancy })}
      fields={[
        {
          name: 'capacity',
          kind: 'number',
          label: t('capacity.capacity'),
          min: CAPACITY_MIN,
          max: CAPACITY_MAX,
          step: 1,
          helperText: t('capacity.capacityHint', { min: CAPACITY_MIN, max: CAPACITY_MAX }),
        },
        { name: 'file', kind: 'file', label: t('capacity.decisionFile'), accept: 'application/pdf', helperText: t('capacity.decisionFileHint') },
      ]}
      defaultValues={{ capacity: site.capacity }}
      validate={(v) => {
        const problem = capacityProblem(v.capacity, site.capacity);
        return problem ? { capacity: t(`capacity.problems.${problem}`) } : null;
      }}
      submitLabel={t('capacity.change')}
      onSubmit={submit}
    />
  );
}
