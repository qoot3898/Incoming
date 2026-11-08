import { api } from '@/services/api/client';
import type { Paged, Q, S } from '@/types/api';

export const transfersKeys = {
  all: ['transfers'] as const,
  list: (p: object) => ['transfers', 'list', p] as const,
  detail: (id: number) => ['transfers', 'detail', id] as const,
};

export const transfersApi = {
  list: (q: Q<'ListTransfers'>, signal?: AbortSignal) => api.get<Paged<S<'TransferListItem'>>>('/transfers', q, { signal }),
  get: (id: number) => api.get<S<'TransferDetails'>>(`/transfers/${id}`),
  options: (employeeId: number, transferId?: number) => api.get<S<'TransferOptions'>>(`/workers/${employeeId}/transfer-options`, { transferId }),
  submit: (body: S<'TransferRequestInput'>) => api.post<S<'IdResponse'>>('/transfers', body),
  resubmit: (id: number, body: S<'TransferRequestInput'>) => api.put(`/transfers/${id}`, body),
  decide: (id: number, body: S<'TransferDecisionInput'>) => api.post(`/transfers/${id}/decision`, body),
  cancel: (id: number, body: S<'CancelTransferRequest'>) => api.post(`/transfers/${id}/cancel`, body),
  execute: (id: number, body: S<'TransferExecutionInput'>) => api.post<number>(`/transfers/${id}/execute`, body),
  supervisorsInformed: (id: number, body: S<'RecordSupervisorsInformedRequest'>) => api.post(`/transfers/${id}/supervisors-informed`, body),
};
