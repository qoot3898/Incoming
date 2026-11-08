# Refactoring Report

- **Phase 2 — State management & UI/UX (2026-11-08)** — this section.
- Phase 1 — React best-practices & performance pass (2026-11-01) — kept below.

Companion documents: `STATE_MANAGEMENT_AUDIT.md` (what was wrong), `STATE_MANAGEMENT_ARCHITECTURE.md` (ownership rules), `UI_UX_IMPROVEMENTS.md` (visible changes).

Constraints respected: no API contract, endpoint, route or business-rule change; visual identity kept; no runtime dependency added; no lint rule suppressed in new code; work done feature by feature with typecheck after each step.

## Phase 2 summary

| Area | Result |
|---|---|
| URL state | Back/Forward now restore filters (was: Back left the page). Canonical URLs, validated `page`/`size`, resets keep the tab, tabs in the URL on 4 more pages. |
| Search & filters | 17 list views on one `FilterPanel`: debounced text/number/date inputs, active-filter chips, Clear all, dependent filters, filtered empty state, retry. |
| Server state | Consistent query-key factories, request cancellation via `AbortSignal`, one optimistic update (notifications), no server data mirrored into form state. |
| Files | Reusable `FileInput` (validation, preview, replace/remove, drag & drop), upload progress + cancel, object URLs revoked, duplicate submit blocked. |
| Forms | Shared RHF field/section/action components, server-error mapping with field renames, worker required message, unsaved-changes guard, Evaluation form moved to RHF. |
| Layout | Layout tokens, `PageContainer`, sidebar with fixed header/footer, collapsible rail, active item kept visible, nested-item support, RTL/LTR verified, 0 px horizontal overflow on phone/tablet checks. |
| Quality | Vitest + Testing Library added — **31 tests**; React Doctor **11 → 7** warnings (remaining: pre-existing large workflow components). |

## 1. What was wrong → what changed → why it is better

| # | Problem (see audit) | Change | Why it is better |
|---|---|---|---|
| U1 | Filter changes replaced history; Back left the page. | `useListState` pushes one entry per user change; no-op writes skipped. | Back/Forward walk filter states; shareable, refresh-safe. |
| U2 | Reset wiped the tab too. | `reset(keys?)`, `clearFilter(key)`; `FilterPanel` resets only its filters. | Clearing filters keeps the view. |
| U3/U4 | Defaults in URL; unvalidated `page`/`size`. | `applyPatch` drops defaults/empties; `parsePage`, `parsePageSize` ∈ {10,25,50,100}. | Canonical URLs = one cache entry per state; bounded requests. |
| U5 | Tabs not in URL / replaced history. | `useTabParam` on Integration, Entry permits, Labor settings, Worker profile. | Tabs shareable, Back works. |
| U6 | Hidden "Result" filter still applied on *Due* tab. | `hidden` filter defs + tab switch clears it. | No invisible filtering. |
| U7 | Grid's out-of-range correction would trap Back. | Correction uses `replace`. | Back never loops. |
| F1 | Per-keystroke requests for dates/numbers. | All text-like filters go through `SearchField` (debounce, Enter commits, clear button). | One request & history entry per search. |
| F2/F3/F4 | No active-filter display; generic empty state; no retry. | Chips + count + Clear all; "No results" overlay with Clear all; `onRetry`. | Users see and undo what limits the list. |
| F5/F6 | Ad-hoc keys; no cancellation. | `xKeys.list/due/sheets/incidents`, `adminKeys.userList/auditList/integrationList`; list APIs take `signal`. | Predictable invalidation; superseded requests aborted. |
| F7 | Scope search in local state. | `useListState` + `FilterPanel`. | Same behaviour as every list. |
| D1–D3 | No validation/progress/cancel/preview. | `utils/files.ts`, `useObjectUrl`, `FileInput`, `FormDialog` progress + Cancel upload, `api.postForm(url, values, transfer)`. | Bad files rejected before upload; long uploads visible and cancellable; no leaked object URLs. |
| D4 | CSV re-pick ignored; stale report. | `FileInput` resets the input; report cleared on new file. | Correct re-imports. |
| D5 | Raw 404 on expired files; no busy state. | Friendly `files.missing` message; spinners; re-entry guard. | Clear feedback. |
| D6/R* | Double submit; dropped server errors; silent required worker; `navigate(-1)`; effect-seeded penalty form; Evaluation outside RHF. | In-flight guard; `useFormServerError` + `applyServerErrors`; `useWorkerField`; explicit cancel routes; draft-loaded-first `PenaltyForm`; Evaluation on RHF + Zod. | One validation path, no lost messages, predictable navigation. |
| R6 | Lost input on navigation. | `UnsavedChangesGuard` (router blocker + `beforeunload`) on create forms. | Entered data preserved unless the user confirms. |
| R8 | Incident → termination didn't prefill the worker. | Link now also passes `employeeNumber`. | Shortcut works as intended. |
| L2/L3 | No collapsed state/footer; mobile drawer mounted first on desktop. | New `Sidebar` (brand / nav / footer), collapsible rail, `noSsr` media query. | Stable shell, more room on desktop. |
| L4/L5 | Raw tables could overflow on phones; cramped dialogs. | `TableContainer` around 3 tables; `FormDialog` full-screen on phones. | No horizontal page scroll. |
| — | Index keys in 4 lists (React Doctor). | Content-based keys. | Stable reconciliation. |
| — | Notifications waited for the server. | Optimistic `markRead` with rollback. | Instant badge update. |

