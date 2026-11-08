# UI / UX Improvements — Phase 2 (2026-11-08)

Visual identity unchanged: Qoot teal / cream / leaf tokens from `app/theme/brand.ts`, IBM Plex Sans Arabic, MUI components and the existing density. All new UI uses theme tokens (no new hex literals) and works in Arabic RTL and English LTR.

## 1. Layout system

| Building block | Purpose | Used by |
|---|---|---|
| `app/theme/layout.ts` | One place for shell and page dimensions: sidebar 264 / 72 px, header 64 px, content max 1480 px, page padding `xs 2 · sm 3 · lg 4`, page widths `form 880 · wide 1040 · narrow 560`. | AppLayout, Sidebar, PageContainer |
| `PageContainer` *(new)* | Page root; `full` for lists/details, `form` / `wide` / `narrow` keep header and form aligned at a readable width (replaces 820/860/980/520 px one-offs). | 24 list/admin pages + all create forms |
| `PageHeader` | Breadcrumbs, title, subtitle, actions (existing, kept). | all pages |
| `SectionCard` | Existing titled card = *ContentCard*/*PageSection* role (not duplicated). | detail pages |
| `FormCard`, `FormSection`, `FormGrid`, `FullRow`, `FormActions`, `FormErrorAlert` *(new)* | Consistent form surface, grouped fieldsets with legends, 1/2/3-column responsive grid, action row with busy state, focused error summary. | Staffing, Leave, Penalty, Transfer, Termination, Evaluation, Change password |
| `FilterPanel` *(new)* + `FilterBar` (improved) + `SearchField` (improved) | *SearchToolbar / FilterPanel* role. | all 17 list views |
| `ServerDataGrid` / `LocalDataGrid` | *DataTable* role; now with retry and a filtered empty state. | all lists |
| `LoadingState`, `EmptyState`, `ErrorState`, `ConfirmDialog` | Existing state components, reused; ConfirmDialog got a busy spinner and labelled title. | everywhere |

No wrapper was added for something used once.

## 2. Sidebar & navigation

- **Three fixed rows**: brand (64 px, aligned with the app bar) · navigation (the only scroll area: `flex 1`, `min-height 0`, `overscroll-behavior: contain`, thin scrollbar) · footer with the signed-in user and the collapse button. The drawer paper itself never scrolls → no nested scrollbars, header and footer always visible (verified at 1440×600 and on an iPhone 13 viewport).
- **Collapsed rail (desktop)**: 72 px icon rail with tooltips that open toward the content (left in RTL, right in LTR); section titles become dividers; smooth width transition for both the rail and the reserved column, so content never sits under the sidebar. Preference remembered per browser.
- **Active route**: longest matching prefix wins (`/attendance/incidents` → *Absence incidents*, `/attendance/sheets/5` → *Attendance*), exactly one item has `aria-current="page"`, and it is scrolled into view on deep links, Back/Forward and when the rail collapses/expands.
- **Nested items**: `NavItem.children` renders an expandable group (auto-opens when it contains the active route, toggle button does not follow the parent link). The current menu stays one level deep — no navigation structure was changed.
- **Mobile**: temporary drawer (`min(264px, 86vw)`), closes after navigation, footer shows the user and the language switch (hidden in the phone app bar). First render on desktop no longer mounts the mobile drawer.
- **RTL/LTR**: the docked drawer sits on the right in Arabic and left in English; collapse arrows are chosen per direction (icons are not mirrored by the RTL style plugin).

## 3. Lists, search and filters

- Active filters shown as removable chips — *"Status: Active"*, *"Track: 1 — Catering"*, dates formatted — with a count and **Clear all**. Removing a parent chip also clears its dependent filter. Clear all keeps the current tab.
- On phones only the first filter is visible; "More filters" shows a badge with the number of active filters.
- Text, number and date filters are debounced (one request per search), Enter applies immediately, text fields have a clear (×) button.
- Empty results with filters → *"No results — No records match the current search and filters"* + **Clear all** button inside the grid. Errors show **Retry**.
- Tabs that are part of the page view (Integration, Entry permits, Labor settings, Worker profile) are kept in the URL.

## 4. Forms

- Same structure everywhere: worker section first (when relevant), then titled field groups, then actions separated by a divider.
- Required fields marked by MUI's asterisk (`required`), including the worker picker, file fields and evaluation ratings; validation messages under the field; helper text replaced by the error when present.
- Server validation messages appear next to the matching field; anything else is listed in one alert that receives focus.
- Submit shows a spinner and *"Saving…"* and cannot be triggered twice; Cancel returns to the list (not browser history).
- Dependent dropdowns explain themselves (*"Choose a track first"*, *"Choose a worker first"*); conditional fields appear only for their reason.
- Leaving a half-filled create form (sidebar link, Back, closing the tab) asks for confirmation.
- Evaluation form: criteria table with per-row validation and accessible labels per rating select; scrolls horizontally on phones.
- Dialog forms are full-screen on phones.

## 5. Files

- New `FileInput`: drag & drop or **Choose file**, accepted types and limit shown (*"PDF or image · up to 25 MB"*), immediate rejection of wrong type / oversize / several files with the reason, thumbnail for images, PDF icon, size, **Preview** (opens the local file), **Replace**, **Remove**; a stored server file is labelled *Current file* and a new one *Replaces current file*.
- Upload progress bar with percentage, "processing" after 100 %, **Cancel upload** (keeps the dialog and data).
- Downloads/prints show a spinner while preparing; missing/expired files get a clear message.
- Integration CSV imports use the same picker (10 MB limit); re-choosing the same file works; the previous report is cleared.

## 6. Responsive behaviour (verified)

| Viewport | Checks |
|---|---|
| Desktop 1440×900 / 1366×768 (AR + EN) | docked sidebar, content never under it, filter grid 6 columns |
| Small-height desktop 1440×600 | nav scrolls, brand and footer fixed, active item visible |
| Tablet 900×1100 | temporary drawer, 4-column filters, **0 px horizontal overflow** |
| Phone (iPhone 13) | `/workers`, `/leaves`, `/staffing-requests/new`, `/evaluations/new`, `/admin/integration?tab=device`: **0 px horizontal overflow**; tables scroll inside their container |

Screenshots of these checks were taken during verification (not committed to the repo).

## 7. Accessibility touches

`aria-current` on the active nav item, `aria-expanded` on collapse/group toggles, labelled filter region and chip list, `aria-busy` on submitting buttons, progress announced via `role="status"`, fieldset/legend for form sections, focus moved to the form error summary, labelled confirm dialogs, keyboard Enter to apply a search.
