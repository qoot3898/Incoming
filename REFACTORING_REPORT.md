# Refactoring Report

Guidelines: Vercel `react-best-practices` (SPA-relevant rules: bundle, re-render, rendering, client data, JS hot paths) + React Doctor findings. Constraints respected: no API/endpoint/contract change, no business-logic change, no route change, MUI kept, no runtime dependency added, no warnings suppressed.

## 1. Qoot identity colors (brand guide)

Brand colors from the identity PDF: **#004949** teal · **#FFF0DA** cream · **#9BE05E** leaf.

| Change | Files |
|---|---|
| New `app/theme/brand.ts`: the three identity colors plus tones derived from them (cream canvas `#FFF9F0`, cream surfaces/lines, leaf soft, teal soft) and `onTeal` tokens for text on the dark sidebar/login panel. | `brand.ts` |
| Theme uses the tokens: primary = teal, secondary = leaf (contrast text teal), cream app background, warm lines/inputs, cream table/grid headers, cream row hover, leaf progress track, teal focus outline. | `theme.ts` |
| ~20 hard-coded greys/rgba values replaced with tokens (sidebar text/dividers/hover/selection, search field, empty-state icon, approval notes, code/pre blocks, temp-password box, unread notifications, attendance grid headers/disabled cells, status "primary" chip). | AppLayout, LoginPage, States, ApprovalRounds, NotificationsMenu, StatusChip, AuditPage, IntegrationPage, TempPasswordDialog, TasksPage, AttendanceSheetPage |
| **Bug fix:** the global `MuiListItemButton` override made *every* selected list item white text. On white surfaces (Labor settings → track list) the selected item was unreadable. Global style is now teal-on-leaf; the dark sidebar overrides it locally. | `theme.ts`, `AppLayout.tsx` |

Semantic status colors (success/warning/error/info chips, attendance code colors) were kept — they carry meaning and are not brand colors. Layout, spacing, typography and components are unchanged.

## 2. Components & hooks refactored

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

## 3. Behaviour preserved — notes

- **Search filters** now update the URL/request 350 ms after typing stops (Workers already behaved this way). Reset, back/forward and shared URLs still populate the field.
- **Worker prefill**: if the user picks a worker before the prefill lookup returns, the user's pick is kept (before, the late prefill could overwrite it).
- **FormDialog**: every opening shows the configured defaults — same as before (before it reset on open via an effect).
- **Attendance month view**: same codes, colors, cycle order, change outline, today highlight, sticky header/name column; added keyboard support.
- No endpoint, payload, query key, permission check or route changed.

## 4. Dependencies

- Added: `react-doctor` (devDependency, from `npx react-doctor install`) and `"doctor": "npx react-doctor@latest"` script. The installer also created `.github/workflows/react-doctor.yml` (CI audit on PRs).
- The Vercel agent skills were installed with `npx skills add vercel-labs/agent-skills` in the working copy; the skill files (`.agents/`, `.claude/skills/`, `skills-lock.json`, ~300 files) were **not** copied into the repo — run the same command locally if you want them committed.
- Removed: none.

## 5. Left as-is (with reason)

| Item | Reason |
|---|---|
| High-complexity components (OnboardingCards, TerminationDetailsPage, RegistrationPage, AttendanceSheetPage `SheetView`) | Each is one cohesive workflow; splitting is a behaviour-risky refactor with no user-visible gain. Recommend extracting one card per PR with tests first. |
| 4 index keys on server lists without ids | Append-only, read-only lists; no stable key exists in the API. |
| `as unknown as Q<...>` casts on list params (17) | URL state is string-typed; the cast is the boundary to the OpenAPI types. Changing it means typed URL parsing per page. |
| Inline `columns` in detail/admin pages with multiple grids (Integration, Permits, LaborSettings, Directories, Backups, WorkerProfile, Registration, CandidatesPanel, Evaluations, DeviceDifferences) | Small local grids that rarely re-render; can follow the same `useMemo` recipe later. |
| No tests | No test runner exists; recommend Vitest + Testing Library (useListState, FormDialog, SearchField, token refresh). |
