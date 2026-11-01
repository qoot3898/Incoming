# Implementation Plan

## Stack (pinned, mutually compatible)

React 18.3 · TypeScript 5.6 (strict) · Vite 5 · MUI 6 (+ icons) · MUI X Data Grid 7 · React Router 6 · TanStack Query 5 · Axios 1 · React Hook Form 7 · Zod 3 · i18next 23 / react-i18next 15 · Emotion + stylis-plugin-rtl · openapi-typescript (dev, type generation).

No date-picker or state-management library is added: native date inputs and React context + TanStack Query cover the needs.

## Architecture

```
src/
  app/            router (lazy routes + guards), providers (Query, Theme/RTL, Auth, Snackbar), theme
  components/
    common/       PageHeader, StatusChip, EmptyState, ErrorState, LoadingState, InfoGrid, ConfirmDialog
    forms/        FormDialog (field-config driven RHF + Zod dialog), RHF field adapters, WorkerPicker
    layout/       AppLayout (sidebar, header, breadcrumbs), LanguageSwitcher, NotificationsMenu
    tables/       ServerDataGrid (server pagination wrapper), FilterBar
    workflow/     ApprovalRounds (timeline of rounds/steps), PartyDecision
  features/<module>/   api.ts (endpoint functions + query hooks) + pages/components
  services/api/   axios client, token storage, refresh, ProblemDetails normalisation, file download
  types/          api.generated.ts (from OpenAPI) + api.ts (friendly aliases)
  i18n/           ar.json / en.json, enum label helpers
  constants/      navigation, permissions, directories
  hooks/ utils/
```

## Cross-cutting decisions

1. **Auth** — `POST /auth/login` → `TokenResponse`; access token in memory + `localStorage`, refresh token in `localStorage`. Axios interceptor attaches Bearer; on `401` performs a single-flight `POST /auth/refresh`, retries once, otherwise clears session and redirects to `/login?expired=1`. `mustChangePassword` forces `/change-password`. `GET /auth/me` loads profile, roles, permissions, language.
2. **Authorization** — route/nav visibility by permission prefixes (U-01) + `isSuperAdmin`; record actions shown only when the backend's `can*` flags / `parties[]` allow them; refusal reasons shown as hints. `403` renders a "no access" state.
3. **Server state** — one query-key factory per module; every mutation invalidates the module root key and the worker profile key when relevant.
4. **Errors** — ProblemDetails normalised to `{ title, detail, fieldErrors }`; field errors mapped into RHF via `setError`; others shown in a snackbar/alert.
5. **Forms** — `FormDialog` renders a list of typed field configs (text, textarea, number, date, select, boolean, file) with a Zod schema built from the config; used for the ~60 small workflow actions. Larger forms (staffing request, leave, transfer, termination, evaluation, registration grid) are dedicated components.
6. **i18n/RTL** — `ar` default (SRS), `en`; `dir` on `<html>`; MUI theme direction + Emotion RTL cache; all enum values translated (`enums.<EnumName>.<Value>`); validation messages translated; language persisted locally and to `PUT /auth/me/language`.
7. **Design system** — Qoot brand palette (deep teal `#004949`, cream `#FFF0DA`, leaf green `#9BE05E`), IBM Plex Sans Arabic typography, 8px spacing, 10px radius, flat surfaces with hairline borders, dense data tables.

## Delivery phases

1. Analysis docs (this file, PROJECT_ANALYSIS.md, API_MAPPING.md).
2. Scaffold, theme, i18n, API client, auth, layout, generic components.
3. Modules in workflow order: Tasks → Staffing → Candidates → Registration → Permits → Workers → Onboarding (+salary, start approval, suspension, notices) → Attendance → Leaves → Penalties → Transfers → Evaluations → Terminations → Payroll notices → Reports → Admin (users, roles, directories, settings, labor settings, audit, integration/migration, backups).
4. Quality: `tsc --noEmit`, ESLint, `vite build`, browser smoke test of routes in both directions, README, `.env.example`.
