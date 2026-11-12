import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth, RequirePermission } from './guards';
import { ACTION_PERMISSIONS as A, NAV_PERMISSIONS, PERMISSIONS } from '@/constants/permissions';
import { RouteError } from './RouteError';
import { lazyPage as L } from './lazyPage';

export const router = createBrowserRouter([
  { path: '/login', element: L(() => import('@/features/authentication/LoginPage')), errorElement: <RouteError /> },
  // Public complaint form (TL-N1): no sign-in.
  { path: '/complaint', element: L(() => import('@/features/complaints/PublicComplaintPage')), errorElement: <RouteError /> },
  // Password change: outside the app shell too, so no navigation is shown while it is forced (and never before the letter is approved).
  { path: '/change-password', element: <RequireAuth>{L(() => import('@/features/authentication/ChangePasswordPage'))}</RequireAuth>, errorElement: <RouteError /> },
  // Assignment-letter gate (TL-N3): signed in, outside the app shell (no navigation until approved).
  { path: '/assignment', element: <RequireAuth>{L(() => import('@/features/authentication/AssignmentPage'))}</RequireAuth>, errorElement: <RouteError /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: L(() => import('@/features/tasks/TasksPage')) },
      { path: 'workers', element: L(() => import('@/features/workers/WorkersListPage')) },
      { path: 'workers/:employeeId', element: L(() => import('@/features/workers/WorkerProfilePage')) },
      { path: 'workers/:employeeId/onboarding', element: L(() => import('@/features/onboarding/OnboardingRecordPage')) },
      { path: 'staffing-requests', element: L(() => import('@/features/staffing/StaffingListPage')) },
      { path: 'staffing-requests/new', element: <RequirePermission codes={A.createStaffingRequest}>{L(() => import('@/features/staffing/StaffingCreatePage'))}</RequirePermission> },
      { path: 'staffing-requests/:number', element: L(() => import('@/features/staffing/StaffingDetailsPage')) },
      { path: 'candidates', element: L(() => import('@/features/candidates/CandidatesListPage')) },
      { path: 'candidates/:candidateId', element: L(() => import('@/features/candidates/CandidateDetailsPage')) },
      { path: 'registration', element: <RequirePermission codes={A.registerWorkers}>{L(() => import('@/features/registration/RegistrationPage'))}</RequirePermission> },
      { path: 'entry-permits', element: L(() => import('@/features/permits/EntryPermitsPage')) },
      { path: 'onboarding', element: L(() => import('@/features/onboarding/OnboardingListPage')) },
      { path: 'payroll-notices', element: L(() => import('@/features/payroll/PayrollNoticesPage')) },
      { path: 'attendance', element: L(() => import('@/features/attendance/AttendanceSheetsPage')) },
      { path: 'attendance/sheets/:sheetId', element: L(() => import('@/features/attendance/AttendanceSheetPage')) },
      { path: 'attendance/incidents', element: L(() => import('@/features/attendance/AbsenceIncidentsPage')) },
      { path: 'leaves', element: L(() => import('@/features/leaves/LeavesListPage')) },
      { path: 'leaves/new', element: <RequirePermission codes={A.createLeave}>{L(() => import('@/features/leaves/LeaveCreatePage'))}</RequirePermission> },
      { path: 'leaves/:leaveId', element: L(() => import('@/features/leaves/LeaveDetailsPage')) },
      { path: 'penalties', element: L(() => import('@/features/penalties/PenaltiesListPage')) },
      { path: 'penalties/new', element: <RequirePermission codes={A.createPenalty}>{L(() => import('@/features/penalties/PenaltyCreatePage'))}</RequirePermission> },
      { path: 'penalties/:penaltyId', element: L(() => import('@/features/penalties/PenaltyDetailsPage')) },
      { path: 'transfers', element: L(() => import('@/features/transfers/TransfersListPage')) },
      { path: 'transfers/new', element: <RequirePermission codes={A.createTransfer}>{L(() => import('@/features/transfers/TransferCreatePage'))}</RequirePermission> },
      { path: 'transfers/:transferId', element: L(() => import('@/features/transfers/TransferDetailsPage')) },
      { path: 'evaluations', element: L(() => import('@/features/evaluations/EvaluationsPage')) },
      { path: 'evaluations/new', element: <RequirePermission codes={A.createEvaluation}>{L(() => import('@/features/evaluations/EvaluationCreatePage'))}</RequirePermission> },
      { path: 'evaluations/:evaluationId', element: L(() => import('@/features/evaluations/EvaluationDetailsPage')) },
      { path: 'terminations', element: L(() => import('@/features/terminations/TerminationsListPage')) },
      { path: 'terminations/new', element: <RequirePermission codes={A.createTermination}>{L(() => import('@/features/terminations/TerminationCreatePage'))}</RequirePermission> },
      { path: 'terminations/:terminationId', element: L(() => import('@/features/terminations/TerminationDetailsPage')) },
      { path: 'complaints', element: L(() => import('@/features/complaints/ComplaintsListPage')) },
      { path: 'complaints/:complaintId', element: L(() => import('@/features/complaints/ComplaintDetailsPage')) },
      { path: 'reports', element: L(() => import('@/features/reports/ReportsPage')) },
      { path: 'admin/users', element: L(() => import('@/features/admin/users/UsersPage')) },
      { path: 'admin/users/:userId', element: L(() => import('@/features/admin/users/UserDetailsPage')) },
      { path: 'admin/users/:userId/permissions', element: <RequirePermission codes={[PERMISSIONS.usersView]}>{L(() => import('@/features/admin/users/UserPermissionsPage'))}</RequirePermission> },
      { path: 'admin/assignments', element: L(() => import('@/features/admin/assignments/AssignmentsPage')) },
      { path: 'admin/roles', element: L(() => import('@/features/admin/roles/RolesPage')) },
      { path: 'admin/roles/:roleId', element: L(() => import('@/features/admin/roles/RoleDetailsPage')) },
      { path: 'admin/directories', element: L(() => import('@/features/admin/directories/DirectoriesPage')) },
      { path: 'admin/directories/:slug', element: L(() => import('@/features/admin/directories/DirectoriesPage')) },
      { path: 'admin/labor-settings', element: L(() => import('@/features/admin/labor-settings/LaborSettingsPage')) },
      { path: 'admin/site-capacities', element: <RequirePermission codes={NAV_PERMISSIONS.siteCapacities}>{L(() => import('@/features/admin/site-capacities/SiteCapacitiesPage'))}</RequirePermission> },
      { path: 'admin/settings', element: L(() => import('@/features/admin/settings/SettingsPage')) },
      { path: 'admin/audit', element: L(() => import('@/features/admin/audit/AuditPage')) },
      { path: 'admin/integration', element: L(() => import('@/features/admin/integration/IntegrationPage')) },
      { path: 'admin/backups', element: L(() => import('@/features/admin/backups/BackupsPage')) },
      { path: '*', element: L(() => import('./NotFoundPage')) },
    ],
  },
]);
