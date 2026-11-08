import { api } from '@/services/api/client';
import type { Paged, Q, S } from '@/types/api';

export const evaluationsKeys = {
  all: ['evaluations'] as const,
  list: (p: object) => ['evaluations', 'list', p] as const,
  due: (p: object) => ['evaluations', 'due', p] as const,
  detail: (id: number) => ['evaluations', 'detail', id] as const,
};

export const evaluationsApi = {
  list: (q: Q<'ListEvaluations'>, signal?: AbortSignal) => api.get<Paged<S<'EvaluationListItem'>>>('/evaluations', q, { signal }),
  due: (q: Q<'ListDueEvaluations'>, signal?: AbortSignal) => api.get<Paged<S<'EvaluationDueItem'>>>('/evaluations/due', q, { signal }),
  get: (id: number) => api.get<S<'EvaluationDetails'>>(`/evaluations/${id}`),
  worker: (employeeId: number) => api.get<S<'EvaluationWorker'>>(`/workers/${employeeId}/evaluation-worker`),
  record: (body: S<'EvaluationInput'>) => api.post<S<'IdResponse'>>('/evaluations', body),
  review: (id: number, body: S<'EvaluationReviewInput'>) => api.post<number>(`/evaluations/${id}/review`, body),
};
