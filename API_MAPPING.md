# API Mapping — Frontend ↔ Qoot.TemporaryLabor.Api v1

Base URL: `VITE_API_BASE_URL` (default dev proxy → `https://qoottemporarylabor.runasp.net`). All endpoints require `Authorization: Bearer <accessToken>` except `POST /auth/login`, `POST /auth/refresh` and `POST /public/complaints` (sent by `publicHttp`, without the header).

Conventions observed in the spec:

- Lists return `PagedResult<T>` = `{ items, total, page, pageSize }` with `Page` / `PageSize` query params (server-side pagination).
- Create endpoints return `201 { id }`; actions return `204`.
- Errors: RFC 9457 ProblemDetails — `title`, `detail`, stable `code`, `correlationId`; field errors in `errors` keyed by request property (`Workers[0].PassportNumber`). The client keeps `code` on `ApiError` (`API_ERROR_CODES`). `403 ASSIGNMENT_APPROVAL_REQUIRED` / `PASSWORD_CHANGE_REQUIRED` on any request re-reads `auth/me` and the route guard opens the matching screen; a plain `403 FORBIDDEN` re-reads it too (at most once per 30 s), because direct grants and denials (TL-N9) apply on the user's next request. `409 SITE_CAPACITY_EXCEEDED` carries `suggestions[]` (TL-N7), kept on `ApiError.suggestions`; `403 SELF_PRIVILEGE_CHANGE` / `PERMISSION_NOT_HELD` come from `PUT /users/{id}/permissions`.
- Enum values in requests may also be sent as numbers (needed for configurable list items such as a punishment type `60`).
- Enums are serialized as strings (e.g. `LaborStatus = Registered | Onboarding | Active | Suspended | Terminated | Closed`).
- File endpoints (`print`, `export`, attachments) return binary; frontend downloads them as Blob.
- Multipart endpoints (passport, documents, survey review, acknowledgement, handover, attachments, site-capacity change) accept a `scan` / `file` + fields; empty values are not sent (`api.postForm` / `api.putForm`).

TypeScript types are generated from the spec into `src/types/api.generated.ts` (`npm run gen:api`).

## العمال

Screen(s): /workers, /workers/:id

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| GET | `/api/v1/workers` | البحث في العمال | SearchLaborWorkers |
| POST | `/api/v1/workers/{employeeId}/health-certificates` | تجديد الشهادة الصحية للعامل | RenewHealthCertificate |
| GET | `/api/v1/workers/{employeeId}` | ملف العامل | GetLaborWorker |
| GET | `/api/v1/workers/by-number/{employeeNumber}` | إيجاد عامل برقمه الوظيفي | FindLaborWorker |

## المستخدمون

Screen(s): /admin/users, /admin/users/:id, /admin/users/:id/permissions

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
| GET | `/api/v1/users/assignments` | ملفات تكليف المستخدمين — /admin/assignments (TL-N3) | ListAssignments |
| GET | `/api/v1/users/{userId}/assignment/file` | فتح ملف تكليف مستخدم (PDF، يُسجَّل كل فتح) | OpenAssignment |
| POST | `/api/v1/users/{userId}/assignment/decision` | اعتماد ملف التكليف أو إعادته (`rowVersion` من الصف؛ 409 عند الاستبدال) | DecideAssignment |
| POST | `/api/v1/users/{userId}/force-sign-out` | إنهاء جلسات مستخدم | ForceSignOut |
| GET | `/api/v1/users/{userId}/permissions` | صلاحيات المستخدم: من الأدوار، مباشرة (`Grant`/`Deny`) وهل يملكها — /admin/users/:id/permissions (TL-N9) | GetUserPermissions |
| PUT | `/api/v1/users/{userId}/permissions` | استبدال الصلاحيات المباشرة بالقائمتين `granted` و`denied` كاملتين (204؛ `Users.ManagePermissions`) | SetUserPermissions |

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
| GET | `/api/v1/transfers/{transferId}/decision-file` | فتح قرار النقل | OpenTransferDecisionFile |
| PUT | `/api/v1/transfers/{transferId}/decision-file` | إرفاق قرار النقل (PDF) أو استبداله | AttachTransferDecisionFile |
| DELETE | `/api/v1/transfers/{transferId}/decision-file` | حذف قرار النقل المرفق | RemoveTransferDecisionFile |

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

