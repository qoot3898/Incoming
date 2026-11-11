import { api, type TransferOptions } from '@/services/api/client';
import type { S } from '@/types/api';

export type CandidateScanKind = NonNullable<S<'CandidateDocumentKind'>>;

export const registrationKeys = {
  all: ['registration'] as const,
  queue: ['registration', 'queue'] as const,
  options: ['registration', 'options'] as const,
};

export const registrationApi = {
  queue: () => api.get<S<'RegistrationQueueItem'>[]>('/registration/queue'),
  options: () => api.get<S<'RegistrationOptions'>>('/registration/options'),
  register: (body: S<'RegisterWorkersRequest'>) => api.post<S<'RegisteredWorker'>[]>('/registration/workers', body),
  /** TL-N2 (2026-11-09): scans go on the approved candidate before registration; a second one of the same kind replaces it. */
  attachScan: (candidateId: number, kind: CandidateScanKind, scan: File, transfer?: TransferOptions) =>
    api.postForm(`/candidates/${candidateId}/documents`, { kind, scan }, transfer),
  openScan: (candidateId: number, kind: CandidateScanKind) => api.blob('get', `/candidates/${candidateId}/documents/${kind}`),
  removeScan: (candidateId: number, kind: CandidateScanKind) => api.delete(`/candidates/${candidateId}/documents/${kind}`),
};
