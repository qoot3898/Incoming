# Requirements of 2026-11-12 — frontend implementation

Backend reference: `frontend-guide.md` §12 (TL-N11), §13 (TL-N12) and §14 (TL-N13).
The OpenAPI contract in `openapi/openapi.json` was brought up to the live document again (199 operations, 360 schemas; every operation and
schema compared with the live one by canonical hash, the patched file is identical on all of them; part of the difference against the previous
file is wording in descriptions only) and `src/types/api.generated.ts` regenerated. The earlier decisions are described in
`REQUIREMENTS_2026-11-08.md` and `REQUIREMENTS_2026-11-11.md`; this file covers what is new.

## What changed, by decision

| Decision | Screens | Main files |
|---|---|---|
| **TL-N11 The person who entered an action may approve it** | Nothing new to build: every decision button already follows the API (`canDecide`, `parties[].refusal`, `interviewRefusal`, `decisionRefusal`, `reviewRefusal`, `canApproveSettlement`…), so the screens open for the person who entered the action as soon as the API says so, and "one user cannot decide two steps of the same chain" stays the API's message shown as a hint. The one place that still encoded the old rule was the termination settlement: `settlementRefusal` was removed from the contract, so its hint is gone (`canApproveSettlement` is true for the one who recorded the settlement as well). A search of the code finds no comparison of the signed-in user with the person who entered a record | `features/terminations/TerminationSections.tsx`, `types/api.generated.ts` |
| **TL-N12 Transfer by an attached decision, and the fingerprint supervisor notice** | Transfer details: a card "Transfer decision" with the PDF (name, size, date), open / replace / delete shown only when `canChangeDecisionFile`, otherwise the hint from `decisionFileRefusal`. New transfer request: an optional PDF field; the request is submitted as JSON first and the PDF is attached right after, so a failed attachment never looks like a failed request (a warning is shown and the user lands on the new request to attach it again). Errors: `400 errors.File` stays in the dialog, `404` / `422` refresh the card, `409` asks to reload. The fingerprint-device supervisor gets no screen of his own: his notice (`GET /inbox/tasks` → `notifications`, link `transfers/{id}`) opens the request from the bell menu and the tasks page | `features/transfers/DecisionFileCard.tsx`, `TransferDetailsPage.tsx`, `TransferForm.tsx` (`withDecisionFile`), `TransferCreatePage.tsx`, `features/transfers/api.ts` (`attachDecisionFile`, `openDecisionFile`, `removeDecisionFile`), `features/tasks/links.ts` |
| **TL-N13 Candidates without a staffing request** | **Candidates** (`/candidates`) is now the candidate list: filters (search, list status, request status, candidate job, nationality, track, request number), the new columns (phone, candidate job, list status chip, nomination count, and the latest request's number, track, site, job and status), "Add candidate" for `ManageCandidates` holders. **Candidate card** (`/candidates/:candidateId`): data, attached copies (opened only by those who register workers), every nomination with its interview and decision; actions follow `canNominate` / `canEdit` / `canWithdraw` / `canRestore` (nominate on a request number, edit with `rowVersion`, withdraw with a reason, restore). **Request → Candidates tab**: "Nominate from list" (picker of available candidates filtered by the request's job, with the API's reason for every refused candidate) and "New candidate" (job defaults to the request's job); the name links to the card; cancelling is now "cancel nomination" and the candidate returns to the list; the panel says that interviews start only after the request is approved. **New staffing request**: an optional "Candidates" section for `ManageCandidates` holders: pick from the list (filtered by the chosen job) and/or add new candidates inline; sent as `candidateIds` / `newCandidates` in the same request, server errors (`errors.CandidateIds`, `errors["NewCandidates[i].Field"]`) shown under their rows. **Registration**: the candidate's phone is suggested as the worker's phone | `features/candidates/*` (`CandidatesListPage`, `CandidateDetailsPage`, `CandidatePoolPicker`, `candidateFields`, `candidateSearch`), `features/staffing/CandidatesPanel.tsx`, `NominateCandidatesDialog.tsx`, `StaffingCreatePage.tsx`, `requestCandidates.ts`, `features/staffing/api.ts` (`candidatesApi`, `candidatesKeys`), `features/registration/registrationRow.ts`, `constants/enums.ts` (`CandidatePoolStatus`), `StatusChip.tsx`, `app/router/index.tsx` |

