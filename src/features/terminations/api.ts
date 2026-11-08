import { api, type TransferOptions } from '@/services/api/client';
import type { Q, S } from '@/types/api';

export const terminationsKeys = {
  all: ['terminations'] as const,
  list: (p: object) => ['terminations', 'list', p] as const,
  detail: (id: number) => ['terminations', 'detail', id] as const,
};

export const terminationsApi = {
  list: (q: Q<'ListTerminations'>, signal?: AbortSignal) => api.get<S<'TerminationList'>>('/terminations', q, { signal }),
  get: (id: number) => api.get<S<'TerminationDetails'>>(`/terminations/${id}`),
  sources: (employeeId: number) => api.get<S<'TerminationSources'>>(`/workers/${employeeId}/termination-sources`),
  submit: (body: S<'TerminationRequestInput'>) => api.post<S<'IdResponse'>>('/terminations', body),
  decide: (id: number, body: S<'DecideTerminationRequest'>) => api.post(`/terminations/${id}/decision`, body),
  cancel: (id: number, body: S<'CancelTerminationRequest'>) => api.post(`/terminations/${id}/cancel`, body),
  execute: (id: number, body: S<'TerminationExecutionInput'>) => api.post<number>(`/terminations/${id}/execute`, body),
  addClearanceItem: (id: number, body: S<'AddClearanceItemRequest'>) => api.post(`/terminations/${id}/clearance-items`, body),
  recordClearance: (id: number, itemId: number, body: S<'RecordClearanceRequest'>) => api.put(`/terminations/${id}/clearance-items/${itemId}`, body),
  recordSettlement: (id: number, body: S<'TerminationSettlementInput'>) => api.post(`/terminations/${id}/settlement`, body),
  approveSettlement: (id: number, body: S<'ApproveSettlementRequest'>) => api.post(`/terminations/${id}/settlement/approval`, body),
  handPassport: (id: number, values: Record<string, unknown>, transfer?: TransferOptions) => api.postForm(`/terminations/${id}/passport-handover`, values, transfer),
  decideReplacement: (id: number, body: S<'DecideReplacementRequest'>) => api.post(`/terminations/${id}/replacement-decision`, body),
  prepareReplacement: (id: number, body: S<'PrepareReplacementRequestRequest'>) => api.post<S<'IdResponse'>>(`/terminations/${id}/replacement-request`, body),
  close: (id: number, body: S<'CloseTerminationRequest'>) => api.post(`/terminations/${id}/close`, body),
};
