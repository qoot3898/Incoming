import { api } from '@/services/api/client';
import type { Paged, Q, S } from '@/types/api';

export const staffingKeys = {
  all: ['staffing'] as const,
  list: (p: object) => ['staffing', 'list', p] as const,
  detail: (n: number) => ['staffing', 'detail', n] as const,
  candidates: (n: number) => ['staffing', 'candidates', n] as const,
};

export const staffingApi = {
  list: (q: Q<'ListStaffingRequests'>, signal?: AbortSignal) => api.get<Paged<S<'StaffingRequestListItem'>>>('/staffing-requests', q, { signal }),
  get: (number: number) => api.get<S<'StaffingRequestDetails'>>(`/staffing-requests/${number}`),
  submit: (body: S<'StaffingRequestRequest'>) => api.post<S<'IdResponse'>>('/staffing-requests', body),
  decide: (number: number, body: S<'StaffingRequestDecision'>) => api.post(`/staffing-requests/${number}/decision`, body),
  close: (number: number, body: S<'CloseStaffingRequestRequest'>) => api.post(`/staffing-requests/${number}/close`, body),
};

export const candidatesKeys = {
  all: ['candidates'] as const,
  list: (p: object) => ['candidates', 'list', p] as const,
  detail: (id: number) => ['candidates', 'detail', id] as const,
  /** Candidates of the list that can be nominated (`PoolStatus=Available`), searched by the picker. */
  picker: (p: object) => ['candidates', 'picker', p] as const,
};

export const candidatesApi = {
  list: (q: Q<'ListCandidates'>, signal?: AbortSignal) => api.get<Paged<S<'CandidateListItem'>>>('/candidates', q, { signal }),
  /** The candidate card: data, documents and his nominations on requests within the user's scope (TL-N13). */
  get: (id: number) => api.get<S<'CandidateDetails'>>(`/candidates/${id}`),
  forRequest: (requestNumber: number) => api.get<S<'RequestCandidates'>>(`/staffing-requests/${requestNumber}/candidates`),
  /** Adds a person to the candidate list; `requestNumber` also nominates him on that request in the same step. */
  add: (body: S<'AddCandidateRequest'>) => api.post<S<'IdResponse'>>('/candidates', body),
  /** Corrects his data; the card's `rowVersion` rides along (409 `CONCURRENCY_CONFLICT` when it moved on). */
  update: (id: number, body: S<'UpdateCandidateRequest'>) => api.put(`/candidates/${id}`, body),
  /** Takes him out of the list (reason required); refused while he is nominated; deletes both of his scans. */
  withdraw: (id: number, body: S<'WithdrawCandidateRequest'>) => api.post(`/candidates/${id}/withdraw`, body),
  restore: (id: number) => api.post(`/candidates/${id}/restore`),
  /** Nominates available candidates of the list on a request (one running nomination per candidate). */
  nominate: (requestNumber: number, body: S<'NominateCandidatesRequest'>) => api.post(`/staffing-requests/${requestNumber}/candidates`, body),
  interview: (id: number, body: S<'InterviewCandidateRequest'>) => api.post(`/candidates/${id}/interview`, body),
  decide: (body: S<'DecideCandidatesRequest'>) => api.post('/candidates/decisions', body),
  /** Cancels his running nomination; he goes back to the list with his data and scans (TL-N13). */
  cancel: (id: number, body: S<'CancelCandidateRequest'>) => api.post(`/candidates/${id}/cancel`, body),
};
