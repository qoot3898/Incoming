import { api } from '@/services/api/client';
import type { Paged, Q, S } from '@/types/api';

export const permitsKeys = { all: ['permits'] as const };

export const permitsApi = {
  list: (q: Q<'ListEntryPermits'>) => api.get<Paged<S<'EntryPermitListItem'>>>('/entry-permits', q),
  distributionQueue: () => api.get<S<'DistributionQueue'>>('/entry-permits/distribution-queue'),
  distributionSites: (employeeId: number) => api.get<S<'DistributionSites'>>(`/workers/${employeeId}/distribution-sites`),
  issue: (employeeId: number, body: S<'IssueEntryPermitRequest'>) => api.post<S<'IdResponse'>>(`/workers/${employeeId}/entry-permits`, body),
  issueCurrentWorkers: () => api.post<number>('/entry-permits/issue-current-workers'),
  cancel: (permitId: number, body: S<'CancelEntryPermitRequest'>) => api.post(`/entry-permits/${permitId}/cancel`, body),
  print: (permitIds: number[]) => api.blob('post', '/entry-permits/print', { permitIds } satisfies S<'PrintEntryPermitsRequest'>),
  printByNumber: (number: number) => api.blob('get', `/entry-permits/by-number/${number}/print`),
};
