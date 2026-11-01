import { api } from '@/services/api/client';
import type { S } from '@/types/api';

export const reportsApi = {
  options: () => api.get<S<'LaborReportOptions'>>('/reports/options'),
  run: (criteria: S<'LaborReportCriteria'>) => api.post<S<'LaborReportTable'>>('/reports/run', criteria),
  export: (body: S<'ExportLaborReportRequest'>) => api.blob('post', '/reports/export', body),
};
