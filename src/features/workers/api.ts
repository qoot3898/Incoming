import { api, type TransferOptions } from '@/services/api/client';
import type { Paged, Q, S } from '@/types/api';

export const workersKeys = {
  all: ['workers'] as const,
  list: (p: object) => ['workers', 'list', p] as const,
  detail: (id: number) => ['workers', 'detail', id] as const,
  attachments: (id: number) => ['workers', 'attachments', id] as const,
};

export const workersApi = {
  search: (q: Q<'SearchLaborWorkers'>, signal?: AbortSignal) => api.get<Paged<S<'LaborWorkerListItem'>>>('/workers', q, { signal }),
  get: (employeeId: number) => api.get<S<'LaborWorkerDetails'>>(`/workers/${employeeId}`),
  byNumber: (employeeNumber: number) => api.get<S<'LaborWorkerSummary'>>(`/workers/by-number/${employeeNumber}`),
  updateIdentity: (employeeId: number, body: S<'UpdateEmployeeIdentityRequest'>) => api.put(`/employees/${employeeId}/identity`, body),
  attachments: (employeeId: number) => api.get<S<'WorkerAttachmentItem'>[]>(`/workers/${employeeId}/attachments`),
  /** TL-N14: receives (or renews) the worker's health certificate as a new document; `scan` is optional. */
  renewHealthCertificate: (employeeId: number, values: Record<string, unknown>, transfer?: TransferOptions) =>
    api.postForm(`/workers/${employeeId}/health-certificates`, values, transfer),
  attachForm: (employeeId: number, values: { kind: string; recordReference?: string | null; scan: File | null }, transfer?: TransferOptions) =>
    api.postForm<S<'IdResponse'>>(`/workers/${employeeId}/attachments`, values, transfer),
};
