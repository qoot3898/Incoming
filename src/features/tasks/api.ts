import { api } from '@/services/api/client';
import type { S } from '@/types/api';

export const tasksKeys = { all: ['tasks'] as const };

export const tasksApi = {
  get: () => api.get<S<'LaborTasks'>>('/inbox/tasks'),
  markRead: (id: number) => api.post(`/inbox/notifications/${id}/read`),
};
