# Qoot — Temporary Labor Management (Frontend)

Web frontend for **نظام إدارة العمالة المؤقتة** (TL-SRS v2.0), built against the existing
`Qoot.TemporaryLabor.Api` (OpenAPI v1). Arabic (RTL, default) and English (LTR).

- Analysis: [`PROJECT_ANALYSIS.md`](PROJECT_ANALYSIS.md)
- Endpoint ↔ screen mapping: [`API_MAPPING.md`](API_MAPPING.md)
- Plan & architecture: [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)
- Requirements of 2026-11-08 (complaints, assignment letter, document dates, penalties, user activity): [`REQUIREMENTS_2026-11-08.md`](REQUIREMENTS_2026-11-08.md)

## Stack

React 18 · TypeScript (strict) · Vite 5 · MUI 6 + MUI X Data Grid 7 · React Router 6 · TanStack Query 5 ·
Axios · React Hook Form + Zod · i18next. Types are generated from the backend OpenAPI document.

## Getting started

Requirements: Node.js 20+ (tested with Node 22).

```bash
npm install
cp .env.example .env        # optional — defaults work for development
npm run dev                 # http://localhost:5173
```

In development the Vite server proxies `/api` to `VITE_DEV_PROXY_TARGET`
(default `https://qoottemporarylabor.runasp.net`), so no CORS setup is needed. Keep the target on
**https**: the API redirects http → https, and a redirect passed back through the proxy makes the browser
call the API directly, which fails with a CORS error.

### Production build

```bash
npm run build               # type-check + bundle into dist/
npm run preview             # serve dist/ locally
```

Set `VITE_API_BASE_URL` (e.g. `https://api.example.com`) at build time when the API is on another origin,
or leave it empty and serve `dist/` behind the same origin as the API (reverse-proxy `/api`).
The app uses client-side routing: configure the web server to fall back to `index.html`
(IIS: URL Rewrite rule; nginx: `try_files $uri /index.html`).

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server with API proxy |
| `npm run build` | Type-check and production build |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint |
| `npm run i18n:check` | Verifies every used key exists in `ar.json` and `en.json`, both files match (NFR-14), a key has the same `{{placeholders}}` in both languages, and template-built key families (`t(`a.b.${x}`)`) have entries |
| `npm test` | Vitest unit/component tests (`npm run test:watch` while developing) |
| `npm run check` | typecheck + lint + i18n check + tests |
| `npm run gen:api` | Regenerate `src/types/api.generated.ts` from `openapi/openapi.json` |

To refresh the API contract: download `https://qoottemporarylabor.runasp.net/openapi/v1.json` to
`openapi/openapi.json`, then run `npm run gen:api` and `npm run typecheck`. (The reference UI is at `/scalar`.)
`scripts/normalize-openapi.mjs` corrects ASP.NET OpenAPI quirks (untyped nullable strings,
`integer|string` numbers) before generation.

## Project structure

```
src/
  app/          providers (Query, Theme+RTL, Snackbar, Auth), router (lazy routes, guards), theme
  components/   common (PageHeader, StatusChip, states, InfoGrid…), files (FileInput),
                forms (FormDialog, FormLayout, RHF fields, WorkerPicker, unsaved-changes guard…),
                layout (Sidebar, PageContainer, header, notifications, language),
                tables (server/local grids, FilterPanel, SearchField), workflow (approval rounds, party decisions)
  features/     one folder per module: api.ts (endpoints + query keys) and pages
  services/api  axios client, token storage & refresh, ProblemDetails normalisation, file download
  i18n/         i18next setup + ar/en locale files
  constants/    navigation, permission gating, enum lists, directory slugs
  hooks/ utils/ types/   useListState (URL list state), useTabParam, useObjectUrl…
  test/         Vitest setup and helpers (tests live next to the code as *.test.ts(x))
```

State ownership rules (server / URL / form / context / local) are in `STATE_MANAGEMENT_ARCHITECTURE.md`.

## Implemented features

