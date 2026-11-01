# API Mapping — Frontend ↔ Qoot.TemporaryLabor.Api v1

Base URL: `VITE_API_BASE_URL` (default dev proxy → `http://qoottemporarylabor.runasp.net`). All endpoints require `Authorization: Bearer <accessToken>` except `POST /auth/login` and `POST /auth/refresh`.

Conventions observed in the spec:

- Lists return `PagedResult<T>` = `{ items, total, page, pageSize }` with `Page` / `PageSize` query params (server-side pagination).
- Create endpoints return `201 { id }`; actions return `204`.
- Errors: `400 HttpValidationProblemDetails` (`errors: { field: string[] }`), `401/403/404/409/422 ProblemDetails` (`title`, `detail`).
- Enums are serialized as strings (e.g. `LaborStatus = Registered | Onboarding | Active | Suspended | Terminated | Closed`).
- File endpoints (`print`, `export`, attachments) return binary; frontend downloads them as Blob.
- Multipart endpoints (passport, documents, survey review, acknowledgement, handover, attachments) accept `scan` file + fields.

TypeScript types are generated from the spec into `src/types/api.generated.ts` (`npm run gen:api`).

## العمال

Screen(s): /workers, /workers/:id

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| GET | `/api/v1/workers` | البحث في العمال | SearchLaborWorkers |
| GET | `/api/v1/workers/{employeeId}` | ملف العامل | GetLaborWorker |
| GET | `/api/v1/workers/by-number/{employeeNumber}` | إيجاد عامل برقمه الوظيفي | FindLaborWorker |

## المستخدمون

Screen(s): /admin/users, /admin/users/:id

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| PUT | `/api/v1/users/{id}` | تعديل بيانات مستخدم | UpdateUser |
| GET | `/api/v1/users/{id}` | تفاصيل مستخدم | GetUser |
| POST | `/api/v1/users/{userId}/unlock` | فك قفل مستخدم | UnlockUser |
| PUT | `/api/v1/users/{userId}/roles` | تحديد أدوار مستخدم | SetUserRoles |
| PUT | `/api/v1/users/{userId}/active` | تفعيل مستخدم أو إيقافه | SetUserActive |
| POST | `/api/v1/users/{userId}/reset-password` | إعادة تعيين كلمة مرور مستخدم | ResetUserPassword |
| GET | `/api/v1/users` | قائمة المستخدمين | ListUsers |
| POST | `/api/v1/users` | إنشاء مستخدم بكلمة مرور مؤقتة | CreateUser |
| GET | `/api/v1/users/assignable-roles` | الأدوار القابلة للإسناد | ListAssignableRoles |
| POST | `/api/v1/users/{userId}/force-sign-out` | إنهاء جلسات مستخدم | ForceSignOut |

## النقل

