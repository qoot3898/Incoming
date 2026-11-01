# Project Analysis — Temporary Labor Management System (Qoot)

Sources analysed:

- `TL-SRS وثيقة مواصفات متطلبات البرمجيات v2.1.pdf` (SRS v2.0 content, 16 pages, status: submitted for approval).
- Backend OpenAPI document `http://qoottemporarylabor.runasp.net/openapi/v1.json` — *Qoot.TemporaryLabor.Api v1*, 149 paths / 172 operations / 325 schemas, JWT Bearer security.

## 1. System purpose

One system covering the temporary worker's life-cycle at Qoot Al-Madina — from the site's staffing request through candidates, registration, entry permit, onboarding, start approval, daily attendance, leaves, penalties, transfers, evaluation, termination/settlement and replacement. It replaces paper circulation, integrates with Odoo (initial), with fingerprint devices (future) and migrates existing workers.

## 2. User roles (SRS §2) → backend representation

| SRS role | Backend `LaborParty` enum | Notes |
|---|---|---|
| Site (requesting party) | `Site` | Creates staffing / replacement requests |
| Site supervisor | `Supervisor` | Start report, attendance, leave/transfer approval, evaluation, payroll notice delivery — scoped to own site |
| Operations management (Catering / Cleaning & Gardening) | `Operations` | Approves requests, interviews, distribution & entry permit, approvals |
| General manager | `GeneralManager` | Approves requests, candidate names, start approval (last) |
| Temporary labor section | `LaborSection` | Owns worker file, onboarding, passport, leaves, penalties, terminations |
| Temporary labor section manager | `LaborManager` | Penalty decisions |
| Human resources | `HumanResources` | Salary approval, start approval, owns permission matrix |
| Entry registrar | `EntryRegistrar` | Registers workers, issues employee number |
| Payroll & attendance | `Payroll` | Confirms notices, receives attendance sheets |
| Finance | `Finance` | Settlement |
| Worker | `Worker` | Does **not** use the system in this phase |

Roles are **dynamic** in the backend (`/roles`, `/roles/permissions`, `/users/{id}/roles`) with a permission catalogue, plus **user scopes** by track or work site (`/labor-settings/user-scopes`). The current user's `roles`, `permissions` and `isSuperAdmin` come from `GET /auth/me`.

The backend also returns per-record capability flags (`canDecide`, `canExecute`, `canManage`, `parties[]` with `refusal` reasons …). The frontend drives action visibility from these flags — the backend remains authoritative.

## 3. Modules (SRS §4) and user journeys (§3)

| Module | SRS FRs | Journey | Backend tag |
|---|---|---|---|
| M01 Staffing requests | FR-01..04 | UJ-01/02 | طلبات الاحتياج |
| M02 Candidates & interviews | FR-05..09 | UJ-02 | المرشحون |
| M03 Registration, distribution, entry permits | FR-10..14 | UJ-03 | تسجيل العمال، أذونات الدخول |
| M04 Onboarding, documents, security survey | FR-15..20 | UJ-04 | إجراءات المباشرة، الإيقاف |
| M05 Start approval & salary | FR-21..23 | UJ-05 | اعتماد المباشرة، المرتبات، إشعارات الرواتب |
| M06 Passport custody | FR-24..25 | UJ-04/07/10 | إجراءات المباشرة، الإجازات، إنهاء الخدمة |
| M07 Attendance & absence | FR-26..30 | UJ-06 | الحضور |
| M08 Leaves | FR-31..35 | UJ-07 | الإجازات |
| M09 Penalties | FR-36..38 | UJ-06 | الجزاءات |
| M10 Transfers | FR-39..42 | UJ-08 | النقل |
| M11 Evaluation | FR-43..45 | UJ-09 | التقييمات |
| M12 Termination & settlement | FR-46..51 | UJ-10 | إنهاء الخدمة |
| M13 Replacement | FR-52..54 | UJ-10 | إنهاء الخدمة (replacement-decision / replacement-request) |
| M14 Tasks & alerts | FR-55..56 | all | المهام والتنبيهات |
| M15 Reports & search | FR-57..59, FR-69 | all | التقارير، العمال |
| M16 Administration & settings | FR-60..65 | all | المستخدمون، الأدوار، الأدلة، إعدادات النظام، إعدادات العمالة المؤقتة، سجل التدقيق، المرفقات، النماذج، النسخ الاحتياطي |
| M17 Integration & migration | FR-66..68 | — | التكامل، الترحيل، الحضور (device-records) |

## 4. Key workflows and rules enforced in UI (backend enforces too)

