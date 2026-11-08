import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyServerErrors, isApiError, toApiError, type ApiError } from '@/services/api/errors';

export interface FormServerError {
  error: ApiError;
  /** Field messages that matched no visible field. */
  unmatched: string[];
}

/**
 * Standard handling of a failed form submission: server field errors go to their fields
 * (`setFieldError`), the rest is kept for `<FormErrorAlert>`. Entered values are never reset.
 * `fieldMap` renames API fields to form fields (e.g. `employeeId` → `worker`).
 */
export function useFormServerError(setFieldError: (field: string, message: string) => void, fields: readonly string[], fieldMap?: Record<string, string>) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<FormServerError | null>(null);

  // Only called from submit handlers, so a fresh closure per render is fine (no memo needed).
  const handleServerError = async (e: unknown) => {
    const error = isApiError(e) ? e : await toApiError(e, t('errors.generic'));
    const unmatched = error.cancelled ? [] : applyServerErrors(error, setFieldError, fields, fieldMap);
    setServerError({ error, unmatched });
  };
  const clearServerError = () => setServerError(null);
  return { serverError, handleServerError, clearServerError };
}