Screen(s): /transfers, /transfers/new, /transfers/:id

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/transfers` | تقديم طلب نقل | SubmitTransfer |
| GET | `/api/v1/transfers` | قائمة طلبات النقل | ListTransfers |
| PUT | `/api/v1/transfers/{transferId}` | إعادة تقديم طلب نقل | ResubmitTransfer |
| GET | `/api/v1/transfers/{transferId}` | تفاصيل طلب نقل | GetTransfer |
| POST | `/api/v1/transfers/{transferId}/supervisors-informed` | تسجيل إبلاغ المشرفين بالنقل | RecordSupervisorsInformed |
| GET | `/api/v1/workers/{employeeId}/transfer-options` | خيارات نقل العامل | GetTransferOptions |
| POST | `/api/v1/transfers/{transferId}/execute` | تنفيذ النقل | ExecuteTransfer |
| POST | `/api/v1/transfers/{transferId}/decision` | قرار جهة اعتماد في النقل | DecideTransfer |
| POST | `/api/v1/transfers/{transferId}/cancel` | إلغاء طلب نقل | CancelTransfer |

## إنهاء الخدمة

Screen(s): /terminations, /terminations/new, /terminations/:id

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/terminations` | تقديم طلب إنهاء خدمة | SubmitTermination |
| GET | `/api/v1/terminations` | قائمة طلبات إنهاء الخدمة | ListTerminations |
| POST | `/api/v1/terminations/{terminationId}/settlement` | تسجيل التسوية المالية | RecordSettlement |
| PUT | `/api/v1/terminations/{terminationId}/clearance-items/{itemId}` | تسجيل بند إخلاء طرف | RecordClearance |
| POST | `/api/v1/terminations/{terminationId}/replacement-request` | إعداد طلب إحلال | PrepareReplacementRequest |
| POST | `/api/v1/terminations/{terminationId}/passport-handover` | تسليم الجواز عند الخروج | HandPassportOnExit |
| GET | `/api/v1/terminations/{terminationId}` | تفاصيل إنهاء خدمة | GetTermination |
| GET | `/api/v1/workers/{employeeId}/termination-sources` | مصادر إنهاء خدمة العامل | GetTerminationSources |
| POST | `/api/v1/terminations/{terminationId}/execute` | تنفيذ إنهاء الخدمة | ExecuteTermination |
| POST | `/api/v1/terminations/{terminationId}/decision` | قرار إنهاء الخدمة | DecideTermination |
| POST | `/api/v1/terminations/{terminationId}/replacement-decision` | قرار الحاجة إلى بديل | DecideReplacement |
| POST | `/api/v1/terminations/{terminationId}/close` | إغلاق ملف إنهاء الخدمة | CloseTermination |
| POST | `/api/v1/terminations/{terminationId}/cancel` | إلغاء طلب إنهاء خدمة | CancelTermination |
| POST | `/api/v1/terminations/{terminationId}/settlement/approval` | اعتماد التسوية المالية | ApproveSettlement |
| POST | `/api/v1/terminations/{terminationId}/clearance-items` | إضافة بند إخلاء طرف | AddClearanceItem |

## إعدادات النظام

Screen(s): /admin/settings

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| PUT | `/api/v1/settings/{group}` | تعديل مجموعة إعدادات | UpdateSettings |
| GET | `/api/v1/settings` | قائمة إعدادات النظام | ListSettings |

## الإيقاف

Screen(s): /workers/:id/onboarding (Suspend dialog)

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/suspensions` | إيقاف عامل | SuspendWorker |
| GET | `/api/v1/workers/{employeeId}/suspension-sources` | مصادر إيقاف العامل | GetSuspensionSources |

## اعتماد المباشرة

Screen(s): /workers/:id/onboarding (Start approval card)

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/workers/{employeeId}/start-approval/submit` | رفع المباشرة للاعتماد | SubmitStart |
| GET | `/api/v1/workers/{employeeId}/start-approval` | تفاصيل اعتماد المباشرة | GetStartApproval |
| POST | `/api/v1/workers/{employeeId}/start-approval/decision` | قرار جهة اعتماد في المباشرة | DecideStart |

## طلبات الاحتياج