## 2. New reusable modules

| Module | Role |
|---|---|
| `hooks/useListState.ts` (rewritten) | URL-owned list state (push history, canonical params, validation, scoped reset). |
| `hooks/useTabParam.ts` | URL-owned tab. |
| `hooks/useObjectUrl.ts` | Preview URL with automatic revoke. |
| `components/tables/FilterPanel.tsx`, `filters.ts` | Config-driven filters + `isFiltered` / `clearFilters`. |
| `components/files/FileInput.tsx`, `useFileProblemText.ts`, `utils/files.ts` | File picking & validation. |
| `components/forms/FormLayout.tsx` | `FormCard`, `FormSection`, `FormGrid`, `FullRow`, `FormActions`, `FormErrorAlert`. |
| `components/forms/fields.tsx` | `FormTextField`, `FormSelectField` (RHF-bound). |
| `components/forms/useFormServerError.ts` | Server validation → fields + summary. |
| `components/forms/UnsavedChangesGuard.tsx` | Leave-page confirmation. |
| `components/layout/Sidebar.tsx`, `PageContainer.tsx`, `app/theme/layout.ts` | Shell & page layout. |

**Reused (not duplicated):** `PageHeader`, `SectionCard`, `ServerDataGrid`/`LocalDataGrid`, `LoadingState`/`EmptyState`/`ErrorState`/`QueryBoundary`, `ConfirmDialog`, `FormDialog`/`ActionFormButton`, `SelectField`, `WorkerPicker`, `usePrefilledWorker`, `useApiMutation`, `useScopeOptions`, brand tokens.

## 3. Files changed

- **List pages (17 views):** Workers, Staffing, Candidates, Leaves, Penalties, Terminations, Transfers, Onboarding, Payroll notices, Absence incidents, Attendance sheets, Evaluations (2 grids), Entry permits, Users, Audit, Integration (3 lists), Labor settings (scopes).
- **Forms:** StaffingCreate, LeaveCreate, PenaltyCreate, TransferForm/TransferCreate, TerminationCreate, EvaluationCreate, ChangePassword; FormDialog (all ~60 workflow dialogs benefit).
- **Uploads:** OnboardingCards (document, passport, survey), TerminationDetails (passport hand-over), PenaltyDetails (acknowledgement), WorkerProfile (attachments), Integration (2 CSV imports); FileButtons.
- **Shell:** AppLayout, Sidebar, NotificationsMenu, navigation types, SnackbarProvider, ConfirmDialog.
- **API layer:** `client.ts` (`TransferOptions`, `UploadVars`, `postForm` transfer), `errors.ts` (`cancelled`, `isApiError`, `applyServerErrors`), 14 feature `api.ts` key factories / signals.
- **i18n:** 40 new keys in `ar.json` and `en.json` (filters, files, forms, nav).

