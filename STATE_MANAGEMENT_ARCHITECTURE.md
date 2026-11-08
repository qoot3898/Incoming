# State Management Architecture

The rule of thumb: **every piece of state has exactly one owner**, chosen by who needs it and how long it must live.

```
                 ┌───────────────────────── needs to survive refresh / be shareable? ──┐
 server data ──► TanStack Query          page view (filters, page, tab) ──► URL (?query)
 form input  ──► React Hook Form + Zod   who is signed in / toasts      ──► React Context
 transient UI ─► useState                per-browser UI preference      ──► localStorage (guarded)
```

| State | Owner | Lives in | Examples |
|---|---|---|---|
| Server data, loading / error, caching, mutations | **TanStack Query** | `features/*/api.ts` key factories + `useQuery` / `useApiMutation` | lists, records, options, tasks inbox |
| Page view state | **URL search params** | `useListState`, `useTabParam` | search text, filters, `page`, `size`, selected tab |
| Form input & validation | **React Hook Form + Zod** | page forms, `FormDialog` | create requests, workflow decisions, uploads |
| Auth session | **AuthContext** | `AuthProvider` + `tokenStorage` | user, permissions, `can()` |
| Notifications (toasts) | **SnackbarContext** | `SnackbarProvider` | success / error messages |
| Transient UI | **`useState`** in the component | component | dialog open, menu anchor, selected rows, upload progress |
| UI preference | **component state + `localStorage`** | `AppLayout` | sidebar collapsed |

No Redux / Zustand: there is no client state that several unrelated pages edit. Adding a store would only duplicate server or URL state.

---

## 1. Server state — TanStack Query

- **Query keys** come from one factory per feature, shaped `[feature, kind, params]`:
  `workersKeys.list(params)`, `leavesKeys.list(params)`, `evaluationsKeys.due(params)`, `attendanceKeys.sheets(params)`, `adminKeys.auditList(params)`, `adminKeys.integrationList('log', params)` …
  Invalidation uses the feature root (`leavesKeys.all`) and therefore always hits lists, details and history.
- **Params are canonical**: `useListState().params` drops empty values, so `?Status=` and no `Status` share one cache entry.
- **Cancellation**: list functions accept the query's `AbortSignal` (`queryFn: ({ signal }) => api.list(params, signal)`). When a key is superseded (typing, paging), the obsolete request is aborted. Results for an old key can never overwrite a newer key — each key has its own cache entry.
- **Previous results while loading**: `placeholderData: keepPreviousData` keeps the old page on screen with the grid's loading bar.
- **Mutations** go through `useApiMutation` (ProblemDetails normalisation, invalidation, toasts). A cancelled upload is marked `cancelled` and never toasted as an error.
- **Optimistic update** where the outcome is certain and cheap to undo: marking a notification read updates the cached inbox immediately and rolls back on error (`NotificationsMenu`). Workflow decisions stay pessimistic — the backend decides what happens next.
- **Server data is never copied into other state.** Forms receive server data as *initial values* (e.g. the penalty draft is loaded first, then the form mounts with it) instead of being re-seeded by effects.

## 2. URL state — `useListState` and `useTabParam`

```ts
const list = useListState({ Tab: 'All', Search: '', TrackId: '', WorkSiteId: '' });
list.filters        // typed values (URL value or default; invalid values fall back)
list.params         // { ...non-empty filters, Page, PageSize } → query key + request
list.setFilter(k, v)        // 1 history entry, back to page 1
list.setFilters({ TrackId, WorkSiteId: '' })   // dependent change = 1 entry
list.clearFilter(k) / list.reset(keys?)        // keeps unrelated params (tab, prefill)
list.setPage(p, { replace? }) / list.setPageSize(s)
list.activeKeys     // filters that differ from defaults
```

Rules:

1. **Every user change is a history entry** (push). Back / Forward walk through filter states; a refresh or a copied link reproduces the view.
2. **URLs stay canonical**: defaults and empty values are not written (`/leaves?Tab=Pending&Search=ali`, never `Tab=All`). Re-selecting the current value does not navigate.
3. **Changing a filter returns to page 1**; changing the page size too.
4. **Validated input**: `page ≥ 1`, `size ∈ {10, 25, 50, 100}`, numbers/booleans parsed with fallbacks.
5. **Text-like inputs commit through `SearchField`** (debounce 350 ms, Enter commits now): search text, numbers and dates — one request and one history entry per search.
6. **Out-of-range pages** (old shared link): the grid moves to the last page and the URL entry is *replaced*, so Back is not trapped.
7. **Tabs** use `useTabParam(values, default)`: `?tab=` survives refresh, Back moves between tabs, switching tab starts that tab's list clean. Used by Integration, Entry permits, Labor settings and the Worker profile.

