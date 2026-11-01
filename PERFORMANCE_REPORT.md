# Performance Report — before / after

## 1. React Doctor

| | Initial | Final |
|---|---|---|
| Total warnings | **36** | **11** |
| Bugs | 15 | 4 |
| Performance | 14 | **0** |
| Maintainability | 7 | 7 |
| Affected files | 19 | 7 |
| Errors | 0 | 0 |

(The numeric score could not be fetched — the sandbox cannot reach the React Doctor score API — so issue counts are compared. Raw JSON reports were taken with `--json` before and after.)

| Rule | Before | After | Notes |
|---|---|---|---|
| `no-array-index-as-key` | 13 | 4 | Remaining: passport movements (×2), worker timeline, approval steps — server items with no id; append-only, read-only lists, so index keys are correct here |
| `js-set-map-lookups` | 9 | 0 | |
| `js-hoist-intl` | 3 | 0 | |
| `rerender-lazy-state-init` | 2 | 0 | |
| `no-reset-all-state-on-prop-change` | 1 | 0 | FormDialog |
| `no-adjust-state-on-prop-change` | 1 | 0 | FormDialog |
| `no-high-complexity-react-function` | 5 | 5 | Left: large single-workflow pages; splitting = behaviour risk |
| `duplicate-jsx-subtree` | 1 | 1 | OnboardingCards |
| `no-giant-component` | 1 | 1 | TerminationDetailsPage |

No rule was disabled and no `eslint-disable` / React Doctor ignore was added. The two pre-existing `eslint-disable react-hooks/exhaustive-deps` suppressions were **removed** by fixing the code.

## 2. Measured interaction: attendance month grid

Playwright, production build, 120 workers × 30 days (≈3,600 cells), click a cell → next paint, 25 clicks, two runs each:

| | Median | p90 |
|---|---|---|
| Before | **526 – 889 ms** | 1,142 – 1,307 ms |
| After | **19 – 20 ms** | 25 – 27 ms |

≈ **30–45× faster**. Cause: every click re-rendered every cell, each a `Box` with its own `sx` object. Fix: memoized `MonthRow` with a comparator that only looks at that worker's pending changes, stable `setCode` (`useCallback`), and all cell styling moved to one table-level stylesheet (class names + an inline `style` for the code color).

## 3. Load performance

| | Before | After |
|---|---|---|
| Initial JS (any route) | 1,358 kB / ≈426 kB gz | 873 kB / ≈280 kB gz (−34% gz) |
| DataGrid on `/login` | downloaded | not downloaded |
| English strings for Arabic users | downloaded | not downloaded |

Details in `BUNDLE_ANALYSIS.md`.

## 4. Network

| | Before | After |
|---|---|---|
| Typing "ahmed" into a list's search box | 5 API requests + 5 URL rewrites | 1 request after 350 ms pause |
| Pages affected | 13 list pages (Workers already debounced) | all 14 use `SearchField` |
| Worker prefill (`?employeeNumber=`) | ad-hoc fetch in `useEffect`, no cache | TanStack Query (cached, deduped, cancel-safe) |

## 5. Render work removed

| Area | Before | After |
|---|---|---|
| Closed `ActionFormButton` dialogs | each ran `useForm`, built a zod schema and defaults on every parent render (memo deps were new arrays every time) | form state lives in a body mounted only while the dialog is open |
| DataGrid `columns` (13 list pages) | new array each render → grid re-processes columns | `useMemo` with correct deps |
| DataGrid empty overlay | new component type each render (remount) | memoized slot |
| Date / number formatting in grid cells | new `Intl` formatter per cell | cached per locale + options |
| Permission checks per nav item | `Array.includes` | `Set` (cached per permissions array) |

## 6. What was deliberately not done

- **Blanket `React.memo`/`useCallback`**: only applied where a hot path was found (attendance grid, columns).
- **Virtualization**: grids use server pagination (≤100 rows) and `autoHeight`; attendance month grid now fast at 120×30. Not needed.
- **`useTransition` / `useDeferredValue`**: no input was blocked by rendering after the fixes; debounce covers search.
- **React Compiler**: the project is on React 18; the compiler needs a Babel plugin + `react-compiler-runtime` for React 18. Benefit is unproven here and it would add build dependencies — recommend evaluating together with a React 19 upgrade.
- **New Suspense boundaries for data**: data loading uses TanStack Query's `isLoading` + `QueryBoundary`; adding `useSuspenseQuery` would change loading behaviour across all pages.

## 7. Verification

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors, 0 warnings, 0 suppressions |
| `npm run i18n:check` | ✅ 818 keys used, AR/EN in sync |
| `npm run build` | ✅ |
| Tests | ⚠️ project has no test runner/tests |
| Smoke test (Playwright, mocked API, AR + EN) | ✅ login, task inbox, attendance list, attendance sheet month grid render; RTL in Arabic, LTR in English; no page errors; keyboard (Enter) cycles an attendance code; English chunk only fetched for English |
