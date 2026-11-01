# Bundle & Dependency Analysis

Tooling: `vite build` chunk report + `dist/index.html` modulepreload list + Playwright network capture of `/login`. (No new analyzer dependency was added — the Vite report and preload list were enough to locate the problems.)

## 1. What every route downloaded before

`dist/index.html` preloaded **all** vendor chunks, including DataGrid, on every route (even `/login`):

| Chunk | Raw | Gzip | Why it was initial |
|---|---|---|---|
| index (app shell + **AR and EN locales**) | 146.4 kB | 54.9 kB | both JSON files statically imported |
| react | 207.0 kB | 67.5 kB | needed |
| data (query, axios, i18next, **zod, react-hook-form**) | 248.0 kB | 76.3 kB | `manualChunks` forced form libs into it |
| mui | 410.2 kB | 121.7 kB | needed (shell uses MUI) |
| **grid** (@mui/x-data-grid) | 346.8 kB | 105.3 kB | `theme.ts` imported `@mui/x-data-grid/locales` at runtime; `manualChunks` puts the whole grid in one chunk |
| **Total initial** | **1,358 kB** | **≈ 426 kB** | |

## 2. Changes

| Change | File(s) | Effect |
|---|---|---|
| DataGrid locale moved from the global theme into `useGridLocaleText()` used by the grid wrappers and ReportsPage. Theme keeps only the type-only `themeAugmentation` import. | `app/theme/theme.ts`, `components/tables/gridHooks.tsx` | `grid` chunk (105 kB gz) is no longer preloaded — only grid pages fetch it |
| `manualChunks`: zod / react-hook-form / @hookform/resolvers moved from `data` to a separate `forms` chunk | `vite.config.ts` | −26.5 kB gz from the initial load; loaded with the first form page |
| English locale lazy-loaded through a tiny i18next backend; Arabic (default + fallback) stays bundled. App renders after `i18nReady` resolves (immediate for Arabic). | `i18n/index.ts`, `main.tsx` | −42 kB raw / −14 kB gz from the entry chunk; English users fetch one 13.9 kB gz chunk |
| Tried removing the `mui` manual chunk → Rollup merged MUI into the grid chunk (666 kB, preloaded). **Reverted**; the `mui` grouping is kept deliberately. | — | documented experiment |

## 3. After

| Chunk | Raw | Gzip |
|---|---|---|
| index | 102.2 kB | 40.6 kB |
| react | 207.0 kB | 67.5 kB |
| data | 153.7 kB | 50.2 kB |
| mui | 410.2 kB | 121.7 kB |
| **Total initial** | **873 kB** | **≈ 280 kB** |

**Initial JavaScript: −485 kB raw (−36%), −146 kB gzip (−34%).**

Verified with Playwright: `/login` now requests `index, react, data, mui, LoginPage, forms, zod-wrapper, VisibilityOutlined` — no `grid`, no `en`. The Arabic session never requests `en-*.js`; an English session does.

On-demand chunks: `grid` 105 kB gz (first page with a table), `forms` 26.5 kB gz (first page with a form), `en` 13.9 kB gz (English only), per-route page chunks 0.3–6 kB gz.

## 4. Dependencies

| Package | Status |
|---|---|
| `@emotion/styled` | Not imported directly, but a **required peer of @mui/material** → kept |
| `@emotion/cache`, `stylis`, `stylis-plugin-rtl` | RTL Emotion cache → kept |
| `zod`, `react-hook-form`, `@hookform/resolvers`, `axios`, `@tanstack/react-query`, `i18next`, `react-i18next`, `react-router-dom` | used → kept |
| MUI icons | already imported per-file (`@mui/icons-material/Xxx`) → tree-shaken, ~0.3 kB per icon chunk |

- **Removed:** none (no unused runtime dependency found).
- **Added:** `react-doctor` (devDependency, installed by `npx react-doctor install` as requested) + `npm run doctor` script. No runtime dependencies added.

## 5. Assets & fonts

- Only asset is `favicon.svg` (346 B) — already brand colors (#004949 / #FFF0DA / #9BE05E).
- Font: IBM Plex Sans Arabic from Google Fonts with `preconnect` and `display=swap` — already optimal. 4 weights are requested (400/500/600/700); trimming to 3 would save one font file but would change rendering of `fontWeight: 500` text, so it was left as is.
- No raster images in the app.

## 6. Remaining opportunities

- `mui` chunk (122 kB gz) contains every MUI component used anywhere, including ones only used by lazy pages. Splitting it by usage needs a hand-tuned `manualChunks` function; gain ≈ 20–30 kB gz; not done to avoid fragile config.
- Upgrading to React 19 + React Compiler and MUI v7 / X v8 would shrink runtime further; out of scope (major upgrades).
