import { api } from '@/services/api/client';
import type { Paged, Q, S } from '@/types/api';

export const staffingKeys = {
  all: ['staffing'] as const,
  list: (p: object) => ['staffing', 'list', p] as const,
  detail: (n: number) => ['staffing', 'detail', n] as const,
  candidates: (n: number) => ['staffing', 'candidates', n] as const,
};

export const staffingApi = {
  list: (q: Q<'ListStaffingRequests'>) => api.get<Paged<S<'StaffingRequestListItem'>>>('/staffing-requests', q),
  get: (number: number) => api.get<S<'StaffingRequestDetails'>>(`/staffing-requests/${number}`),
  submit: (body: S<'StaffingRequestRequest'>) => api.post<S<'IdResponse'>>('/staffing-requests', body),
  decide: (number: number, body: S<'StaffingRequestDecision'>) => api.post(`/staffing-requests/${number}/decision`, body),
  close: (number: number, body: S<'CloseStaffingRequestRequest'>) => api.post(`/staffing-requests/${number}/close`, body),
};

export const candidatesKeys = { all: ['candidates'] as const, list: (p: object) => ['candidates', 'list', p] as const };

export const candidatesApi = {
  list: (q: Q<'ListCandidates'>) => api.get<Paged<S<'CandidateListItem'>>>('/candidates', q),
  forRequest: (requestNumber: number) => api.get<S<'RequestCandidates'>>(`/staffing-requests/${requestNumber}/candidates`),
  add: (body: S<'AddCandidateRequest'>) => api.post<S<'IdResponse'>>('/candidates', body),
  interview: (id: number, body: S<'InterviewCandidateRequest'>) => api.post(`/candidates/${id}/interview`, body),
  decide: (body: S<'DecideCandidatesRequest'>) => api.post('/candidates/decisions', body),
  cancel: (id: number, body: S<'CancelCandidateRequest'>) => api.post(`/candidates/${id}/cancel`, body),
};
