import { api, publicHttp } from '@/services/api/client';
import type { Q, S } from '@/types/api';

export const complaintsKeys = {
  all: ['complaints'] as const,
  list: (p: object) => ['complaints', 'list', p] as const,
  detail: (id: number) => ['complaints', 'detail', id] as const,
};

/** Follow-up of complaints (TL-N1), permission `TemporaryLabor.ManageComplaints`. */
export const complaintsApi = {
  list: (q: Q<'ListComplaints'>, signal?: AbortSignal) => api.get<S<'ComplaintList'>>('/complaints', q, { signal }),
  get: (id: number) => api.get<S<'ComplaintDetails'>>(`/complaints/${id}`),
  /** One review per complaint; a second one is refused (422). */
  review: (id: number, body: S<'ReviewComplaintRequest'>) => api.post(`/complaints/${id}/review`, body),
};

/** The public complaint form: the API's only anonymous write (no Authorization header). */
export const publicComplaintsApi = {
  submit: (body: S<'SubmitComplaintRequest'>) => publicHttp.post<S<'IdResponse'>>('/public/complaints', body).then((r) => r.data),
};
