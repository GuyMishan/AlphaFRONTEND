# ALPHA Frontend code map

Where things live. Conventions and the reasons behind them: `docs/ARCHITECTURE.md`; recipes: `docs/DEVELOPMENT.md`. Business rules (Employer Interface 006, billing, feedback playbooks) are owned by the backend and its documentation; the frontend only presents them.

Route files `src/app/**/page.tsx` only re-export a screen from `src/features/<feature>/screens/`.

## App shell and session

| Path | Responsibility |
| --- | --- |
| `src/app/layout.tsx` | Root layout: global stylesheets in cascade order, `QueryProvider`, `ThemeProvider`, toaster, `ValidationUxBridge`, `SessionTimeoutGuard` |
| `src/features/shell/components/persistent-app-layout.tsx` | Lists the public routes rendered without the shell (`/login`, `/register`, `/invite`, `/session-timeout`) |
| `src/features/shell/components/app-shell.tsx` | Authenticated shell: navigation from the access scope, route guards, self-service onboarding, plan-upgrade dialog (`subscribeToApiErrors`) |
| `src/lib/session/` | `app-store.ts` (Zustand: session display metadata, selected organization/employer/employee), `storage.ts` (persistence, never tokens), `lifecycle.ts` (logout, expiry, multi-tab broadcast) |
| `src/features/auth/` | Login/OTP, registration, invitation and session-timeout screens; `session-timeout-guard.tsx` (local 30-minute idle check, then server validation); `restore-session.ts` (`resolveSession`: one backend check for a tab without session metadata); `api.ts` maps auth error codes to Hebrew |
| `src/features/scope/` | `scope-context.ts` (`/api/scope` query), `components/scope-controller.tsx` (organization/employer/employee selection), `scope-events.ts` (page scope resolved/changed), `use-employer-scope.ts` |
| `src/features/settings/` | Theme provider (light/dark/system saved to user preferences) and the settings screen |

## Shared UI (`src/components`)

