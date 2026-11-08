import { api, type TransferOptions } from '@/services/api/client';
import type { Q, S } from '@/types/api';

export const penaltiesKeys = {
  all: ['penalties'] as const,
  list: (p: object) => ['penalties', 'list', p] as const,
  detail: (id: number) => ['penalties', 'detail', id] as const,
};

export const penaltiesApi = {
  list: (q: Q<'ListPenalties'>, signal?: AbortSignal) => api.get<S<'PenaltyList'>>('/penalties', q, { signal }),
  get: (id: number) => api.get<S<'PenaltyDetails'>>(`/penalties/${id}`),
  incidentDraft: (incidentId: number) => api.get<S<'PenaltyIncidentDraft'>>(`/penalties/incident-drafts/${incidentId}`),
  propose: (body: S<'PenaltyProposalInput'>) => api.post<S<'IdResponse'>>('/penalties', body),
  decide: (id: number, body: S<'PenaltyDecisionInput'>) => api.post(`/penalties/${id}/decision`, body),
  dismiss: (id: number, body: S<'DismissPenaltyRequest'>) => api.post(`/penalties/${id}/dismiss`, body),
  acknowledge: (id: number, values: Record<string, unknown>, transfer?: TransferOptions) => api.postForm(`/penalties/${id}/acknowledgement`, values, transfer),
  apply: (id: number, body: S<'ApplyPenaltyRequest'>) => api.post(`/penalties/${id}/apply`, body),
};