Screen(s): /admin/labor-settings (Tracks & sites, User scopes), /admin/site-capacities (TL-N7)

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
| GET | `/api/v1/labor-settings/site-capacities` | سعة المواقع النشطة: السعة، الإشغال، الأماكن الشاغرة، فوق السعة، الإحداثيات، `rowVersion`، آخر تغيير (TL-N7) | ListSiteCapacities |
| PUT | `/api/v1/labor-settings/site-capacities/{workSiteId}` | تغيير السعة (`multipart`: `capacity` فارغة = بلا حد، `rowVersion`، `file` PDF؛ `ManageSiteCapacity`؛ 409 `CONCURRENCY_CONFLICT`) | ChangeSiteCapacity |
| GET | `/api/v1/labor-settings/site-capacities/{workSiteId}/changes` | سجل تغييرات سعة موقع، الأحدث أولاً | ListSiteCapacityChanges |
| GET | `/api/v1/labor-settings/site-capacities/changes/{changeId}/file` | فتح قرار تغيير السعة (PDF، يُسجَّل كل فتح؛ `ManageSiteCapacity`) | OpenSiteCapacityFile |

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

Screen(s): /candidates, /candidates/:candidateId, staffing request → Candidates tab, /staffing-requests/new (candidates section)

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| GET | `/api/v1/candidates` | قائمة المرشحين | ListCandidates |
| POST | `/api/v1/candidates` | إضافة مرشح إلى قائمة المرشحين | AddCandidate |
| GET | `/api/v1/candidates/{candidateId}` | بطاقة مرشح | GetCandidate |
| PUT | `/api/v1/candidates/{candidateId}` | تعديل بيانات مرشح | UpdateCandidate |
| POST | `/api/v1/candidates/{candidateId}/withdraw` | سحب مرشح من قائمة المرشحين | WithdrawCandidate |
| POST | `/api/v1/candidates/{candidateId}/restore` | إعادة مرشح مسحوب إلى قائمة المرشحين | RestoreCandidate |
| POST | `/api/v1/candidates/{candidateId}/interview` | تسجيل نتيجة مقابلة المرشح | InterviewCandidate |
| GET | `/api/v1/staffing-requests/{requestNumber}/candidates` | مرشحو طلب الاحتياج | GetRequestCandidates |
| POST | `/api/v1/staffing-requests/{requestNumber}/candidates` | ترشيح مرشحين من القائمة على طلب احتياج | NominateCandidates |
| POST | `/api/v1/candidates/{candidateId}/cancel` | إلغاء ترشيح مرشح | CancelCandidate |

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
| GET | `/api/v1/audit/export` | تصدير حركة المستخدمين على النظام إلى Excel | ExportAudit |

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

## الشكاوى (TL-N1, 2026-11-08)

Screen(s): /complaint (public, no sign-in), /complaints, /complaints/:id — permission `TemporaryLabor.ManageComplaints`

| Method | Endpoint | Purpose | operationId |
|---|---|---|---|
| POST | `/api/v1/public/complaints` | تقديم شكوى من النموذج العام (دون دخول؛ 429 حد المعدل، 413 أكبر من 16 KB) | SubmitComplaint |
| GET | `/api/v1/complaints` | قائمة الشكاوى (`{ page, newCount }`، تبويب New الأقدم أولًا) | ListComplaints |
| GET | `/api/v1/complaints/{complaintId}` | شكوى واحدة (`canReview`) | GetComplaint |
| POST | `/api/v1/complaints/{complaintId}/review` | تسجيل مراجعة شكوى (مرة واحدة) | ReviewComplaint |

## Changes of 2026-11-08 to existing endpoints

