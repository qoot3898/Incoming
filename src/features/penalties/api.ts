import { api } from '@/services/api/client';
import type { Q, S } from '@/types/api';

export const penaltiesKeys = { all: ['penalties'] as const, detail: (id: number) => ['penalties', 'detail', id] as const };

export const penaltiesApi = {
  list: (q: Q<'ListPenalties'>) => api.get<S<'PenaltyList'>>('/penalties', q),
  get: (id: number) => api.get<S<'PenaltyDetails'>>(`/penalties/${id}`),
  incidentDraft: (incidentId: number) => api.get<S<'PenaltyIncidentDraft'>>(`/penalties/incident-drafts/${incidentId}`),
  propose: (body: S<'PenaltyProposalInput'>) => api.post<S<'IdResponse'>>('/penalties', body),
  decide: (id: number, body: S<'PenaltyDecisionInput'>) => api.post(`/penalties/${id}/decision`, body),
  dismiss: (id: number, body: S<'DismissPenaltyRequest'>) => api.post(`/penalties/${id}/dismiss`, body),
  acknowledge: (id: number, values: Record<string, unknown>) => api.postForm(`/penalties/${id}/acknowledgement`, values),
  apply: (id: number, body: S<'ApplyPenaltyRequest'>) => api.post(`/penalties/${id}/apply`, body),
};
