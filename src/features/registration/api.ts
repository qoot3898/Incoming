import { api } from '@/services/api/client';
import type { S } from '@/types/api';

export const registrationKeys = { all: ['registration'] as const };

export const registrationApi = {
  queue: () => api.get<S<'RegistrationQueueItem'>[]>('/registration/queue'),
  options: () => api.get<S<'RegistrationOptions'>>('/registration/options'),
  register: (body: S<'RegisterWorkersRequest'>) => api.post<S<'RegisteredWorker'>[]>('/registration/workers', body),
};