| Endpoint | Change | Screen |
|---|---|---|
| `GET /auth/me` | `assignment { status, fileName, submittedAt, reviewedAt, reviewNote }` (TL-N3) | route guard → /assignment |
| `POST /auth/me/assignment` | upload the assignment letter (multipart `file`, PDF) | /assignment |
| `GET /registration/options` | `canRegisterWithoutPassport` | /registration |
| `POST /registration/workers` | `passportIssueDate`, `passportExpiryDate`, `passportWaived`, `passportWaiverReason`, `healthCertificateIssueDate` (required), expiry required; phone optional (TL-N2/N4) | /registration |
| `GET /workers/{employeeId}` | `passportIssueDate`, `passportExpiryDate`, `healthCertificateIssueDate`, `passportWaiverReason` | /workers/:id |
| `PUT /employees/{employeeId}/identity` | `passportIssueDate`, `passportExpiryDate` (always sent back) | /workers/:id → edit identity |
| `POST /workers/{employeeId}/documents` | `issuedOn` (health certificate, with `expiresOn`) — superseded on 2026-11-14: certificates go to `POST /workers/{id}/health-certificates` | onboarding checklist |
| `POST /workers/{employeeId}/passport` | `issuedOn`, `expiresOn` (required when none recorded; must match recorded) | onboarding passport custody |
| `POST /migration/current-workers` | optional passport and health-certificate dates per row | — (API only) |
| `POST /penalties` | `issuedBy`, `issuedOn` (TL-N5) | /penalties/new |
| `GET /penalties` | filters `TrackId`, `EmployeeId`, `Source`, `IssuedBy`, `IssuedFrom`, `IssuedTo`; rows `issuedBy`, `issuedOn` | /penalties, worker file → penalties tab |
| `POST /penalties/{id}/decision` | `decision` = any type of `labor-penalty-decisions` (name or number); days only for `DeductionOfDays` | /penalties/:id |
| `GET /directories/{slug}` | `Search`, `Active` filters | /admin/directories/:slug |
| `GET /directories/{slug}/{id}` | single entry (fresh `rowVersion` before editing) | /admin/directories/:slug |
| `GET /audit` | filters `ActorUserId`, `ActionCodes[]`, `Module`, `EntityType`, `EntityId`, `IpAddress`, `CorrelationId`, `IncludeChanges`; rows `actorUserId`, `actorUserName`, `userAgent`, `correlationId`, `changes` (TL-N6) | /admin/audit |
| `GET /audit/options` | filter lists (actions, modules, entity types, actors) | /admin/audit |

## Changes of 2026-11-11 to existing endpoints

| Endpoint | Change | Screen |
|---|---|---|
| `POST /staffing-requests` | `leavingEmployeeId` removed → `leavingEmployeeIds[]` (replacement only: one different leaving worker per requested place, so as many as `count`; `errors.LeavingEmployeeIds`); `409 SITE_CAPACITY_EXCEEDED` when `count` exceeds the site's free places (TL-N8, TL-N7) | /staffing-requests/new |
| `GET /staffing-requests/{number}` | `leavingEmployeeNumber` / `leavingEmployeeName` removed → `leavers[] { employeeId, employeeNumber, name }` (empty for a need request) (TL-N8) | /staffing-requests/:number |
| `POST /registration/workers`, `POST /workers/{id}/entry-permits`, `POST /transfers`, `PUT /transfers/{id}`, `POST /transfers/{id}/execute`, `POST /migration/current-workers`, `POST /terminations/{id}/replacement-request` | `409 SITE_CAPACITY_EXCEEDED` with up to 5 `suggestions[] { workSiteId, number, name, shortage, freePlaces, distanceKm }`; the action is never retried automatically (TL-N7) | registration, permit dialog, transfer form / execution, migration tab, termination replacement request |
| `GET /directories/work-sites` | extra fields `latitude` / `longitude` typed `Latitude` / `Longitude` (`DirectoryFieldKind`): -90…90 / -180…180, ≤ 6 decimals, Latin digits, both or neither (TL-N7) | /admin/directories/work-sites |
| `DELETE /workers/{id}/onboarding/start-report`, `POST /workers/{id}/onboarding/close-not-started` | `422 BUSINESS_RULE_VIOLATED` while the worker has a termination request in progress; the message names the request (TL-N10) | onboarding record (withdraw dialog keeps the refusal visible; close dialog shows it in its alert) |
| `GET /auth/me` | `permissions` now include direct grants minus direct denials (TL-N9) | session, menus, buttons |
| `GET /penalties` | `PenaltySource` is never `null` | /penalties |
| `AttendanceSheetCell` | `effective` is optional | attendance sheet |

## Changes of 2026-11-12 to existing endpoints

