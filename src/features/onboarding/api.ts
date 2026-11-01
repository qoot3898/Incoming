import { api } from '@/services/api/client';
import type { Paged, Q, S } from '@/types/api';

export const onboardingKeys = {
  all: ['onboarding'] as const,
  record: (id: number) => ['onboarding', 'record', id] as const,
};

type Multipart = Record<string, unknown>;

export const onboardingApi = {
  list: (q: Q<'ListOnboarding'>) => api.get<Paged<S<'OnboardingListItem'>>>('/onboarding', q),
  record: (id: number) => api.get<S<'OnboardingRecord'>>(`/workers/${id}/onboarding`),
  reportStart: (id: number, body: S<'ReportStartRequest'>) => api.post(`/workers/${id}/onboarding/start-report`, body),
  withdrawStartReport: (id: number) => api.delete(`/workers/${id}/onboarding/start-report`),
  open: (id: number, body: S<'OpenOnboardingRequest'>) => api.post(`/workers/${id}/onboarding/open`, body),
  correctStartDate: (id: number, body: S<'CorrectStartDateRequest'>) => api.put(`/workers/${id}/onboarding/start-date`, body),
  closeNotStarted: (id: number, body: S<'CloseNotStartedRequest'>) => api.post(`/workers/${id}/onboarding/close-not-started`, body),
  receiveDocument: (id: number, values: Multipart) => api.postForm(`/workers/${id}/documents`, values),
  removeDocument: (documentId: number) => api.delete(`/documents/${documentId}`),
  receivePassport: (id: number, values: Multipart) => api.postForm(`/workers/${id}/passport`, values),
  relocatePassport: (id: number, body: S<'RelocatePassportRequest'>) => api.put(`/workers/${id}/passport/location`, body),
  setSurveyApplicability: (id: number, body: S<'SetSurveyApplicabilityRequest'>) => api.put(`/workers/${id}/survey/applicability`, body),
  survey: (id: number) => api.get<S<'OnboardingSurveyDetails'>>(`/workers/${id}/survey`),
  reviewSurvey: (id: number, values: Multipart) => api.postForm(`/workers/${id}/survey/review`, values),
  // salary
  salary: (id: number) => api.get<S<'OnboardingSalaryDetails'>>(`/workers/${id}/onboarding-salary`),
  proposeSalary: (id: number, body: S<'ProposeSalaryRequest'>) => api.post<S<'IdResponse'>>(`/workers/${id}/salaries`, body),
  reviseSalary: (salaryId: number, body: S<'ReviseSalaryRequest'>) => api.put(`/salaries/${salaryId}`, body),
  decideSalary: (salaryId: number, body: S<'DecideSalaryRequest'>) => api.post(`/salaries/${salaryId}/decision`, body),
  cancelSalary: (salaryId: number) => api.post(`/salaries/${salaryId}/cancel`),
  // start approval
  startApproval: (id: number) => api.get<S<'StartApprovalDetails'>>(`/workers/${id}/start-approval`),
  submitStart: (id: number) => api.post(`/workers/${id}/start-approval/submit`),
  decideStart: (id: number, body: S<'DecideStartRequest'>) => api.post(`/workers/${id}/start-approval/decision`, body),
  // notice
  onboardingNotice: (id: number) => api.get<S<'OnboardingNoticeDetails'>>(`/workers/${id}/onboarding-notice`),
  // suspension
  suspensionSources: (id: number) => api.get<S<'SuspensionSources'>>(`/workers/${id}/suspension-sources`),
  suspend: (body: S<'SuspensionInput'>) => api.post<S<'IdResponse'>>('/suspensions', body),
};
