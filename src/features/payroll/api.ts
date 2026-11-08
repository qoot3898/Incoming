import { api } from '@/services/api/client';
import type { Paged, Q, S } from '@/types/api';

export const payrollKeys = { all: ['payroll'] as const, list: (p: object) => ['payroll', 'list', p] as const };

export const payrollApi = {
  list: (q: Q<'ListPayrollNotices'>, signal?: AbortSignal) => api.get<Paged<S<'PayrollNoticeListItem'>>>('/payroll-notices', q, { signal }),
  recordDelivery: (noticeId: number, body: S<'RecordNoticeDeliveryRequest'>) => api.post(`/payroll-notices/${noticeId}/delivery`, body),
  confirm: (noticeId: number) => api.post(`/payroll-notices/${noticeId}/confirm`),
};