Screen(s): /staffing-requests, /staffing-requests/new, /staffing-requests/:number

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/staffing-requests` | تقديم طلب احتياج | SubmitStaffingRequest |
| GET | `/api/v1/staffing-requests` | قائمة طلبات الاحتياج | ListStaffingRequests |
| GET | `/api/v1/staffing-requests/{number}` | تفاصيل طلب احتياج | GetStaffingRequest |
| POST | `/api/v1/staffing-requests/{number}/decision` | قرار جهة اعتماد في طلب الاحتياج | DecideStaffingRequest |
| POST | `/api/v1/staffing-requests/{number}/close` | إغلاق طلب احتياج | CloseStaffingRequest |

## المرتبات

Screen(s): /workers/:id/onboarding (Salary card), /transfers/:id

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| PUT | `/api/v1/salaries/{salaryId}` | تعديل مرتب مقترح | ReviseSalary |
| POST | `/api/v1/workers/{employeeId}/salaries` | اقتراح مرتب | ProposeSalary |
| GET | `/api/v1/workers/{employeeId}/onboarding-salary` | مرتب المباشرة وسجل المرتبات | GetOnboardingSalary |
| POST | `/api/v1/salaries/{salaryId}/decision` | قرار اعتماد المرتب | DecideSalary |
| POST | `/api/v1/salaries/{salaryId}/cancel` | إلغاء مرتب مقترح | CancelSalary |

## الأدوار

Screen(s): /admin/roles, /admin/roles/:id

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| PUT | `/api/v1/roles/{id}` | تعديل دور | UpdateRole |
| GET | `/api/v1/roles/{id}` | تفاصيل دور | GetRole |
| DELETE | `/api/v1/roles/{id}` | حذف دور | DeleteRole |
| PUT | `/api/v1/roles/{roleId}/permissions` | تحديد صلاحيات دور | SetRolePermissions |
| GET | `/api/v1/roles` | قائمة الأدوار | ListRoles |
| POST | `/api/v1/roles` | إنشاء دور | CreateRole |
| GET | `/api/v1/roles/permissions` | قائمة الصلاحيات | ListPermissions |

## التقارير

Screen(s): /reports

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/reports/export` | تصدير تقرير إلى PDF أو Excel | ExportLaborReport |
| POST | `/api/v1/reports/run` | تشغيل تقرير | RunLaborReport |
| GET | `/api/v1/reports/options` | خيارات التقارير | GetLaborReportOptions |

## تسجيل العمال

Screen(s): /registration

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/registration/workers` | تسجيل العمال | RegisterWorkers |
| GET | `/api/v1/registration/queue` | المرشحون المعتمدون بانتظار التسجيل | ListRegistrationQueue |
| GET | `/api/v1/registration/options` | خيارات تسجيل العمال | GetRegistrationOptions |

## أذونات الدخول

Screen(s): /entry-permits (Distribution queue, Permits)

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| GET | `/api/v1/entry-permits/by-number/{number}/print` | طباعة إذن دخول برقمه | PrintEntryPermitByNumber |
| POST | `/api/v1/entry-permits/print` | طباعة أذونات دخول مختارة | PrintEntryPermits |
| GET | `/api/v1/entry-permits` | قائمة أذونات الدخول | ListEntryPermits |
| GET | `/api/v1/entry-permits/distribution-queue` | العمال بانتظار التوزيع على المواقع | ListDistributionQueue |
| POST | `/api/v1/workers/{employeeId}/entry-permits` | إصدار إذن دخول | IssueEntryPermit |
| POST | `/api/v1/entry-permits/issue-current-workers` | إصدار أذونات العمال الحاليين | IssueCurrentWorkersPermits |
| GET | `/api/v1/workers/{employeeId}/distribution-sites` | مواقع التوزيع المتاحة للعامل | GetDistributionSites |
| POST | `/api/v1/entry-permits/{permitId}/cancel` | إلغاء إذن دخول | CancelEntryPermit |

## الجزاءات

Screen(s): /penalties, /penalties/new, /penalties/:id

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/penalties` | اقتراح جزاء | ProposePenalty |
| GET | `/api/v1/penalties` | قائمة الجزاءات | ListPenalties |
| GET | `/api/v1/penalties/{penaltyId}` | تفاصيل جزاء | GetPenalty |
| GET | `/api/v1/penalties/incident-drafts/{incidentId}` | مسودة جزاء من واقعة غياب | GetPenaltyIncidentDraft |
| POST | `/api/v1/penalties/{penaltyId}/dismiss` | حفظ الجزاء دون تطبيق | DismissPenalty |
| POST | `/api/v1/penalties/{penaltyId}/decision` | قرار الجزاء | DecidePenalty |
| POST | `/api/v1/penalties/{penaltyId}/apply` | تطبيق الجزاء | ApplyPenalty |
| POST | `/api/v1/penalties/{penaltyId}/acknowledgement` | تسجيل إقرار العامل بالجزاء | AcknowledgePenalty |

## إشعارات الرواتب

