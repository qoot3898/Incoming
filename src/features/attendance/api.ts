import { api } from '@/services/api/client';
import type { Paged, Q, S } from '@/types/api';

export const attendanceKeys = {
  all: ['attendance'] as const,
  sheet: (id: number) => ['attendance', 'sheet', id] as const,
};

export const attendanceApi = {
  sheets: (q: Q<'ListAttendanceSheets'>) => api.get<Paged<S<'AttendanceSheetListItem'>>>('/attendance/sheets', q),
  sheet: (id: number) => api.get<S<'AttendanceSheetDetails'>>(`/attendance/sheets/${id}`),
  open: (body: S<'OpenAttendanceSheetRequest'>) => api.post<S<'IdResponse'>>('/attendance/sheets', body),
  record: (id: number, body: S<'RecordAttendanceRequest'>) => api.put<S<'AttendanceSaveResult'>>(`/attendance/sheets/${id}/entries`, body),
  submit: (id: number, body: S<'SubmitAttendanceSheetRequest'>) => api.post(`/attendance/sheets/${id}/submit`, body),
  review: (id: number) => api.post(`/attendance/sheets/${id}/review`),
  receive: (id: number) => api.post(`/attendance/sheets/${id}/receive`),
  deviceDifferences: (id: number) => api.get<S<'DeviceDifference'>[]>(`/attendance/sheets/${id}/device-differences`),
  incidents: (q: Q<'ListAbsenceIncidents'>) => api.get<Paged<S<'AbsenceIncidentListItem'>>>('/attendance/absence-incidents', q),
  excuse: (incidentId: number, body: S<'ExcuseAbsenceIncidentRequest'>) => api.post<number>(`/attendance/absence-incidents/${incidentId}/excuse`, body),
  importDeviceRecords: (body: S<'ImportDeviceRecordsRequest'>) => api.post<S<'DeviceImportReport'>>('/attendance/device-records', body),
};
