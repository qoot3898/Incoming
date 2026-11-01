import { api } from '@/services/api/client';
import type { Paged, Q, S } from '@/types/api';

export const evaluationsKeys = { all: ['evaluations'] as const, detail: (id: number) => ['evaluations', 'detail', id] as const };

export const evaluationsApi = {
  list: (q: Q<'ListEvaluations'>) => api.get<Paged<S<'EvaluationListItem'>>>('/evaluations', q),
  due: (q: Q<'ListDueEvaluations'>) => api.get<Paged<S<'EvaluationDueItem'>>>('/evaluations/due', q),
  get: (id: number) => api.get<S<'EvaluationDetails'>>(`/evaluations/${id}`),
  worker: (employeeId: number) => api.get<S<'EvaluationWorker'>>(`/workers/${employeeId}/evaluation-worker`),
  record: (body: S<'EvaluationInput'>) => api.post<S<'IdResponse'>>('/evaluations', body),
  review: (id: number, body: S<'EvaluationReviewInput'>) => api.post<number>(`/evaluations/${id}/review`, body),
};