## Permissions

`constants/permissions.ts` gained `TemporaryLabor.ManageCandidates` (add, edit, withdraw, restore and nominate candidates, and the candidates section of a new
request) and `TemporaryLabor.FingerprintNotices` (receives the transfer notices). Without `ManageCandidates` the list shows only what the API returns for the
user's scope and no add / nominate buttons or request-form section appear. Attaching a candidate's copies keeps following `RegisterWorkers`.
**Existing databases do not receive the new grants automatically:** the super administrator grants both permissions from `PUT /roles/{id}/permissions`
(or directly to a user), and the new default role `LaborFingerprintSupervisor` is created on the next run of the API; it only has to be given to the user.

## Shared building blocks added

- `useScopeOptions().jobIdByName(name)`: finds a job by the plain name a request carries (option labels read `5 — Cook`, so a label comparison never matches).
- `resolveLink` anchors the relative links the API sends (`transfers/7` → `/transfers/7`) and knows the `candidates` section; protocol-relative links are still rejected.
- `features/candidates/candidateFields.ts` (the form fields and limits shared by the list, the card and the request panel), `candidateSearch.ts` (debounced search of available candidates) and `CandidatePoolPicker` (multi-select with a job filter, keyed by the job so a new job resets it).
- `features/staffing/requestCandidates.ts`: building and error-mapping of `candidateIds` / `newCandidates` for the new-request form.
- `src/test/renderWithProviders.tsx`: query client, auth context (`can` computed from a permission list), snackbar and router for component tests.

## Verification

`npm run check` (typecheck, ESLint with 0 warnings, i18n check — 1056 keys used, 1503 per locale — and 157 tests in 27 files) and `npm run build` pass.
New tests cover the decision-file card (attach, replace, delete, refusal hint, 409 / 404 / 422), the transfer permissions and role, notification links,
the candidate picker, the candidate card (every action by flag, conflict on edit, withdraw reason), the new-request candidates section (body and server errors),
the request panel (nominate, new candidate, cancel nomination, messages before and after approval), the registration phone default and the job lookup.
The built app was exercised in Chromium against a mocked API (the live API is not reachable from the build environment; Arabic, 1360 px): the candidate list
and its chips, the add dialog, the card and its actions, the request's candidates tab and the nominate dialog, the new-request candidates section, the
transfer decision card (multipart `PUT` with the PDF, then delete), and a fingerprint notice with link `transfers/7` opened from the bell menu. 19 checks passed, no
page errors (the only failed request was the Google Fonts stylesheet, blocked there). That run found one defect the unit tests had hidden: the job filter of the nominate
dialog and the job of "New candidate" never took the request's job, because the code compared the option label with the plain job name; fixed with `jobIdByName` and a
test on the real hook with the real data shape. The new-request form was not submitted in the browser (its body is covered by `StaffingCreatePage.test.tsx`).
React Doctor was not run (it needs the user's checkout): run `npx react-doctor@latest --verbose > react-doctor.txt 2>&1` locally.

## Open points

- `GET /staffing-requests/{number}` carries `jobName` but no `jobId`, so the request's job is found by name (the first match if two jobs ever shared a name).
- A candidate's passport and health-certificate copies are still attached and deleted only from the registration screen (guide §14); the card lists them and opens them for `RegisterWorkers` holders.
- The decision-file size limit is not exposed; the file input keeps its 25 MB guard (PDF only) and the server's `errors.File` message is shown when the API refuses the file.
- The notification link format (`transfers/{id}`, no leading slash) is handled in `resolveLink`; links to sections the app does not know are ignored.