| Path | Responsibility |
| --- | --- |
| `ui/ui-controls.tsx` | `UiInput`, `UiTextarea`, `UiCheckbox`, `UiDateInput` (DD/MM/YYYY), `UiSelect`, `UiAutocomplete`, `UiActionMenu`. Option lists and menus are portaled to `document.body` so modals and tables never clip them |
| `ui/app-modal.tsx` | The only dialog shell: fixed header/footer, scrollable body, nested scroll locking; cancel/back on the RTL right, positive actions on the left (`data-modal-side="positive"`) |
| `ui/data-table.tsx` | The only table: fixed layout, windowed rows, infinite loading (`hasMore`/`onLoadMore`), optional expandable rows (`expandedRowComponent`, `canExpandRow`, `expandToggleColumnKey`); links use `DataTableLink` (no prefetch) |
| `ui/ui-file-upload.tsx` | File picker with drag/drop, type and size checks (each caller passes the backend's limit) |
| `ui/ui-selection-list.tsx`, `ui/app-tabs.tsx`, `ui/tooltip.tsx`, `ui/notifications.tsx` | Searchable multi-select, tabs, tooltip, `notify` toasts |
| `forms/form-feedback.tsx`, `forms/form-select.tsx` | `Field` (label + error), `FormSelect` (`UiSelect` bound to React Hook Form) |
| `forms/validation-ux-bridge.tsx` | Highlights fields from error notices and server validation for forms not on React Hook Form |
| `layout/` | Brand, accessibility menu |

Styles: `src/styles` (`tokens.css` first, `dark-theme.css` and `responsive.css` for theme and breakpoints); screen-only styles sit next to the screen (`src/features/reporting/screens/reports-screen.css`).

## Infrastructure (`src/lib`)

| Path | Responsibility |
| --- | --- |
| `api/client.ts`, `api/transport.ts` | `apiRequest`, `apiBlob`, `queryString`, `subscribeToApiErrors`; same-origin transport, global 401 → session expiry |
| `api/errors.ts`, `api/error-messages.ts` | `ApiError` (kind, status, `code`, `fieldErrors`, `traceId`, `problem`) and the Hebrew message policy |
| `api/paging.ts` | `PagedResult` (`{ items, hasMore }`, offset paging with `skip`/`take`) |
| `query/` | `QueryClient` defaults and provider |
| `forms/` | `useZodForm`, shared Zod rules, input masks, `applyServerErrors`, validators |
| `format/` | Dates (DD/MM/YYYY), reporting months, money |
| `server/backend.ts` | Server-only: backend URL, session cookie, cross-site request check |
| `download.ts`, `hooks/` | `saveBlob`; `useDebouncedValue`, `useUrlScope` |

Server routes: `src/app/api/backend/[...path]/route.ts` (proxy) and `src/app/api/session/logout/route.ts`.

## Features

### Organizations, employers, employees, access
- `organizations/` — list and creation (platform admin), profile screen, general details form, `organization-types.ts` (selectable categories).
- `employers/` — list, creation, profile screen with tabs in `components/profile/` (general, employees, pension payment, billing, reporting); `employer-transfer-modal.tsx` (platform admin), `employer-documents-tab.tsx` + `documents-api.ts` (employer and pension-product PDF library), `employer-status.ts` (Active/Closed).
- `employees/` — list, creation, profile; `employee-form.tsx`, `employee-pension-mix.tsx` (pension products + product documents), `excel-employee-intake.tsx`, `inline-employee-create-modal.tsx`.
- `access/` — users, roles, permissions, employer assignments and invitations (`access-screen.tsx`).
- `admin/` — platform administration: billing customers, reference-data integrations, platform users, referents (`referents-admin-tab.tsx`).

### Pension products and reference data
- `pension/components/pension-products-editor.tsx` — the shared product/contribution editor (employee pension mix and report drafts); `pension-fund-select.tsx`, `salary-layer-select.tsx`, `contribution-math.ts`.
- `pension/components/pension-products-editor.tsx` validates local, status-independent 006 input rules (e.g. insurance exempt payments/code 74, monetary precision, policy length and product dates) in both employee and report editors; salaried Regulation-19 relationship rules remain employee-only until the report's deposit status is known.
- `reference-data/` — banks, branches, cities, streets, option lists, salary layers and the pension-editor option bundle; `reference-option-select.tsx`, `address-autocomplete-fields.tsx`. Autocompletes load suggestions only when opened.

### Reporting (Employer Interface 006)
- `reporting/screens/new-report-screen.tsx` — the report wizard: report type, details, employees, deposits, summary/transmission; resumes drafts and correction workspaces (`resumeReportId`, focus parameters from feedback). Steps in `components/new-report/`.
- `reporting/components/manual-report-data.tsx` (employees and products), `manual-deposit-data.tsx` + `deposit-payment-editor.tsx` (payment details, V006 metadata, payment evidence, report attachments), `employer-interface-xml-intake.tsx` (XML/DAT/TST import), `report-validation-errors-modal.tsx`, `salary-template-tools.tsx` (template in `public/templates/`).
- API modules: `api.ts` (drafts), `deposits-api.ts`, `validation-api.ts`, `transmission-api.ts`, `derived-reports-api.ts` (corrections and differences), `attachments-api.ts`, `payment-confirmations-api.ts`, `employer-interface-api.ts` (006 profiles, metadata, preflight, options).
- `reporting/screens/reports-screen.tsx` — Reports & Feedback: paged report grid with server-side filters, per-report deposit rows, exports and correction entry points.

Invariants:
- Submitted reports are immutable; corrections happen in a backend-created correction workspace and are sent again as a whole report.
- V006 checks the frontend can know before transmission are split on purpose: the pension editor checks only draft-time rules, the Deposits stage (`deposit-validation.ts`) checks deposit-status rules, and historical/cross-report rules stay backend-only. `scripts/check-v006-preventable-validations.mjs` guards this split.
- Backend validation and preflight responses are authoritative; the frontend never auto-corrects them.

### Feedback (`src/features/feedback`)
- `api.ts` — feedback grid, deposit details, treatments, resolution context and actions, external cases, exports. `queries.ts` caches the grid, employer context and treatment statuses.
- `report-feedback-modal.tsx` — single entry point with `employer`, `report` and `deposit` modes, each with `view` and `resolve` states; `report-deposit-feedback-modal.tsx` — employee/product detail with reconciliation and treatment history.
- `feedback-resolution-mode.tsx` — the resolution queue built from the backend `groups` contract; resolvers: `feedback-employee-resolver.tsx`, `feedback-internal-correction-resolver.tsx`, `feedback-decision-resolver.tsx`, `feedback-external-case-resolver.tsx`, `feedback-code18-*-editor.tsx` (missing-field corrections).

Invariants: the backend decides which groups are executable (`canExecute`), the target scope and which problems a save resolves; the UI only offers what the context returns and refreshes it after every action.

### Billing and payments
- `billing/` — subscription plan and pricing (`subscription-billing-panel.tsx`), the account that pays Alpha (`alpha-billing-account-form.tsx`, provider redirects restricted to HTTPS or this origin), `billing-gate-modal.tsx`, `upgrade-modal.tsx` + `upgrade.ts` (plan-limit dialog store).
- `payment-accounts/` — bank accounts that pay pension deposits (organization and employer); unmasked bank details stay in component state.
- `dashboard/` — statistics from `/api/dashboard/stats` and plan usage.

## Quality gates

| Check | Purpose |
| --- | --- |
| `npm run test` | Vitest (`src/**/*.test.ts`): API client and errors, proxy/logout security, form schemas |
| `scripts/check-ui-primitives.mjs` | Shared controls, checkboxes and `AppModal` only |
| `scripts/check-hardcoded-select-options.mjs` | Select data comes from reference data, not literals |
| `scripts/check-v006-preventable-validations.mjs` | V006 validation ownership split |
| `scripts/check-regex-escaping.mjs` | No double-escaped regex literals |
| `.github/workflows/ci.yml` | The authoritative CI sequence (same as `npm run verify`) |