Screen(s): /payroll-notices, onboarding notice card

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/payroll-notices/{noticeId}/delivery` | تسجيل تسليم الإشعار | RecordNoticeDelivery |
| GET | `/api/v1/payroll-notices` | قائمة إشعارات الرواتب | ListPayrollNotices |
| GET | `/api/v1/workers/{employeeId}/onboarding-notice` | إشعار مباشرة العامل | GetOnboardingNotice |
| POST | `/api/v1/payroll-notices/{noticeId}/confirm` | تأكيد إشعار رواتب | ConfirmPayrollNotice |

## إجراءات المباشرة

Screen(s): /onboarding, /workers/:id/onboarding

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| DELETE | `/api/v1/workers/{employeeId}/onboarding/start-report` | سحب بلاغ بدء العمل | WithdrawStartReport |
| POST | `/api/v1/workers/{employeeId}/onboarding/start-report` | الإبلاغ عن بدء العمل | ReportStart |
| PUT | `/api/v1/workers/{employeeId}/survey/applicability` | تحديد انطباق المسح الأمني | SetSurveyApplicability |
| DELETE | `/api/v1/documents/{documentId}` | حذف مستند | RemoveDocument |
| PUT | `/api/v1/workers/{employeeId}/passport/location` | تغيير مكان حفظ الجواز | RelocatePassport |
| POST | `/api/v1/workers/{employeeId}/survey/review` | تسجيل نتيجة مراجعة المسح الأمني | RecordSurveyReview |
| POST | `/api/v1/workers/{employeeId}/passport` | استلام جواز العامل في العهدة | ReceivePassport |
| POST | `/api/v1/workers/{employeeId}/documents` | استلام مستند للعامل | ReceiveDocument |
| POST | `/api/v1/workers/{employeeId}/onboarding/open` | فتح سجل المباشرة | OpenOnboarding |
| GET | `/api/v1/onboarding` | قائمة إجراءات المباشرة | ListOnboarding |
| GET | `/api/v1/workers/{employeeId}/survey` | تفاصيل المسح الأمني | GetSurveyDetails |
| GET | `/api/v1/workers/{employeeId}/onboarding` | سجل مباشرة العامل | GetOnboardingRecord |
| PUT | `/api/v1/workers/{employeeId}/onboarding/start-date` | تصحيح تاريخ المباشرة | CorrectStartDate |
| POST | `/api/v1/workers/{employeeId}/onboarding/close-not-started` | إغلاق ملف عامل لم يباشر | CloseNotStarted |

## الترحيل

Screen(s): /admin/integration (Migration tab)

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/migration/current-workers` | ترحيل العمال الحاليين مع تقرير تحقق | MigrateCurrentWorkers |

## الإجازات

Screen(s): /leaves, /leaves/new, /leaves/:id, worker leaves tab

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/workers/{employeeId}/leaves` | تقديم طلب إجازة | SubmitLeave |
| GET | `/api/v1/workers/{employeeId}/leaves` | سجل إجازات العامل | GetLeaveHistory |
| POST | `/api/v1/leaves/{leaveId}/passport/return` | استلام الجواز بعد السفر | ReturnPassportFromTravel |
| PUT | `/api/v1/leaves/{leaveId}` | إعادة تقديم طلب إجازة بعد إرجاعه | ResubmitLeave |
| GET | `/api/v1/leaves/{leaveId}` | تفاصيل إجازة | GetLeave |
| GET | `/api/v1/leaves` | قائمة الإجازات | ListLeaves |
| POST | `/api/v1/leaves/{leaveId}/passport/hand-over` | تسليم الجواز للسفر | HandPassportForTravel |
| POST | `/api/v1/leaves/{leaveId}/decision` | قرار جهة اعتماد في الإجازة | DecideLeave |
| POST | `/api/v1/leaves/{leaveId}/confirm-return` | تأكيد عودة العامل من الإجازة | ConfirmLeaveReturn |
| POST | `/api/v1/leaves/{leaveId}/cancel` | إلغاء إجازة | CancelLeave |

## إعدادات العمالة المؤقتة

Screen(s): /admin/labor-settings (Tracks & sites, User scopes)

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/labor-settings/tracks` | حفظ مسار | SaveLaborTrack |
| GET | `/api/v1/labor-settings/tracks` | قائمة المسارات | ListLaborTracks |
| DELETE | `/api/v1/labor-settings/user-scopes/{scopeId}` | إزالة نطاق مستخدم | RemoveLaborUserScope |
| DELETE | `/api/v1/labor-settings/tracks/{trackId}/sites/{workSiteId}` | إزالة موقع من المسار | RemoveLaborTrackSite |
| PUT | `/api/v1/labor-settings/tracks/{trackId}/sites/{workSiteId}` | إضافة موقع إلى المسار | AddLaborTrackSite |
| GET | `/api/v1/labor-settings/user-scopes` | نطاقات المستخدمين | ListLaborUserScopes |
| POST | `/api/v1/labor-settings/user-scopes` | إضافة نطاق لمستخدم | AddLaborUserScope |
| GET | `/api/v1/labor-settings/tracks/{trackId}/sites` | مواقع المسار | ListLaborTrackSites |
| GET | `/api/v1/labor-settings/options` | خيارات إعدادات العمالة المؤقتة | GetLaborSettingsOptions |

