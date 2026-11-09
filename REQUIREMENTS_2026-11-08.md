# Requirements of 2026-11-08 — frontend implementation

Backend references: `frontend-guide.md`, `decisions.md` (TL-N1 … TL-N6) and `srs-conformance.md` from the API repository.
The OpenAPI contract in `openapi/openapi.json` was brought up to the live document (182 operations, 343 schemas;
every new or changed schema verified against the live one) and `src/types/api.generated.ts` regenerated.

## What changed, by decision

| Decision | Screens | Main files |
|---|---|---|
| **TL-N1 Complaints** | Public form `/complaint` (no sign-in, linked from the login page); `/complaints` (tabs New / Reviewed / All with the new count, search, submitted from/to); `/complaints/:id` (details with line breaks kept, one review with a note) | `features/complaints/*`, `publicHttp` in `services/api/client.ts` |
| **TL-N2 Worker entry** | Registration: phone optional; birth place and department required; Libyans need the national number; non-Libyans need a passport unless "No passport" is ticked (only when `canRegisterWithoutPassport`) with a reason ≤ 500. Worker file shows the waiver reason. Identity correction does not drop a foreigner's passport without the permission | `features/registration/registrationRow.ts` (rules, request, server-error mapping), `RegistrationRowEditor.tsx`, `RegistrationPage.tsx`, `WorkerProfilePage.tsx` |
| **TL-N3 Assignment letter** | After sign-in (and the password change) users without an approved letter only see `/assignment`: upload / replace a PDF, see the return reason, re-check the status (auto every 60 s while pending). Any `403 ASSIGNMENT_APPROVAL_REQUIRED` re-reads `auth/me`. Reviewers: `/admin/assignments` (tabs with counts, open the PDF, approve / return with a reason, `rowVersion` + 409 handling) | `features/authentication/assignment.ts`, `AssignmentPage.tsx`, `app/router/guards.tsx`, `AuthProvider.tsx`, `features/admin/assignments/AssignmentsPage.tsx` |
| **TL-N4 Document dates** | Passport issue/expiry and health-certificate issue date at registration; identity correction sends the recorded dates back and never blanks them; health-certificate receipt asks for issue + expiry dates (only for that kind); passport custody pre-fills recorded dates (read-only) or requires them | `registrationRow.ts`, `WorkerProfilePage.tsx`, `OnboardingCards.tsx` |
| **TL-N5 Penalties** | Proposal: "issued by" + "issue date" (≤ today). List: filters track (→ site), source, decision type, issued by, issue from/to, entered from/to, one worker (`?EmployeeId=`, chip) and the new columns. Decision: any active type of `labor-penalty-decisions`; days (1–31) appear only for a type that behaves as a deduction. Worker file: penalties tab. Directories: search, active filter, behaviour select, base types 1–3 never deleted and keep their behaviour, number fixed after creation, fresh entry read before editing | `features/penalties/*`, `decisionTypes.ts`, `features/admin/directories/DirectoriesPage.tsx`, `constants/directories.ts` |
| **TL-N6 User activity** | `/admin/audit`: actor, action codes (multi-select grouped by module), module, outcome, entity type + id, IP prefix, request id, period, "show old and new values"; quick views (sign-ins, failed sign-ins, access denied); entry dialog with user agent, request id and an old → new table per changed entity, plus jumps to the user's activity / the record's history / the same request. Links from user details ("User activity", "Account history") and penalty details ("History") | `features/admin/audit/*` |

New permissions (`constants/permissions.ts`): `TemporaryLabor.ManageComplaints`, `TemporaryLabor.RegisterWithoutPassport`,
`Users.ReviewAssignments`. Existing databases do not receive them automatically — the super administrator grants them
from the role matrix (`PUT /roles/{id}/permissions`).

## Shared building blocks added

- `FormDialog`: `visibleWhen` (conditional fields — not validated or sent while hidden), `validate` (cross-field rules shown under the fields) and `disabled` fields.
- `FilterPanel`: `multiselect` filter kind (`MultiSelectField`, one URL value joined with `,`).
- `ApiError.code` / `correlationId` (RFC 9457) and `API_ERROR_CODES`; `onAccessGate` event in the HTTP client.
- `StandaloneLayout` for pages outside the app shell (public complaint form, assignment gate).

## Verification

`npm run check` (typecheck, ESLint with 0 warnings, i18n check, 55 tests) and `npm run build` pass. New tests cover
the registration rules, the complaint phone rule, the assignment gate, audit change parsing and links, error codes,
the access-gate event and the new FormDialog options. The new screens were exercised in Chromium against a mocked API
(Arabic, desktop and 375 px phone: no horizontal overflow; the public complaint request carries no `Authorization` header).

## Open points

- The OpenAPI document gives no schema for `GET /audit/{id}`; the entry dialog reads `changes` from it when present and shows the raw JSON otherwise.
- Upload size limit (`TemporaryLabor.AttachmentMaxKilobytes`, default 5120 KB) is not exposed to users without settings access; the client keeps its 25 MB guard and shows the server's message.
- The base punishment types are recognised by number (1, 2, 3) as documented; if the API later flags them explicitly, `DIRECTORY_RULES` can read that flag instead.
- `LaborWorkerDetails` still has no marital status / birth place, so the identity dialog cannot pre-fill them (unchanged).
