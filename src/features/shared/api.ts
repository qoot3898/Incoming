import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api/client';
import type { S } from '@/types/api';

export const sharedApi = {
  formOptions: () => api.get<S<'LaborFormOptions'>>('/forms/options'),
  printForm: (code: NonNullable<S<'LaborFormCode'>>, recordId?: number) =>
    api.blob('get', `/forms/${code}/print`, undefined, { recordId }),
  openAttachment: (attachmentId: number) => api.blob('get', `/attachments/${attachmentId}`),
};

/** Shared lists (tracks, sites, jobs, nationalities, managements) limited to the user's scope. */
export function useFormOptions() {
  return useQuery({ queryKey: ['shared', 'formOptions'], queryFn: sharedApi.formOptions, staleTime: 10 * 60_000 });
}