## التكامل

Screen(s): /admin/integration (Workers, Events, Log)

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/integration/events/{noticeId}/failure` | تسجيل خطأ نقل حدث | ReportIntegrationFailure |
| GET | `/api/v1/integration/workers` | تصدير بيانات العمال للنظام الخارجي | ListIntegrationWorkers |
| GET | `/api/v1/integration/log` | سجل الواجهات | ListIntegrationLog |
| GET | `/api/v1/integration/events` | الأحداث المؤثرة في الرواتب للنظام الخارجي | ListIntegrationEvents |
| POST | `/api/v1/integration/events/{noticeId}/acknowledge` | تأكيد استلام حدث في النظام الخارجي | AcknowledgeIntegrationEvent |

## المهام والتنبيهات

Screen(s): / (My tasks inbox), header notifications

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/inbox/notifications/{id}/read` | تعليم تنبيه كمقروء | MarkLaborNotificationRead |
| GET | `/api/v1/inbox/tasks` | مهام المستخدم وتنبيهاته | GetLaborTasks |

## النماذج

Screen(s): Print buttons on records; shared filter lists

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| GET | `/api/v1/forms/{code}/print` | طباعة نموذج معتمد | PrintLaborForm |
| GET | `/api/v1/forms/options` | خيارات النماذج والقوائم المشتركة | GetLaborFormOptions |

## التقييمات

Screen(s): /evaluations, /evaluations/new, /evaluations/:id

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/evaluations/{evaluationId}/review` | مراجعة التقييم | ReviewEvaluation |
| POST | `/api/v1/evaluations` | تسجيل تقييم عامل | RecordEvaluation |
| GET | `/api/v1/evaluations` | قائمة التقييمات | ListEvaluations |
| GET | `/api/v1/evaluations/due` | العمال المستحق تقييمهم | ListDueEvaluations |
| GET | `/api/v1/evaluations/{evaluationId}` | تفاصيل تقييم | GetEvaluation |
| GET | `/api/v1/workers/{employeeId}/evaluation-worker` | بيانات العامل لنموذج التقييم | GetEvaluationWorker |

## بيانات الموظفين

Screen(s): /workers/:id (Edit identity)

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| PUT | `/api/v1/employees/{employeeId}/identity` | تصحيح بيانات هوية الموظف | UpdateEmployeeIdentity |

## الأدلة

Screen(s): /admin/directories/:slug

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| PUT | `/api/v1/directories/{slug}/{id}` | تعديل عنصر دليل | UpdateDirectoryEntry |
| DELETE | `/api/v1/directories/{slug}/{id}` | حذف عنصر دليل | DeleteDirectoryEntry |
| PUT | `/api/v1/directories/{slug}/{id}/active` | تفعيل عنصر دليل أو إيقافه | SetDirectoryEntryActive |
| GET | `/api/v1/directories/{slug}` | عناصر دليل | ListDirectoryEntries |
| POST | `/api/v1/directories/{slug}` | إضافة عنصر إلى دليل | CreateDirectoryEntry |

## المرشحون

Screen(s): /candidates, staffing request → Candidates tab

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| GET | `/api/v1/candidates` | قائمة المرشحين | ListCandidates |
| POST | `/api/v1/candidates` | إضافة مرشح على طلب احتياج | AddCandidate |
| POST | `/api/v1/candidates/{candidateId}/interview` | تسجيل نتيجة مقابلة المرشح | InterviewCandidate |
| GET | `/api/v1/staffing-requests/{requestNumber}/candidates` | مرشحو طلب الاحتياج | GetRequestCandidates |
| POST | `/api/v1/candidates/decisions` | قرار المدير العام في أسماء المرشحين | DecideCandidates |
| POST | `/api/v1/candidates/{candidateId}/cancel` | إلغاء مرشح | CancelCandidate |

## النسخ الاحتياطي

Screen(s): /admin/backups

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/backups` | إنشاء نسخة احتياطية | CreateBackup |
| GET | `/api/v1/backups` | النسخ الاحتياطية لقاعدة البيانات | GetBackupOverview |

