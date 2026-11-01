# Codebase Audit — Qoot Temporary Labor Web

Date: 2026-11-01 · Scope: full `src/`, build config, dependencies · No code was changed before this audit.

## 1. Baseline check results

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` (`tsc -b --noEmit`, `strict`) | ✅ 0 errors |
| ESLint | `npm run lint` (typescript-eslint + react-hooks) | ✅ 0 errors / 0 warnings — but 2 `eslint-disable react-hooks/exhaustive-deps` suppressions |
| i18n keys | `npm run i18n:check` | ✅ 818 static keys used, 1189 per locale, AR/EN in sync |
| Tests | — | ⚠️ No test runner or tests exist in the project |
| Production build | `npm run build` | ✅ builds; 82 JS chunks |
| React Doctor | `npx react-doctor@latest --verbose` | **36 warnings** (15 bugs · 14 performance · 7 maintainability). Score API unreachable from the sandbox, so issue counts are used for comparison |

### React Doctor — initial findings

| Rule | Count | Files |
|---|---|---|
| `no-array-index-as-key` | 13 | InfoGrid, PageHeader ×2, FormDialog, ApprovalRounds, AttendanceSheetPage, EvaluationCreatePage, LeaveDetailsPage, OnboardingCards, ReportsPage, TasksPage, TerminationDetailsPage, WorkerProfilePage |
| `js-set-map-lookups` | 9 | PartyDecision ×4, permissions.ts, UserDetailsPage, RegistrationPage, CandidatesPanel ×2 |
| `no-high-complexity-react-function` | 5 | AttendanceSheetPage, OnboardingCards ×2, RegistrationPage, TerminationDetailsPage |
| `js-hoist-intl` | 3 | AttendanceSheetsPage, utils/format.ts ×2 |
| `rerender-lazy-state-init` | 2 | EvaluationCreatePage |
| `no-reset-all-state-on-prop-change` | 1 | FormDialog |
| `no-adjust-state-on-prop-change` | 1 | FormDialog |
| `duplicate-jsx-subtree` | 1 | OnboardingCards |
| `no-giant-component` | 1 | TerminationDetailsPage |

## 2. Architecture overview (what is already good)

- **Structure**: feature-sliced (`src/features/<module>/{api.ts, *Page.tsx}`), shared `components/{common,forms,tables,layout,workflow}`, `hooks/`, `services/api/`, `constants/`. Clear and consistent — no restructuring needed.
- **Routing**: `createBrowserRouter` with every page lazily loaded through `lazyPage()` (route-level code splitting already in place), `RequireAuth` guard, `errorElement` per branch, 404 route.
- **Data**: TanStack Query for all server state, query-key factories per feature, `useApiMutation` wrapper for invalidation/toasts/ProblemDetails, `keepPreviousData` on lists, sensible retry policy (no retry on 4xx).
- **API client**: axios instance with typed helpers, single-flight token refresh, session-expired event, `Accept-Language` header, OpenAPI-generated types.
- **Forms**: react-hook-form + zod; config-driven `FormDialog` for workflow actions; server field errors mapped back to inputs.
- **i18n / RTL**: i18next AR/EN, Emotion RTL cache, MUI + DataGrid locale packs, `dir`/`lang` synced on `<html>`.
- **MUI**: central theme with brand tokens; icons imported per-file (tree-shakeable).
- **TypeScript**: `strict`, `noUnusedLocals/Parameters`, no `any`.

## 3. Critical / high issues

| # | Area | Issue | Evidence | Impact |
|---|---|---|---|---|
| C1 | Bundle | **DataGrid (347 kB / 105 kB gz) is preloaded on every page, including Login.** `theme.ts` imports `@mui/x-data-grid/locales` at runtime and `manualChunks` forces all of `@mui/x-data-grid` into one chunk, so the entry imports that whole chunk. | `dist/index.html` modulepreloads `grid-*.js` | ~40% of initial JS is a component the login page and task inbox never render |
| C2 | Bundle | `manualChunks.data` forces **zod, react-hook-form, @hookform/resolvers** into the entry vendor chunk (248 kB). They are only used by form pages/dialogs. | `vite.config.ts` | Extra initial JS on every page |
| C3 | Bundle | **Both locale files (AR 67 kB + EN 53 kB raw) are bundled in the entry chunk**; only one language is active at a time. | `i18n/index.ts` static imports | ~53 kB raw of unused strings for every user |
| C4 | Network | **Free-text list filters fire one API request per keystroke** (and rewrite the URL each keystroke). Only Workers debounces. | 13 list pages: `onChange={(e) => list.setFilter('Search', e.target.value)}` | Request storms, server load, flicker |
| C5 | Rendering | **Attendance month grid re-renders every cell on each click** — ≈ workers × 31 cells, each `Box` with its own `sx` object (new Emotion class resolution per cell per render). Clicking a cell with 100 workers re-renders ~3,100 styled boxes. | `AttendanceSheetPage.tsx` `MonthView` | Visible input lag on large sites; also the main mobile/desktop attendance entry screen |
| C6 | Rendering | **Every `ActionFormButton` keeps a closed `FormDialog` that still runs `useForm`, builds a zod schema and default values on every parent render**; `useMemo` deps (`visible`) are new arrays each render, so memoization never hits. Reset relies on `useEffect` + eslint suppression. | `FormDialog.tsx` L176-182, React Doctor ×2 | Detail pages with 5–15 action buttons do 5–15× wasted form work per render; suppressed hook rule |

## 4. Medium issues

| # | Area | Issue | Location |
|---|---|---|---|
| M1 | Rendering | DataGrid `columns` arrays defined inline / recreated each render on ~25 grids. MUI recommends stable column references; the grid re-processes column state on every parent render (e.g. each filter change, query refetch). | most `*ListPage.tsx`, admin pages |
| M2 | Rendering | `noRowsOverlay: () => <EmptyState/>` is an inline component type → remounted each render. | `ServerDataGrid.tsx`, `ReportsPage.tsx` |
| M3 | Perf | `Intl.DateTimeFormat`/`NumberFormat` constructed on **every call**; called per cell in grids. | `utils/format.ts`, `AttendanceSheetsPage.tsx` |
| M4 | Effects | Data fetch inside `useEffect` instead of the query cache (no dedup/cache, manual `alive` flag). | `components/forms/usePrefilledWorker.ts` |
| M5 | Effects | Effect used to react to an event (clear site when worker changes). | `transfers/TransferForm.tsx` |
| M6 | State | Expensive initial value computed every render (`useState(Object.fromEntries(...))`). | `EvaluationCreatePage.tsx` |
| M7 | Hooks | `useListState` returns new callbacks every render and suppresses `exhaustive-deps`. | `hooks/useListState.ts` |
| M8 | Lookups | `array.includes` inside loops (selection checks, permission checks). Small N today, cheap to fix with `Set`. | PartyDecision, permissions, CandidatesPanel, RegistrationPage, UserDetailsPage |
| M9 | Theme bug | Global `MuiListItemButton` override sets **selected text to white** for every `ListItemButton` in the app. Only correct on the dark sidebar; on white surfaces selected items become unreadable. | `theme.ts` |
| M10 | Brand | Brand colors exist in `theme.ts`, but ~20 hard-coded greys/whites (`#FAFAF7`, `#F6F7F4`, `#F2F3EF`, `#F4F4F1`, `#B7C2BF`, `rgba(255,240,218,…)`, `rgba(155,224,94,…)`) bypass the tokens, so the Qoot cream (`#FFF0DA`) never actually reaches the UI surfaces. | AppLayout, States, ApprovalRounds, AttendanceSheetPage, Audit/Integration/TempPassword, Tasks, Notifications |

