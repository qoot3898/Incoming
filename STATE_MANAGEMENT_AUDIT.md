# State Management Audit — Phase 2 (2026-11-08)

Scope: every page, provider, hook and shared component under `src/` (≈150 files, 40 routes).
Method: read the code, map each piece of state to its owner, then reproduce suspected problems in a
browser (Playwright + mocked API, Arabic RTL and English LTR, desktop / tablet / phone) before changing anything.

## 1. Inventory — where state lived before this pass

| Category | Where it lived | Assessment |
|---|---|---|
| **Server state** | TanStack Query on every page (`useQuery` / `useApiMutation` wrapper with invalidation + toasts). One QueryClient, `staleTime` 30 s, no refetch on focus, no retry on 4xx. | Sound foundation. Gaps below (keys, cancellation, one effect-mirroring case). |
| **URL state** | `useListState` (filters + `page` + `size` in `?query`) on 16 list pages; tabs via `useSearchParams` on 2 pages. | Right idea, but navigation history, canonical URLs and resets were wrong (see §2). |
| **Local UI state** | `useState` for dialog open flags, menu anchors, selected rows, confirm targets. | Correct ownership; kept. |
| **Global client state** | `AuthContext` (user, permissions, `can()`), `SnackbarContext` (toast queue), language via i18next. | Small, memoised, correctly scoped. **No other cross-page client state exists.** |
| **Form state** | React Hook Form + Zod on most forms; config-driven `FormDialog` for ~60 workflow actions. | Mostly good. `EvaluationCreatePage` used 6 `useState`s + manual `safeParse`; server-error mapping copy-pasted in 6 pages. |
| **Auth state** | `tokenStorage` (memory + localStorage), `/auth/me` loaded by `AuthProvider`, session-expiry listener clears the query cache. | Kept as is (bootstrap logic, not cacheable server data). |
| **File upload state** | `FormDialog` `kind: 'file'` field (raw `<input type=file>` held in RHF), `api.postForm` → FormData. CSV pickers on the Integration page. | Functional but no validation, progress, cancel, preview or clean re-selection (see §4). |
| **Search & filter state** | `SearchField` (350 ms debounce) for text; selects/dates/numbers written straight to the URL. | Debounce only covered free text (see §3). |
| **Dialog & notification state** | Local `useState` per dialog; toast queue in context; notifications from the shared `['tasks']` query (badge + inbox page). | Correct; mark-as-read waited for the server. |

## 2. URL / navigation state — problems found

| # | Problem | Evidence | Impact |
|---|---|---|---|
| U1 | Every list write used `setSearchParams(…, { replace: true })`. | Baseline browser run: choose a status filter → Back → **left the page (`about:blank`)** instead of restoring the previous filters. | Requirement "Back/Forward restore previous filter states" not met. |
| U2 | `reset()` replaced the whole query string. | Leaves "Pending" tab + filters → Clear → tab jumped back to "All"; same on Terminations, Onboarding, Evaluations. | Clearing filters also changed the view. |
| U3 | Defaults were written to the URL (`?Tab=All`, `Status=All`). `setFilters({...list.filters, …})` wrote the full object. | URLs like `/leaves?Tab=All&Search=…`. | Non-canonical, longer links; two URLs for one state = two cache entries. |
| U4 | `page` / `size` not validated (`?size=999`, `?page=-3` passed through). | Requests with `PageSize=999`. | Unbounded requests from edited links. |
| U5 | Integration tab lists stored `tab` inside each list's defaults; Integration and Entry-permit tabs used `replace`. LaborSettings and Worker-profile tabs were plain `useState`. | Refresh/shared link always opened the first tab. | Tabs not shareable; Back skipped tab changes. |
| U6 | Evaluations: the "Result" filter is hidden on the *Due* tab but stayed in the request. | `?Tab=Due&Result=…` sent to `/evaluations/due`. | Hidden filter silently applied. |
| U7 | After switching to history entries (U1), the DataGrid's own "page past the end" correction would have **pushed** an entry: Back → bad page → corrected forward again. | Found while testing the fix: `/workers?Text=Ali&page=40` → Back returned to `page=3`. | Back-button trap (fixed together with U1). |

## 3. Search, filters and data tables — problems found