## 4. Dependencies

| Added (dev only) | Why |
|---|---|
| `vitest@2.1.9` | Test runner on the existing Vite config. |
| `jsdom@25.0.1` | DOM for component tests. |
| `@testing-library/react@16.3.0`, `@testing-library/dom@10.4.0` | Component tests by role/label. |

Runtime dependencies: **none added, none removed.** Zustand/Redux deliberately not added (see architecture §6).
New scripts: `npm test`, `npm run test:watch`; `npm run check` now also runs the tests. Config: `vitest.config.ts`, `src/test/setup.ts`, `src/test/renderWithRouter.tsx`; `tsconfig.node.json` includes `vitest.config.ts`.

## 5. Verification

| Check | Result |
|---|---|
| `tsc -b --noEmit` | ✔ 0 errors |
| `eslint .` | ✔ 0 errors, 0 warnings |
| `npm run i18n:check` | ✔ 853 keys used, 1229 per locale, AR/EN in sync |
| `vitest run` | ✔ 6 files, **31 tests** |
| `npm run build` | ✔ (index chunk 40.6 → 43.3 kB gzip: sidebar rail/footer; FormDialog chunk 2.5 → 4.9 kB gzip: file picker + progress; vendor chunks unchanged) |
| React Doctor (`--verbose`) | **11 → 7 warnings**, 0 errors (remaining: complexity of `TerminationDetailsPage.View`, `OnboardingCards` Survey/Notice cards, `AttendanceSheetPage.SheetView`, `RegistrationPage`, one duplicated JSX subtree — all pre-existing) |

**Automated tests added** (focused on state behaviour):

- `useListState`: defaults & typed parsing, invalid URL fallback, canonical writes + page reset, params without empties, one history entry per change + Back restores, no-op writes, scoped reset keeping `tab`, pagination/page size.
- `FilterPanel` / `SearchField`: chip labels, dependent chip removal, Clear all keeps tab, debounce commits once, Enter commits.
- `FileInput`: valid file, oversize & wrong type rejected, multiple files rejected, remove + object URL revoked, server vs local file.
- `FormDialog`: required validation, **single submission under repeated clicks**, server field errors next to fields with data kept, upload progress + cancel keeps dialog/data.
- `errors.ts`: ProblemDetails normalisation, cancellation flag, field mapping. `files.ts`: accept matching, validation, sizes.

**Browser verification** (Playwright, mocked API, Arabic and English):

- Typing "Ali" → exactly **1** request; URL `?Text=Ali`; status → `?Text=Ali&Status=Active`; Back → previous filters restored in inputs; Forward → re-applied; reload keeps filters and page size.
- Track change clears site in one entry; chip removal resets page; Clear all → clean URL; `?page=-3&size=999` → `Page=1&PageSize=25`; `?page=40` corrected to last page and Back does not loop.
- Sidebar: paper never scrolls, nav scrolls, brand/footer fixed after scrolling; collapsed width 72 px persisted after reload; tooltips in RTL open toward content; deep link to `/admin/backups` keeps the active item visible collapsed and expanded; exactly one active item; `/attendance/incidents` highlights *Absence incidents* only; content never under the sidebar.
- Phone & tablet: 0 px horizontal overflow on 5 representative pages; drawer closes after navigation; LTR sidebar on the left, RTL on the right.
- Staffing form: 6 required errors on empty submit; site disabled until track; unsaved-changes dialog on sidebar navigation — Cancel stays, Leave navigates.

Not verifiable in this environment: calls against the real backend (no network route from the sandbox; the API was mocked from the OpenAPI shapes) and real upload progress over a network. React Doctor's online score API was unreachable (counts above come from the local scan).

## 6. Remaining issues / follow-ups