| Area | Screens |
|---|---|
| Authentication | Login, refresh-token rotation, session expiry, forced password change, logout, language preference saved to the account |
| My tasks (M14) | Pending decisions, actions per role/scope, in-app notifications (mark read) |
| Staffing requests (M01) | List & filters, create (a replacement names one different leaving worker per requested place), details (leaving workers listed), Operations → GM approvals, reject with reason, close, print TL-F01 |
| Candidates (M02) | Candidate list independent of staffing requests (pool status, phone, job; add, edit, withdraw, restore), candidate card with documents and nominations, nominate from the list or add new on a request, choose candidates while submitting a request, interview result, GM decision (approve all / exclude / reject list), cancel nomination |
| Registration (M03) | Approved-candidate queue, bulk registration grid (≥100 rows) with defaults, duplicate-passport confirmation, issued employee numbers; a full site refuses the batch and lists other sites |
| Distribution & permits (M03) | Distribution queue, issue permit (track sites only), issue for current workers, permits list, cancel, print selected / single |
| Worker files (M15) | Search with all FR-58 filters, worker profile: identity (correction), file, onboarding summary, permit, approved salary, candidate, timeline with attachments, leave history, attachments (upload signed forms) |
| Onboarding (M04–M06) | Stage tabs, start report/withdraw, open start record (note if date differs), correct date, close not started, checklist & documents (scan upload), passport custody (receive, relocate), restricted security survey (applicability, review, restricted result view), suspension, salary proposal/HR decision, ordered start approval chain, payroll start notice delivery/confirmation, print TL-F04 |
| Payroll notices | List, record delivery, confirm receipt |
| Attendance (M07) | Monthly sheets per site, open sheet, mobile-friendly daily entry, monthly grid, save with correction reason when not open, submit/review/receive, fingerprint differences, print TL-F06 |
| Absence incidents | List, excuse with reference, refer to penalty / dismissal request |
| Leaves (M08) | Tabs with counts, create with previous-leave summary, approvals (Supervisor → Operations → Section, proxy name), return/resubmit, cancel, return confirmation, passport hand-over/return, payroll notices, print TL-F05 |
| Penalties (M09) | List with step counters, propose (from incident draft), manager decision, file without penalty, acknowledgement with signed scan/witness, application, print TL-F07 |
| Transfers (M10) | List, create/resubmit with track-site rules, three approvals, execution with new site/permit and optional salary change, HR salary decision, supervisors informed, optional transfer-decision PDF (attach / replace / open / delete while the parties have not decided), print TL-F08; fingerprint-supervisor notices arrive as in-system notifications linking to the request |
| Evaluations (M11) | Due / pending review / all, record TL-F09 (all criteria), section review (file / penalty / termination), print TL-F09 |
| Terminations (M12–M13) | Stage tabs, create (resignation notice → last working day), Operations decision, execution & clearance items, settlement record/approve (amounts hidden without rights), passport on exit, replacement decision & prepared replacement request, closing checklist, print TL-F10 |
| Reports (M15) | RPT-01…RPT-13 + procedure steps (FR-69) with per-report filters, preview, PDF/Excel export |
| Administration (M16) | Users (create with one-time temporary password, edit, roles, activate, unlock, reset password, force sign-out, direct permission grants and denials), roles & permission matrix, reference lists (directories, incl. work-site coordinates), system settings, tracks/sites and user scopes, site capacities (change with PDF decision, history), audit log, backups |
| Integration (M17) | Odoo events (acknowledge/failure), interface log, worker export, fingerprint CSV import, current-worker migration CSV with dry run |

## Security notes

- The backend is authoritative: action buttons follow the per-record capability flags returned by the API
  (`canDecide`, `canExecute`, `parties[]` …) and refusal reasons are shown; `403` renders a "no access" state.
- Tokens: the access and refresh tokens are kept in memory and `localStorage` so a session survives reloads.
  If your security policy requires it, switch to an HttpOnly-cookie refresh flow on the backend.
- Restricted data (security survey result, passport scans, settlement amounts) is only shown when the API returns it.

## Open issues

Requirements of 2026-11-08 are in `REQUIREMENTS_2026-11-08.md`, those of 2026-11-09 … 2026-11-11 (site capacity, leaving workers, direct user permissions, termination blocks) in `REQUIREMENTS_2026-11-11.md`.
Those of 2026-11-12 (candidate list without a staffing request, approval by whoever entered the action, transfer decision PDF and fingerprint notices) are in `REQUIREMENTS_2026-11-12.md`.
See *Open points* in `PROJECT_ANALYSIS.md` (permission codes, directory slugs, link formats, form record ids, CORS).