## 5. Low issues / maintainability

- **Array index keys** (13): all are read-only, non-reorderable server lists, so they are not causing bugs today. Fix where a natural key exists (date, label, message); document the rest.
- **Large components**: `OnboardingCards.tsx` (29.6 kB), `TerminationDetailsPage.tsx` (25 kB), `AttendanceSheetPage.tsx`, `WorkerProfilePage.tsx`, `RegistrationPage.tsx`. Complex but cohesive (one workflow each). Splitting is a refactor with behaviour risk and no user-facing gain; recommended only incrementally.
- **`as unknown as Q<...>` casts** (17): list params are cast from URL state to OpenAPI query types. Unsafe-ish but deliberate (URL values are strings). Kept; documented.
- **Duplicated list-page skeleton** (PageHeader + FilterBar + ServerDataGrid + useListState) — acceptable, already factored into shared components.
- **No automated tests.** Recommend Vitest + Testing Library for `useListState`, `FormDialog`, `client.ts` refresh flow.

## 6. Accessibility

| Issue | Location |
|---|---|
| Attendance month cells are clickable `<td>`s with no role, no keyboard support, not focusable — month editing is mouse-only. | `AttendanceSheetPage.tsx` |
| Good: skip link, `aria-label` on all IconButtons, `role="search"`, `role="status"` on loaders, nav landmark, breadcrumbs labelled. | — |
| Selected-item contrast bug (M9). | `theme.ts` |

## 7. Dependencies

| Package | Used? | Note |
|---|---|---|
| `@emotion/styled` | not imported directly | **Required peer of `@mui/material`** — keep |
| `@emotion/cache`, `stylis`, `stylis-plugin-rtl` | yes (RTL cache) | keep |
| `zod`, `react-hook-form`, `@hookform/resolvers` | yes (8–10 files) | keep; move out of the entry chunk |
| `axios` | yes | keep |
| `@types/node` | vite config | keep (dev) |
| All others | used | — |

No unused or duplicate runtime dependencies were found.

## 8. Bundle snapshot (before)

Initial load (entry + modulepreloads) for **any** route, including `/login`:

| Chunk | Raw | Gzip |
|---|---|---|
| `index` (app + both locales) | 146.4 kB | 54.9 kB |
| `react` | 207.0 kB | 67.5 kB |
| `data` (query, axios, zod, RHF, i18next) | 248.0 kB | 76.3 kB |
| `mui` | 410.2 kB | 121.7 kB |
| `grid` (x-data-grid) | 346.8 kB | 105.3 kB |
| **Total** | **1,358 kB** | **≈ 426 kB** |

## 9. Recommended improvements (priority order)

1. Stop preloading DataGrid (move grid locale to the grid wrapper; let Rollup split grid/forms naturally).
2. Lazy-load the inactive locale (keep Arabic — the default and fallback — static).
3. Debounced search field for list filters.
4. Attendance month grid: memoized rows, shared CSS instead of per-cell `sx`, keyboard support.
5. FormDialog: mount form state only while open; remove reset effect + suppression.
6. Stable DataGrid columns (`useMemo`), stable `noRowsOverlay` slot.
7. Cached `Intl` formatters.
8. Effects → query/event handlers (`usePrefilledWorker`, `TransferForm`); lazy state init.
9. Apply Qoot identity colors through theme tokens (cream surfaces, leaf accents) and fix the selected-item contrast bug.
10. Add a test runner (out of scope for this pass — recommended).
