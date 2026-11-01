import type { S } from '@/types/api';

type Kind = S<'LaborActionKind'>;

/** Frontend list route for each task kind (used when the backend link is not a usable path). */
export const ACTION_ROUTES: Record<Kind, string> = {
  Interview: '/candidates?Status=Interview',
  CandidateApproval: '/candidates?Status=PendingGeneralManager',
  StartApproval: '/onboarding?Stage=PendingApproval',
  SalaryApproval: '/onboarding?Stage=Collecting',
  Registration: '/registration',
  EntryPermit: '/entry-permits',
  StartRecord: '/onboarding?Stage=Reported',
  StartCorrection: '/onboarding?Stage=Collecting',
  SalaryCorrection: '/onboarding?Stage=Collecting',
  NoticeDelivery: '/payroll-notices?Status=AwaitingDelivery',
  DocumentsOverdue: '/onboarding?Stage=DocumentsOverdue',
  DocumentsDueSoon: '/onboarding?Stage=DocumentsDueSoon',
  NoticeConfirmation: '/payroll-notices?Status=Delivered',
  AttendanceSubmission: '/attendance',
  AttendanceReview: '/attendance?Status=Submitted',
  AttendanceReceipt: '/attendance?Status=AwaitingReceipt',
  AbsenceIncident: '/attendance/incidents',
  LeaveApproval: '/leaves?Tab=Pending',
  LeaveCorrection: '/leaves?Tab=Returned',
  LeaveReturn: '/leaves?LateReturn=true',
  TransferApproval: '/transfers?Status=PendingApprovals',
  TransferCorrection: '/transfers?Status=Returned',
  TransferExecution: '/transfers?Status=Approved',
  EvaluationDue: '/evaluations?Tab=Due',
  EvaluationReview: '/evaluations?Tab=PendingReview',
  PenaltyDecision: '/penalties?Status=PendingDecision',
  PenaltyAcknowledgement: '/penalties?Status=Decided',
  PenaltyApplication: '/penalties?Status=Acknowledged',
  TerminationApproval: '/terminations?Stage=PendingOperations',
  TerminationExecution: '/terminations?Stage=Approved',
  TerminationClosing: '/terminations?Stage=Clearance',
  Settlement: '/terminations?Stage=Clearance',
};

const KNOWN = [
  /^\/workers\/\d+(\/onboarding)?$/,
  /^\/(leaves|transfers|penalties|terminations|evaluations|staffing-requests)\/\d+$/,
  /^\/attendance\/sheets\/\d+$/,
];

/** Backend links are followed only when they match a route of this application (format unspecified, U-03). */
export function resolveLink(link?: string | null): string | null {
  if (!link) return null;
  const path = link.split('?')[0];
  return KNOWN.some((r) => r.test(path)) ? link : null;
}