1. Split the large workflow components flagged by React Doctor (`TerminationDetailsPage.View`, `OnboardingCards` Survey/Notice, `AttendanceSheetPage.SheetView`, `RegistrationPage`) — business-heavy, deliberately left untouched in a state/UI pass.
2. Server-side sorting exists only for workers (U-14). If the API adds `Sort` to other lists, map DataGrid `sortModel` to it in `ServerDataGrid` (URL key `sort`).
3. The accepted file size/types are configured server-side but not exposed (U-13). The client guard is 25 MB / PDF + images; read the real values from settings if the API publishes them.
4. Detail pages (`*DetailsPage`) still use their existing card layout; they already share `PageHeader`/`SectionCard`/`QueryBoundary`, so no change was needed for consistency, but they could adopt `PageContainer` when next edited.
5. Admin edit pages (Settings, Role details, Directories) keep their bespoke inline editors; they do not lose data and already show server errors, so they were not rewritten.
6. Run `npm install` locally to pick up the new dev dependencies, then `npm run check`.

---

## Phase 1 — React best-practices & performance pass (2026-11-01)

Guidelines: Vercel `react-best-practices` (SPA-relevant rules: bundle, re-render, rendering, client data, JS hot paths) + React Doctor findings. Constraints respected: no API/endpoint/contract change, no business-logic change, no route change, MUI kept, no runtime dependency added, no warnings suppressed.

### 1. Qoot identity colors (brand guide)

Brand colors from the identity PDF: **#004949** teal · **#FFF0DA** cream · **#9BE05E** leaf.

| Change | Files |
|---|---|
| New `app/theme/brand.ts`: the three identity colors plus tones derived from them (cream canvas `#FFF9F0`, cream surfaces/lines, leaf soft, teal soft) and `onTeal` tokens for text on the dark sidebar/login panel. | `brand.ts` |
| Theme uses the tokens: primary = teal, secondary = leaf (contrast text teal), cream app background, warm lines/inputs, cream table/grid headers, cream row hover, leaf progress track, teal focus outline. | `theme.ts` |
| ~20 hard-coded greys/rgba values replaced with tokens (sidebar text/dividers/hover/selection, search field, empty-state icon, approval notes, code/pre blocks, temp-password box, unread notifications, attendance grid headers/disabled cells, status "primary" chip). | AppLayout, LoginPage, States, ApprovalRounds, NotificationsMenu, StatusChip, AuditPage, IntegrationPage, TempPasswordDialog, TasksPage, AttendanceSheetPage |
| **Bug fix:** the global `MuiListItemButton` override made *every* selected list item white text. On white surfaces (Labor settings → track list) the selected item was unreadable. Global style is now teal-on-leaf; the dark sidebar overrides it locally. | `theme.ts`, `AppLayout.tsx` |

Semantic status colors (success/warning/error/info chips, attendance code colors) were kept — they carry meaning and are not brand colors. Layout, spacing, typography and components are unchanged.

### 2. Components & hooks refactored