- **Staffing request**: sequential Operations → General Manager (FR-03); rejection needs reason (FR-04); replacement reason requires leaving worker (FR-02); request stays open until approved count reaches required count, manual close needs reason (FR-08).
- **Candidates**: only on `Approved` requests; interview result required before GM decision; GM approves all / excludes some / rejects (`DecideCandidatesRequest`).
- **Registration**: approved candidates appear in the registration queue for the user's track; bulk registration (≥100); duplicate passport → warning + `confirmDuplicates`.
- **Distribution & permit**: only sites of the worker's track; one valid permit per worker; printable TL-F11 PDF.
- **Onboarding**: supervisor start report → section opens start record (date differs → note) → checklist with due date (+7 days) → documents/passport/survey (restricted) → suspension possible.
- **Start approval**: ordered Section → HR → Operations → GM; return-for-correction restarts the chain (rounds).
- **Salary**: proposed by section, approved by HR, history kept.
- **Attendance**: monthly sheet per site, codes P/A/L/E (+Rest), absence incidents, threshold (default 5) → dismissal request, submit → review → payroll receipt → locked.
- **Leave**: Supervisor → Operations → Section, return for correction, travel → passport hand-over/return, return confirmation.
- **Penalty**: proposed by section, decided by section manager only, acknowledgement (scan / witness) before payroll, payroll applies after decision.
- **Transfer**: three approvals (order configurable), execution with new site + new permit, optional salary change → HR.
- **Evaluation**: due at start + 90 days, all criteria rated, section review → file / penalty / termination.
- **Termination**: Operations approval → execution (date, clearance items) → settlement (finance) → passport on exit → replacement decision → close.

## 5. Non-functional requirements relevant to frontend

- Arabic (RTL) and English (LTR) by user preference (FR-64, NFR-05/14) — backend stores language (`PUT /auth/me/language`).
- Mobile-friendly attendance entry (FR-26).
- Restricted data (security survey, passport) — backend decides visibility (`unreadable`, `isRestricted`, `salaryVisible`, `seesAmounts`).
- Reports exportable to Excel and PDF (FR-57) — backend generates files (`/reports/export`).
- Forms TL-F01..F11 printable in both languages (FR-65) — backend generates PDFs (`/forms/{code}/print`).
- Gregorian dates, local time (NFR-12).

## 6. Open points / unclear items (documented, not assumed)

| # | Issue | Impact / handling in frontend |
|---|---|---|
| U-01 | Permission code strings are not in the OpenAPI document (only `string[]`). | Navigation uses module-level permission prefixes defined in one file (`src/constants/permissions.ts`); unknown prefixes don't hide items. Every screen still handles `403` with a proper "no access" state. Codes must be confirmed from `GET /roles/permissions`. |
| U-02 | Directory slugs for `/directories/{slug}` are not enumerated in the spec. | Directories screen reads slugs from `src/constants/directories.ts` and also accepts any slug in the URL. Slugs must be confirmed. |
| U-03 | `LaborActionItem.link` / notification `link` format is not specified. | Task items are routed by `kind` to frontend routes; raw links that start with `/` are used as fallback. |
| U-04 | Accepted values of `language` in `SetPreferredLanguageRequest` are not specified. | Frontend sends `ar` / `en`. |
| U-05 | Settings `valueType` values are free strings. | Rendered as number / boolean / text based on common names (`Int32`, `Boolean`, …), text otherwise. |
| U-06 | `GET /audit/{id}` has no response schema. | Rendered as formatted JSON. |
| U-07 | CORS policy for browser origins unknown. | Vite dev proxy forwards `/api` to the backend; production base URL is configurable. |
| U-08 | Odoo (OP-12), fingerprint (OP-13) and migration source (OP-11) still open in SRS. | Frontend exposes the existing integration/migration endpoints only. |
| U-09 | Dashboards/KPIs are out of scope (SRS §1, FR-69). | Home page is the task inbox ("مهامي"), not a KPI dashboard. |
| U-10 | `GET /forms/{code}/print?recordId=` — the meaning of `recordId` per form is not documented. | Print buttons pass: F01 request number, F04 employee id, F05 leave id, F06 sheet id, F07 penalty id, F08 transfer id, F09 evaluation id, F10 termination id. Must be confirmed. |
| U-11 | `POST /staffing-requests` returns `IdResponse`; whether `id` is the request **number** used by `/staffing-requests/{number}` is not stated. | After submitting, the user is returned to the list (no direct navigation by id). |
| U-12 | The OpenAPI document emits nullable strings without a `type` and numbers as `integer\|string`. | `scripts/normalize-openapi.mjs` normalises the document before type generation; the original file is kept unchanged. |
| U-13 | Accepted file types/sizes for scans are configurable server-side (FR-63) but not exposed. | File inputs accept PDF and images; the server validates size and type. |
| U-14 | Sorting parameters exist only for workers (`Sort`). | Grid column sorting is disabled; server order is shown. |
