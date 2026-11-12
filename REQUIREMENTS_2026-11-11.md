# Requirements of 2026-11-09 … 2026-11-11 — frontend implementation

Backend reference: `frontend-guide.md` (requirements of 2026-11-08 with the amendments of 2026-11-09 and 2026-11-11).
The OpenAPI contract in `openapi/openapi.json` was brought up to the live document again (191 operations, 351 schemas;
every operation and schema compared with the live one by canonical hash, the patched file is identical on all of them)
and `src/types/api.generated.ts` regenerated. The decisions TL-N1 … TL-N6 are described in
`REQUIREMENTS_2026-11-08.md`; this file covers what is new.

## What changed, by decision

| Decision | Screens | Main files |
|---|---|---|
| **TL-N7 Site capacity** | `/admin/site-capacities` (new menu item "Site capacities"): active sites with capacity, occupancy, free places, a state chip (no limit / available / full / over capacity +N), a flag for sites without coordinates, last change; change dialog (whole number 0–10000, empty = no limit, optional PDF decision, `rowVersion`; a concurrent change reloads the list and asks to reopen); history dialog (newest first, decision PDF opened through the restricted endpoint). Settings managers read, only `ManageSiteCapacity` changes and opens decisions. Coordinates: the `work-sites` directory shows `Latitude` / `Longitude` fields (Latin digits, ≤ 6 decimals, ranges, both or neither; Arabic digits and `٫` are normalised). `409 SITE_CAPACITY_EXCEEDED`: the message plus the proposed sites with the reason for each (needs N / free places / no limit / distance or unknown) in every form alert and dialog; where the form has a site field (new staffing request, transfer request, entry-permit dialog) a "Choose" button fills it; registration and the migration tab list the sites. The action is never retried automatically | `features/admin/site-capacities/*`, `features/admin/directories/coordinates.ts`, `components/common/SiteSuggestionsList.tsx`, `siteSuggestions.ts`, `FormErrorAlert` / `FormDialog` (`siteField`), `services/api/errors.ts` (`SiteSuggestion`, `parseSuggestions`), `api.putForm` |
| **TL-N8 Leaving workers** | New staffing request: a replacement picks one different leaving worker per requested place (`leavingEmployeeIds[]`, a counter "2 of 2", the picker stops offering workers once the count is reached, equality checked before sending); a need request sends none. Request details list every leaving worker (linked to the worker file). Server messages in `errors.LeavingEmployeeIds` appear under the picker | `components/forms/WorkersMultiPicker.tsx`, `useWorkerSearch.ts`, `WorkerOption.tsx`, `features/staffing/leavers.ts`, `StaffingCreatePage.tsx`, `StaffingDetailsPage.tsx` |
| **TL-N9 Direct permissions** | `/admin/users/:id/permissions` (button "Direct permissions" on the user file; history link to the audit log `User.PermissionsChanged`): permissions grouped by module, each with the roles that give it, a held / not-held chip, "denied despite role" / "granted directly" notes and an As role / Grant / Deny switch; the live result is previewed before saving, both complete lists are sent, unsaved changes are guarded. Read-only for a super admin, for one's own account and without `Users.ManagePermissions`. Granting a permission, or lifting its denial, is disabled when the editor does not hold it (`PERMISSION_NOT_HELD`; the API stays authoritative and its message is shown). A plain `403 FORBIDDEN` re-reads `auth/me` (at most once per 30 s) so menus and buttons follow a new denial without signing in again | `features/admin/users/UserPermissionsPage.tsx`, `permissionEffects.ts`, `AuthProvider.tsx`, `services/api/client.ts` (`onPermissionDenied`) |
| **TL-N10 Termination blocks** | Withdrawing the start report and closing a file "did not start" are refused with `422 BUSINESS_RULE_VIOLATED` while the worker has a termination request in progress; the withdraw confirmation now stays open and shows the message (it names the request) instead of a toast that disappears; the close dialog already shows it in its alert | `features/onboarding/OnboardingRecordPage.tsx`, `components/common/ConfirmDialog.tsx` (`error`) |

Also checked against the guide and the contract, nothing to change: penalty `issuedBy` / `issuedOn`, its filters (`EmployeeId`, `Source`, `IssuedBy`, `IssuedFrom/To`, `TrackId`) and the punishment-types directory;
every query parameter of every `GET` operation is referenced by a screen.

## Permissions

`constants/permissions.ts` gained `TemporaryLabor.ManageSiteCapacity` (no default role; the super admin holds it implicitly) and
`Users.ManagePermissions` (system administrator in new databases). **Existing databases do not receive them automatically:**
the super administrator grants `ManagePermissions` to the system-administrator role from `PUT /roles/{id}/permissions` (the role matrix),
and grants `ManageSiteCapacity` to a role or — once `ManagePermissions` is in place — to a user. Nobody but the super admin grants
a permission they do not hold. `RegisterWithoutPassport` was withdrawn on 2026-11-09 and the next run flags it obsolete.

## Shared building blocks added

- `ApiError.suggestions` and `API_ERROR_CODES.siteCapacityExceeded / selfPrivilegeChange / permissionNotHeld`.
- `SiteSuggestionsList` (list with reasons) shown by `FormErrorAlert` and therefore by every `FormDialog` / form; `FormDialog.siteField`.
- `api.putForm` (multipart PUT with progress and cancellation, like `postForm`).
- `WorkersMultiPicker`, `useWorkerSearch`, `WorkerOption` (the single `WorkerPicker` now shares them).
- `ConfirmDialog.error`; `utils/digits.ts` (`toAsciiDigits`, shared with the complaint phone rule).
- `scripts/check-i18n.mjs` also compares `{{placeholders}}` between languages and checks template-built key families.

## Verification

`npm run check` (typecheck, ESLint with 0 warnings, i18n check, 110 tests) and `npm run build` pass. New tests cover capacity rules and states,
coordinate rules, suggestion reasons and rendering, the capacity refusal inside `FormDialog` (message, reasons, picking a site), error parsing of
`suggestions`, multipart form building, the leaving-workers rule, the direct-permission logic and the permission-refusal event.
The new screens were exercised in Chromium against a mocked API (Arabic, 1360 px): the capacity list, change (multipart body `capacity` + `rowVersion`),
conflict and history; the permission matrix and its refusal; a replacement request with two leaving workers (body `leavingEmployeeIds: [418, 422]`),
the count check and a capacity refusal whose suggestion fills the site field. No page errors. React Doctor was not run (it needs the user's checkout):
run `npx react-doctor@latest --verbose > react-doctor.txt 2>&1` locally; the new components stay under the documented complexity and size limits.

## Open points

- The OpenAPI document still gives no schema for `GET /audit/{id}`, nor for the `suggestions` of the 409 problem (typed by hand in `errors.ts`).
- `ChangeSiteCapacity` is typed loosely in the contract (`capacity`, `rowVersion`, `file` are untyped), so `SiteCapacityChange` is declared by hand in `features/admin/api.ts`.
- The decision-file size limit (`TemporaryLabor.AttachmentMaxKilobytes`) is not exposed; the client keeps its 25 MB guard and shows the server's message.
- No flag on a worker or onboarding record says a termination request is in progress, so the withdraw and close-not-started buttons stay visible and the API's refusal is what the user reads.