| File | Change | Why |
|---|---|---|
| `components/forms/FormDialog.tsx` | Split into `FormDialog` (Dialog shell) + `FormDialogBody` (form). MUI only mounts the body while open, so each opening starts fresh. Removed the `useEffect(reset, [open])` + `eslint-disable`. Field list stays live (select options can arrive while open); defaults captured once per opening. Submitting state lifted to block closing mid-submit (unchanged behaviour). | React Doctor ×2; closed dialogs were doing full form work on every parent render |
| `features/attendance/AttendanceSheetPage.tsx` | Month grid: memoized `MonthRow` (custom comparator on the row's own changes), stable `setCode`, one table-level stylesheet instead of per-cell `sx`, editable cells are `role="button"` + `tabIndex=0` + Enter/Space. | Measured 526–889 ms → ~20 ms per click (120 workers); keyboard accessibility |
| `components/tables/SearchField.tsx` *(new)* | Debounced text filter (local state, commit after 350 ms; adopts external resets during render; latest callback via ref). Used on 14 list pages. | One request per search instead of per keystroke |
| `components/tables/ServerDataGrid.tsx`, `gridHooks.tsx` *(new)* | `useGridLocaleText()` (grid locale out of the global theme), `useEmptyOverlay()` stable slot, hoisted constant props (`pageSizeOptions`, `initialState`, row class getter). | Bundle (grid not preloaded); no overlay remounts |
| 13 list pages | DataGrid `columns` wrapped in `useMemo` with exact deps (lint-verified); mutation functions destructured so deps are stable. | MUI requires stable column references |
| `components/forms/usePrefilledWorker.ts` | `useEffect` fetch → `useQuery` (`select: summaryToItem`); user choice overrides prefill. | Query-cache dedup; no manual `alive` flag |
| `features/transfers/TransferForm.tsx` | "clear proposed site when worker changes" moved from an effect into the worker change handler. | Effect was reacting to an event |
| `features/evaluations/EvaluationCreatePage.tsx` | Lazy `useState` initializers. | Expensive init on every render |
| `hooks/useListState.ts` | Defaults captured once with `useState`; `eslint-disable` removed. | Honest hook deps |
| `utils/format.ts` | Cached `Intl.DateTimeFormat` / `NumberFormat` per locale+options; hoisted regex; exported `dateTimeFormat` (used by AttendanceSheetsPage). | Called once per grid cell |
| `constants/permissions.ts` | `Set` view of permissions cached per array (WeakMap). | Called for every nav item |
| PartyDecision, CandidatesPanel, RegistrationPage, UserDetailsPage | `Array.includes` in loops → `Set`. | React Doctor `js-set-map-lookups` |
| InfoGrid, PageHeader, TasksPage, TerminationDetailsPage, ReportsPage, FormDialog, EvaluationCreatePage | Index keys → natural keys (label, message, kind+link). | React Doctor |
| `i18n/index.ts`, `main.tsx` | English locale lazy-loaded (tiny i18next backend); render after `i18nReady`. | −14 kB gz initial |
| `app/theme/theme.ts`, `vite.config.ts` | Grid locale removed from theme; `forms` chunk. | See BUNDLE_ANALYSIS.md |

### 3. Behaviour preserved — notes

- **Search filters** now update the URL/request 350 ms after typing stops (Workers already behaved this way). Reset, back/forward and shared URLs still populate the field.
- **Worker prefill**: if the user picks a worker before the prefill lookup returns, the user's pick is kept (before, the late prefill could overwrite it).
- **FormDialog**: every opening shows the configured defaults — same as before (before it reset on open via an effect).
- **Attendance month view**: same codes, colors, cycle order, change outline, today highlight, sticky header/name column; added keyboard support.
- No endpoint, payload, query key, permission check or route changed.

### 4. Dependencies

- Added: `react-doctor` (devDependency, from `npx react-doctor install`) and `"doctor": "npx react-doctor@latest"` script. The installer also created `.github/workflows/react-doctor.yml` (CI audit on PRs).
- The Vercel agent skills were installed with `npx skills add vercel-labs/agent-skills` in the working copy; the skill files (`.agents/`, `.claude/skills/`, `skills-lock.json`, ~300 files) were **not** copied into the repo — run the same command locally if you want them committed.
- Removed: none.

### 5. Left as-is (with reason)

| Item | Reason |
|---|---|
| High-complexity components (OnboardingCards, TerminationDetailsPage, RegistrationPage, AttendanceSheetPage `SheetView`) | Each is one cohesive workflow; splitting is a behaviour-risky refactor with no user-visible gain. Recommend extracting one card per PR with tests first. |
| 4 index keys on server lists without ids | Append-only, read-only lists; no stable key exists in the API. |
| `as unknown as Q<...>` casts on list params (17) | URL state is string-typed; the cast is the boundary to the OpenAPI types. Changing it means typed URL parsing per page. |
| Inline `columns` in detail/admin pages with multiple grids (Integration, Permits, LaborSettings, Directories, Backups, WorkerProfile, Registration, CandidatesPanel, Evaluations, DeviceDifferences) | Small local grids that rarely re-render; can follow the same `useMemo` recipe later. |
| No tests | No test runner exists; recommend Vitest + Testing Library (useListState, FormDialog, SearchField, token refresh). |
