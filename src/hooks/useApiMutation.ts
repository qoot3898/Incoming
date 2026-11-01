import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from '@/app/providers/snackbarContext';
import { errorMessage, toApiError, type ApiError } from '@/services/api/errors';

interface Options<TData> {
  /** Query keys to invalidate after success. */
  invalidate?: QueryKey[];
  /** Success toast (translation already applied). Pass `false` to suppress. */
  success?: string | false;
  onSuccess?: (data: TData) => void;
  /** When true, errors are rethrown as ApiError for the caller (forms) instead of a toast. */
  rethrow?: boolean;
}

/** Wraps a mutation with standard invalidation, toasts and ProblemDetails normalisation. */
export function useApiMutation<TVars, TData = unknown>(fn: (vars: TVars) => Promise<TData>, options: Options<TData> = {}) {
  const qc = useQueryClient();
  const { notify } = useSnackbar();
  const { t } = useTranslation();
  return useMutation<TData, ApiError, TVars>({
    mutationFn: async (vars) => {
      try {
        return await fn(vars);
      } catch (e) {
        throw await toApiError(e, t('errors.generic'));
      }
    },
    onSuccess: async (data) => {
      await Promise.all((options.invalidate ?? []).map((queryKey) => qc.invalidateQueries({ queryKey })));
      if (options.success !== false) notify(options.success ?? t('common.saved'), 'success');
      options.onSuccess?.(data);
    },
    onError: (err) => {
      if (!options.rethrow) notify(errorMessage(err), 'error');
    },
  });
}
