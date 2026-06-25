# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- `npm start` — webpack-dev-server with HMR at http://localhost:8080
- `npm run start:secure` — same over HTTPS (needs local certs); `start:secure:no-certs` for the self-signed variant
- `npm run build` — runs `lint:build`, `clean`, then production webpack build into `dist/`
- `npm test` — Jest (jsdom). `npm run test:watch`, `test:coverage`, `test:debug` available
- `npm run test:cypress` / `test:cypress:open` — Cypress e2e (headless / interactive)
- `npm run test:full` — Jest then Cypress
- Single Jest test: `npx jest path/to/file.test.tsx` or `npx jest -t "test name"`
- Single Cypress spec: `npx cypress run --spec 'cypress/e2e/<file>.test.ts'`

### Linting
There are three overlapping ESLint configurations — `npm run lint:build` runs all three in the order the production build needs:
- `lint:others` — most of `src/` using `.eslintrc.build.js` (excludes `src/lara-plugin/**` and `src/lib/**`)
- `lint:plugins` — `src/lara-plugin/` using its own `.eslintrc.js`
- `lint:lib` — `src/lib/` using its own `.eslintrc.js`

Use `npm run lint:fix` for autofix across `src/` and `cypress/`. Code style: 2-space indent, double quotes, semicolons required (enforced by ESLint).

## Big-Picture Architecture

This is a React 16 / TypeScript SPA that runs LARA "Lightweight Activities" — the student-facing runtime counterpart to LARA authoring. Entry point is `src/index.tsx` → `src/components/app.tsx`, which is a large stateful component orchestrating the entire session lifecycle.

### Activity/sequence loading (`src/lara-api.ts`, `src/data/`)
`?activity=` / `?sequence=` URL params are either a URL (fetched JSON) or a key into `src/data/` sample fixtures. Version-1 LARA JSON is auto-upgraded through `src/convert-old-lara/convert.ts` before it reaches the rest of the app. The shape of activity/sequence/page/embeddable models lives in `src/types.ts`.

### LARA plugin runtime (`src/lara-plugin/`)
This directory is a self-contained copy of LARA's plugin host API (`PluginAPI_V3`, `Plugins`, `Events`, popup/sidebar helpers). `initializeLara()` attaches it to `window.LARA` so third-party plugin scripts loaded at runtime can call into it. Treat this directory as a near-frozen port — it has its own ESLint config and tests (`*.spec.ts` instead of `*.test.ts`). Plugin scripts are fetched and injected by `src/utilities/plugin-utils.ts`.

### Interactives / iframes
Managed interactives render in `src/components/activity-page/managed-interactive/` via `iframe-runtime.tsx`. Host-side integration uses `@concord-consortium/interactive-api-host` (attachments manager) and `@concord-consortium/lara-interactive-api` (postMessage protocol). `iframe-phone` is the underlying transport.

### Persistence — two paths
- **Authenticated (Portal)**: `src/portal-api.ts` exchanges the portal `token` (or OAuth `auth-domain` flow via `src/utilities/auth-utils.ts`) for a portal JWT, then a firebase JWT. `firebaseAppName()` picks `report-service-pro` on production hostnames, `report-service-dev` everywhere else — can be overridden with `?firebaseApp=`.
- **Anonymous**: generated `runkey` UUID scopes all Firestore writes to anonymous collections. `?preview` disables anonymous saving entirely.

`src/firebase-db.ts` is the single entry point for Firestore. It starts watchers early (so data is pre-loaded) and exposes both getters and subscription APIs for answers, interactive state history, learner plugin state, `ap_runs`, and teacher feedback. Paths are keyed off `portalData.database.sourceKey`. `src/firebase-job-executor.ts` handles deferred cloud jobs (e.g. signed-report generation).

### Layouts and pages
`ActivityLayouts` (in `src/utilities/activity-utils.ts`) selects between `ActivityPageContent` (standard multi-page), `SinglePageContent` (all pages on one scrolling page), `SequenceIntroduction`, `IntroductionPageContent`, and `CompletionPageContent`. Notebook layout is styled via `src/notebook.scss`.

### Logging (`src/lib/logger.ts`)
Routes to `logger.concord.org` (prod) or `logger.concordqa.org` (dev). When `?logMonitor=true`, events are also forwarded to `@concord-consortium/log-monitor` for in-page inspection. `?dangerouslySkipSendingLog=true` disables remote sending (dev only).

### URL parameters
Drive most behavior — see the full list in README.md. Notable dev-centric params: `?activity=sample-activity-1`, `?override:locked=true`, `?preview`, `?__cypressLoggedIn` (Cypress only), `?__skipGetApRun` (Cypress only).

## Deployment

GitHub Actions auto-deploys every branch to `https://activity-player.concord.org/branch/<name>/` and every tag to `.../version/<name>/`. Production releases are a manual GitHub Actions workflow that copies a tagged build's `index-top.html` to the root `index.html`. Full release checklist is in README.md — the short version: bump `package.json`/`package-lock.json` with `npm version --no-git-tag-version`, update `CHANGELOG.md`, verify `npm run lint && npm run build && npm run test`, merge a `release-<version>` branch, push a tag, run the Release Staging workflow, then the Release workflow.

## Notes for Navigating

- TypeScript is `target: es5`, `strictNullChecks: true`, `noImplicitAny: true`, but `no-explicit-any` is OFF — `any` is commonly used at plugin/iframe boundaries.
- SVGs imported from `.tsx` files go through SVGR and become React components; SVGs referenced from SCSS are treated as asset URLs.
- SCSS uses CSS Modules in ICSS mode (for `:import`); most files are plain SCSS though.
- Tests that need complex auth/portal setup should look at `src/utilities/test-utils.ts` and existing `app.test.tsx` / `portal-api.test.ts` patterns first.
