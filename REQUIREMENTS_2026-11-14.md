# Requirements pass — 2026-11-14 (TL-N14, TL-N15, audit range/sort/export)

Source: `frontend-guide 3.md` (§1–§14, re-checked) + the live API. The live contract had moved on after the guide:
these changes are read from `/openapi/v1.json` and its descriptions, not from the guide.

## Contract

- `openapi/openapi.json` patched to the live document (170 paths, 200 operations, 360 schemas). Its canonical SHA-256
  equals the live one (`fa1936ce…a6cd`). The sandbox cannot reach the API, so the diff was taken in the browser: hashes
  per operation and schema, then the changed items copied and checked one by one.
- `src/types/api.generated.ts` regenerated (`npm run gen:api`).
- Removed: `POST /candidates/decisions`, `DecideCandidatesRequest`, `RequestCandidates.canDecide`,
  `RequestCandidateItem.decisionRefusal`, `StaffingRequestDetails.canDecideAsGeneralManager`,
  `PendingGeneralManager` (request and candidate statuses), `CandidateApproval` (task kind), and `issuedOn` / `expiresOn`
  on `POST /workers/{id}/documents`.
- Added: `POST /workers/{id}/health-certificates`, `GET /audit/export`, `AuditSort`, audit `FromTime` / `ToTime` / `Sort`,
  `OnboardingRecord.passportIssueDate` / `passportExpiryDate` / `hasPassportCopy`.

## Decisions implemented

| Id | What | Where |
|---|---|---|
| TL-N15 | No General Manager step on staffing requests or candidates. A request has one decision, by Operations. Accepting a candidate in the interview approves him for registration, and the interview dialog says so. The GM decision dialog, button and API call are removed. The "GM decision (earlier)" column appears only when a nomination still carries one. The onboarding salary shows that it is decided with the final start approval | `staffing/StaffingDetailsPage.tsx`, `staffing/CandidatesPanel.tsx`, `staffing/api.ts`, `candidates/CandidateDetailsPage.tsx`, `onboarding/OnboardingCards.tsx` (SalaryCard), `tasks/links.ts`, `constants/enums.ts` |
| TL-N14 | The onboarding record shows the passport dates and whether a passport copy is on file. Passport custody reads them from the record, which drops a separate worker-file request. The scan is required only when no copy is on file (non-Libyan), and a recorded number is not asked for again. A health certificate received in the checklist goes to `POST /workers/{id}/health-certificates`; other documents go out without dates. The worker file has a "Renew health certificate" action | `onboarding/OnboardingCards.tsx`, `workers/healthCertificate.ts`, `workers/api.ts`, `workers/WorkerProfilePage.tsx`, `constants/permissions.ts` |
| Audit | `FromTime` / `ToTime` fields (shown and sent only with their day; clearing the day clears the hour), a `Sort` select (Newest by default) and an "Export Excel" button that sends the same filters without paging | `admin/audit/AuditPage.tsx`, `admin/audit/auditParams.ts`, `admin/api.ts`, `components/tables/{filters.ts,FilterPanel.tsx,SearchField.tsx}` (new `time` filter kind; `clears` works for every kind) |

## React best practices (Vercel) applied

- The passport-custody dialog no longer waits on a second request (`GET /workers/{id}`) for data the record already holds.
- The request's candidate grid is its own component, with columns memoized on the flags they read. The always-mounted
  GM dialog is gone.
- Row actions (record interview / cancel nomination) moved next to the status. They had been the last column of a grid that
  scrolls sideways at desktop widths, so they were off-screen.
- `index.html` applies the saved language's `dir` / `lang` before first paint. An English session no longer flashes
  right-to-left (`LANG_KEY` is shared and commented in `i18n/index.ts`).
- Non-component helpers kept out of component files (`auditParams.ts`, `healthCertificate.ts`), so the
  react-refresh rule still holds.

## Verification

`npm run check` (typecheck, ESLint 0 warnings, i18n 1060 keys used / 1506 per locale, **179 tests in 32 files**) and
`npm run build` are green. New tests: `auditParams.test.ts`, `healthCertificate.test.ts`, `OnboardingCards.test.tsx`
(certificate endpoint, documents without dates, passport with or without a copy), a TL-N15 case in
`CandidatesPanel.test.tsx`, and a date → hour dependency case in `FilterPanel.test.tsx`.

Chromium run of the built app on a mocked API (Arabic RTL, 1360 px): 14/14 checks passed, no page errors. Covered:
audit query and export params, Operations-only decision, no GM button, historic GM column, interview note, multipart
certificate post, passport dialog, no extra worker request, English LTR before first paint.

## Open points

- The permission of `POST /workers/{id}/health-certificates` is not published. The worker-file button is offered to
  `TemporaryLabor.ManageOnboarding` holders on an open file, and the API stays the judge. Confirm the code with the
  backend.
- Libyan workers: the passport scan stays optional in the custody dialog; the API decides.
- `StaffingRequestDetails.unregisteredCandidates` still mentions the General Manager in its description (backend text
  only).
- The live API was reached only through the browser on the user's machine. Re-run the hash comparison after each
  backend deploy.