| # | Problem | Impact |
|---|---|---|
| F1 | Date inputs, the attendance *Year* and integration *Notice id* wrote to the URL on every change event. Typing `2026` into a year/date field produced several requests and history entries. | Wasted requests, noisy history. |
| F2 | No active-filter display: users could not see which of up to 10 filters were applied, and "Reset" was always shown (even with nothing to reset). | Hidden state; on phones most filters are collapsed. |
| F3 | Empty grid always said "No data", even when caused by filters; no way to clear from there. | Users assume there is no data. |
| F4 | Grid errors had no retry. | Full reload needed. |
| F5 | Query keys were built ad hoc on 9 pages (`[...leavesKeys.all, 'list', params]`, audit key without a `'list'` segment, integration keys by spreading). | Inconsistent invalidation targets; easy to mistype. |
| F6 | List requests were not cancellable (`signal` not passed). TanStack Query already prevents stale responses from overwriting newer ones (per-key cache), but superseded requests kept running. | Server load while typing / paging quickly. |
| F7 | LaborSettings → User scopes search used local state (lost on refresh). | Inconsistent with the other lists. |

Out-of-order responses: verified **not** an issue — every list's query key contains all params, and `keepPreviousData` keeps the previous page visible while the new key loads.

Sorting: the API exposes sorting only for workers (`Sort=Number|Name`, PROJECT_ANALYSIS U-14); other lists show server order. Kept; column-header sorting stays disabled to avoid implying client-side sorting of a single page.

## 4. Files and uploads — problems found

| # | Problem |
|---|---|
| D1 | No type or size validation before upload (only the `accept` attribute, which users can bypass with "All files"). A 200 MB scan would upload fully before the server rejected it. |
| D2 | No progress indication, no way to cancel a slow upload; a failed upload showed a generic error. |
| D3 | No preview of the chosen file, no remove/replace (only "choose again"). |
| D4 | Integration CSV pickers: the `<input>` value was not reset, so re-choosing the same corrected file did nothing; the previous import report stayed on screen for a new file. |
| D5 | Opening an expired/deleted attachment showed the raw 404 text; buttons gave no busy feedback. |
| D6 | Fast double-click on "Save" could start two submissions (RHF's `isSubmitting` updates asynchronously). |

All upload endpoints are single-file `multipart/form-data` (`scan` field) — verified in `openapi.json`; there is no multi-file endpoint, so per-file error handling for batches is not applicable.

## 5. Forms — problems found

| # | Problem |
|---|---|
| R1 | Server field errors that did not match a visible field were **dropped** on 5 page forms (only the title was shown) — e.g. `leavingEmployeeId`, `employeeId`. |
| R2 | Required worker pickers had no message; the submit button was just disabled. |
| R3 | `EvaluationCreatePage` bypassed React Hook Form (6 `useState`s + manual Zod `safeParse`, errors only in a summary list). |
| R4 | `PenaltyCreatePage` copied the incident draft into the form with `useEffect` + `reset` (server data mirrored into form state). |
| R5 | Cancel used `navigate(-1)`: from a shared link or a new tab it left the application. |
| R6 | No protection against losing a half-filled form by clicking the sidebar. |
| R7 | Widths differed per form (820 / 860 / 980 / 520 px); every page re-implemented `Controller` + `TextField` wiring. |
| R8 | The incident → termination shortcut passed `employeeId`, but the form pre-fills from `employeeNumber` — the worker was never pre-selected. |

## 6. Layout, sidebar and responsiveness — findings

| # | Finding |
|---|---|
| L1 | Sidebar scroll structure was already correct (nav is the scroll container, brand row stays) — verified at 1440×600. Hardened anyway (`min-height: 0`, paper `overflow: hidden`). |
| L2 | No collapsed state; no fixed footer; active item could be off-screen on deep links to admin pages; `/attendance` matching was a hard-coded special case. |
| L3 | `useMediaQuery` without `noSsr`: desktop's first render mounted the *mobile* drawer, then swapped it. |
| L4 | Three raw `<Table>`s (onboarding documents, termination clearance, evaluation items) had no horizontal scroll container. |
| L5 | `FormDialog` was a centred small dialog on phones (cramped with file fields). |

## 7. Performance-related state findings

- Contexts: `AuthContext` and `SnackbarContext` values are memoised; toasts do not re-render consumers. ✔
- `useListState` returned new callback identities every render. Now memoised.
- No large global objects; no duplicated server data in client state except R4 (fixed).
- Notification "mark as read" waited for a round-trip before the badge changed → now optimistic with rollback.
- React Doctor baseline: **11 warnings** (all complexity / index keys in large workflow components).

## 8. Decision on global state libraries

Neither Redux nor Zustand is justified: the only shared client state is the signed-in user (context), the toast queue (context) and one per-browser UI preference (sidebar collapsed — owned by the shell, persisted in `localStorage`). Everything else is server state (TanStack Query) or page state (URL). Adding a store would duplicate data that already has a better owner. See `STATE_MANAGEMENT_ARCHITECTURE.md`.