## 3. Filter UI contract — `FilterPanel`

A page declares its filters once; the panel renders inputs, chips and "Clear all":

```tsx
const filters: FilterDef<typeof list.filters>[] = [
  { key: 'Search', kind: 'search', label: t('common.search') },
  { key: 'TrackId', kind: 'select', label: t('fields.track'), options: opts.tracks, clears: ['WorkSiteId'] },
  { key: 'WorkSiteId', kind: 'select', label: t('fields.workSite'), options: opts.sites },
  { key: 'From', kind: 'date', label: t('common.from') },
  { key: 'LateReturn', kind: 'switch', label: t('leaves.lateReturnOnly') },
];
<FilterPanel list={list} filters={filters} />
<ServerDataGrid … onRetry={query.refetch} filtered={isFiltered(list, filters)} onClearFilters={() => clearFilters(list, filters)} />
```

- `clears` expresses dependent filters (track → site) for both selection and chip removal.
- `hidden` removes a filter that does not apply to the current tab (Evaluations "Result" on *Due*); switching to that tab also clears it.
- Tabs/views are not filters: "Clear all" and the active count ignore them.
- Pages with different needs keep their own controls (Penalties quick chips, Leaves/Terminations tabs with counts, the print-selected button passed as a child).

## 4. Form state — React Hook Form + Zod

- Schemas are built with `useMemo([t])` so messages follow the language; one schema per form, no duplicated rules.
- Shared building blocks (`components/forms`): `FormTextField`, `FormSelectField` (RHF-bound, error replaces helper text), `FormSection` (fieldset + legend), `FormGrid` / `FullRow`, `FormCard`, `FormActions` (busy state, duplicate-submit safe), `FormErrorAlert`, `UnsavedChangesGuard`.
- **Server validation**: `useFormServerError(setFieldError, fields, fieldMap)` maps ProblemDetails `errors` onto fields (with API → form renames such as `employeeId → worker`, `leavingEmployeeId → leavingWorker`) and returns the rest to `FormErrorAlert`. Entered values are never reset on error.
- **Async-prefilled pickers** (worker from `?employeeNumber=`) stay outside RHF via `useWorkerField()`, which adds the "required" message after a submit attempt and a slot for the server's `employeeId` message.
- **Dependent dropdowns**: changing the track clears the site (`setValue`) and the site is disabled until a track is chosen. **Conditional fields** (termination reason → notice date / incident / evaluation) are rendered and validated only for their reason.
- **Create vs edit**: the same component handles both through initial values (`TransferForm` for new requests and re-submission; `FormDialog` `defaultValues` for workflow edits).
- `FormDialog` mounts its form only while open, so every opening starts from fresh defaults.

## 5. File & upload state

| Concern | Owner |
|---|---|
| Selected local file | the form (RHF field value: `File \| null`) |
| Rejection message (wrong type / too large / several files) | `FileInput` local state — invalid files never reach the form |
| Preview URL | `useObjectUrl(file)` — created on select, revoked on change/unmount |
| Upload progress & cancel | `FormDialog` local state (`AbortController`, progress %) |
| Stored server file | server data (attachment id), shown by `FileInput existing` / `AttachmentButton` |

Flow: `FileInput` validates (`utils/files.ts`, same rules reused by the Zod schema) → submit → `FormDialog` passes `{ signal, onUploadProgress }` as the second `onSubmit` argument → feature API `postForm(url, values, transfer)` builds `FormData` (browser sets the multipart boundary) → progress bar → "Cancel upload" aborts; the dialog stays open with the data. Duplicate submissions are blocked by an in-flight guard.

## 6. Global client state

- `AuthContext`: `status`, `user`, `can()` (memoised on `user`), `login`, `logout`, `reload`. Session expiry clears the query cache.
- `SnackbarContext`: `notify()` only (stable); consecutive identical messages are shown once.
- Sidebar collapsed: `AppLayout` state, read once from `localStorage` (guarded by `try/catch`), written in the toggle handler.

## 7. Adding a new list page (checklist)

1. Add `xKeys.list(params)` and `list(q, signal?)` to the feature `api.ts`.
2. `const list = useListState({...defaults})`, `const params = list.params as Q<'ListX'>`.
3. `useQuery({ queryKey: xKeys.list(params), queryFn: ({ signal }) => xApi.list(params, signal), placeholderData: keepPreviousData })`.
4. Declare `filters: FilterDef[]` and render `<FilterPanel>`; pass `onRetry`, `filtered`, `onClearFilters` to `<ServerDataGrid>`.
5. Wrap the page in `<PageContainer>` with `<PageHeader>`.