| Endpoint | Change | Screen |
|---|---|---|
| `GET /candidates` | row reshaped (TL-N13): the candidate is a person of the candidate list, not "a candidate on a request" — `requestNumber`, `trackName`, `workSiteName`, `jobName`, `status`, `statusReason` describe his latest nomination and are `null` when he was never nominated or the request is outside the user's scope; new `phone`, `candidateJobName`, `poolStatus` (`CandidatePoolStatus`: `Available`, `Nominated`, `Registered`, `Withdrawn`), `nominationCount`; new filters `PoolStatus`, `JobId`, `NationalityId`; `Search` also matches the phone number. Whoever holds `ManageCandidates` sees the whole list, others only candidates nominated on a request within their scope | /candidates |
| `POST /candidates` | `requestNumber` is optional (without it the candidate only joins the list); new `phone`, `jobId`, `notes` | /candidates, request → Candidates tab ("New candidate") |
| `GET /staffing-requests/{n}/candidates` | `canAdd` now means "may nominate now" (from submission until rejected / closed / filled), `canInterview` also requires an approved request, `acceptsCandidates` unchanged; every item adds `nominationId` and `phone`; `id` stays the candidate id | request → Candidates tab |
| `POST /candidates/{id}/cancel` | cancels the running nomination only and returns the candidate to the list with his data and copies (`409 INVALID_STATE_TRANSITION` without one) | request → Candidates tab ("Cancel nomination") |
| `POST /staffing-requests` | optional `candidateIds[]` (available candidates of the list) and `newCandidates[]` (`CandidateInput`), both for `ManageCandidates` holders (`403` otherwise); saved with the request in one transaction; reasons in `errors.CandidateIds` and `errors["NewCandidates[i].Field"]` | /staffing-requests/new |
| `GET /registration/queue` | each item carries the candidate's `phone`, suggested as the employee's phone number | /registration |
| `GET /transfers/{id}` | `decisionFile { fileName, size, attachedAt }`, `canChangeDecisionFile`, `decisionFileRefusal` (TL-N12) | /transfers/:id |
| `GET /inbox/tasks` → `notifications` | fingerprint notices (TL-N12) link to `transfers/{id}` — relative, without a leading slash; `resolveLink` anchors it before matching the known routes | notification menu, /tasks |
| `GET /terminations/{id}` | `actions.settlementRefusal` removed; `canApproveSettlement` is true for whoever recorded the settlement too (TL-N11) | /terminations/:id |
| decision endpoints of every workflow | the rule "a user does not approve what he entered himself" is gone (TL-N11); `canDecide`, `parties[].refusal`, `interviewRefusal`, `decisionRefusal`, `reviewRefusal` only keep the "one user cannot decide two steps of the same chain" refusal. The screens never decided this themselves, so they follow the API flags unchanged | all details pages, /tasks |

New endpoints: `GET|PUT|DELETE /transfers/{id}/decision-file` (multipart field `file`, PDF; `400 errors.File`, `404`, `422` once a party has decided in the round, `409` on a simultaneous decision),
`GET|PUT /candidates/{id}`, `POST /candidates/{id}/withdraw`, `POST /candidates/{id}/restore`, `POST /staffing-requests/{number}/candidates`.
New permissions: `TemporaryLabor.FingerprintNotices` (default role `LaborFingerprintSupervisor`, no screen of its own); `TemporaryLabor.ManageCandidates` gains the list and the nomination actions.

## Changes of 2026-11-14 to existing endpoints

Read from the live API (`/openapi/v1.json`, 170 paths / 200 operations / 360 schemas, canonical hash identical to `openapi/openapi.json`); not yet in `frontend-guide 3.md`.

| Endpoint | Change | Screen |
|---|---|---|
| `POST /staffing-requests/{n}/decision` | TL-N15: Operations is the whole chain (`party` = `Operations`); `StaffingRequestStatus.PendingGeneralManager` and `canDecideAsGeneralManager` removed | /staffing-requests/:number |
| `POST /candidates/decisions` | **removed** (TL-N15): acceptance in the interview approves the candidate (`Interview` → `Approved`); `CandidateStatus.PendingGeneralManager`, `RequestCandidates.canDecide`, `RequestCandidateItem.decisionRefusal`, task kind `CandidateApproval` removed; `generalManager` stays only on nominations decided before | request → Candidates tab, candidate card, /tasks |
| `GET /workers/{id}/onboarding-salary` | TL-N15: the onboarding salary is decided with the final start approval (`canDecide` never true for it; it cannot be withdrawn while the record is in the approval chain); a salary after a transfer keeps its HR step | onboarding record → salary |
| `GET /workers/{id}/onboarding` | TL-N14: `passportIssueDate`, `passportExpiryDate`, `hasPassportCopy` | onboarding record (start record, passport custody) |
| `POST /workers/{id}/passport` | TL-N14: no scan needed when the file already has a passport copy; a recorded number / dates are not asked again | onboarding record → passport custody |
| `POST /workers/{id}/documents` | `issuedOn` / `expiresOn` removed; a health certificate goes to the new endpoint below | onboarding record → checklist |
| `GET /audit` | new `FromTime` / `ToTime` (`HH:mm`, need `From` / `To`) and `Sort` (`AuditSort`: `Newest` default, `Oldest`, `Actor`, `Action`) | /admin/audit |

New endpoints: `POST /workers/{employeeId}/health-certificates` (multipart `receivedOn`, `issuedOn`, `expiresOn` required, `notes`, `scan`; renewal adds a new document — onboarding checklist and worker file → "Renew health certificate"), `GET /audit/export` (same filters as the search, Excel — /admin/audit → "Export Excel").
