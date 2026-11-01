import { api } from '@/services/api/client';
import type { Q, S } from '@/types/api';

export const leavesKeys = {
  all: ['leaves'] as const,
  detail: (id: number) => ['leaves', 'detail', id] as const,
  history: (employeeId: number) => ['leaves', 'history', employeeId] as const,
};

export const leavesApi = {
  list: (q: Q<'ListLeaves'>) => api.get<S<'LeaveList'>>('/leaves', q),
  get: (id: number) => api.get<S<'LeaveDetails'>>(`/leaves/${id}`),
  history: (employeeId: number) => api.get<S<'LeaveHistory'>>(`/workers/${employeeId}/leaves`),
  submit: (employeeId: number, body: S<'LeaveRequest'>) => api.post<S<'IdResponse'>>(`/workers/${employeeId}/leaves`, body),
  resubmit: (id: number, body: S<'LeaveRequest'>) => api.put(`/leaves/${id}`, body),
  decide: (id: number, body: S<'LeaveDecisionInput'>) => api.post(`/leaves/${id}/decision`, body),
  cancel: (id: number, body: S<'CancelLeaveRequest'>) => api.post(`/leaves/${id}/cancel`, body),
  confirmReturn: (id: number, body: S<'ConfirmLeaveReturnRequest'>) => api.post(`/leaves/${id}/confirm-return`, body),
  handPassport: (id: number, body: S<'HandPassportForTravelRequest'>) => api.post(`/leaves/${id}/passport/hand-over`, body),
  returnPassport: (id: number, body: S<'ReturnPassportFromTravelRequest'>) => api.post(`/leaves/${id}/passport/return`, body),
};