## الدخول

Screen(s): Login, Change password, Header (language, logout)

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| PUT | `/api/v1/auth/me/language` | تحديد اللغة المفضلة | SetPreferredLanguage |
| POST | `/api/v1/auth/refresh` | تجديد رموز الجلسة | RefreshTokens |
| POST | `/api/v1/auth/logout` | إنهاء الجلسة | Logout |
| POST | `/api/v1/auth/login` | الدخول وإصدار رموز الجلسة | Login |
| GET | `/api/v1/auth/me` | بيانات المستخدم الحالي وصلاحياته | GetCurrentUser |
| POST | `/api/v1/auth/change-password` | تغيير كلمة المرور | ChangePassword |

## سجل التدقيق

Screen(s): /admin/audit

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| GET | `/api/v1/audit` | البحث في سجل التدقيق | SearchAudit |
| GET | `/api/v1/audit/{id}` | تفاصيل قيد تدقيق | GetAuditLog |

## الحضور

Screen(s): /attendance, /attendance/sheets/:id, /attendance/incidents

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/attendance/sheets/{sheetId}/submit` | تسليم الكشف من المشرف | SubmitAttendanceSheet |
| POST | `/api/v1/attendance/sheets/{sheetId}/review` | مراجعة الكشف | ReviewAttendanceSheet |
| PUT | `/api/v1/attendance/sheets/{sheetId}/entries` | تسجيل أكواد الحضور في الكشف | RecordAttendance |
| POST | `/api/v1/attendance/sheets/{sheetId}/receive` | استلام الكشف في قسم العمالة | ReceiveAttendanceSheet |
| POST | `/api/v1/attendance/sheets` | فتح كشف حضور لموقع وشهر | OpenAttendanceSheet |
| GET | `/api/v1/attendance/sheets` | قائمة كشوف الحضور | ListAttendanceSheets |
| GET | `/api/v1/attendance/sheets/{sheetId}/device-differences` | الفروق بين جهاز البصمة والكشف | ListDeviceDifferences |
| GET | `/api/v1/attendance/absence-incidents` | قائمة وقائع الغياب | ListAbsenceIncidents |
| POST | `/api/v1/attendance/device-records` | استيراد سجلات أجهزة البصمة | ImportDeviceRecords |
| GET | `/api/v1/attendance/sheets/{sheetId}` | تفاصيل كشف حضور | GetAttendanceSheet |
| POST | `/api/v1/attendance/absence-incidents/{incidentId}/excuse` | قبول عذر واقعة غياب | ExcuseAbsenceIncident |

## المرفقات

Screen(s): /workers/:id (Attachments tab), file opener

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| GET | `/api/v1/attachments/{attachmentId}` | فتح مرفق عامل | OpenLaborAttachment |
| GET | `/api/v1/workers/{employeeId}/attachments` | مرفقات سجل العامل | ListWorkerAttachments |
| POST | `/api/v1/workers/{employeeId}/attachments` | إرفاق نموذج موقع ممسوح بسجل العامل | AttachWorkerForm |
