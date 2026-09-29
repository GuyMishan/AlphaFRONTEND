# ALPHA Frontend code map

## App shell and global behavior
- `src/app/layout.tsx` — root layout and global providers/styles.
- `src/components/app-shell.tsx` / `persistent-app-layout.tsx` — application shell.
- `src/lib/app-store.ts` / `use-app-store.ts` — global Zustand state for browser session metadata, authorized scope, persisted organization/employer/employee selection and scope-derived permissions. `src/lib/app-data-cache.ts` de-duplicates `/api/scope` requests and stores the result in Zustand; `AppShell`, `ScopeController` and application screens consume the same global state.
- `src/components/scope-controller.tsx` — organization/employer scope selection. Dashboard initialization does not emit a synthetic `alpha:scope-change`; only real selection changes trigger dashboard reloads.
- `src/components/theme-provider.tsx` — theme state.
- `src/components/validation-ux-bridge.tsx` — maps server/notice validation into field UI.

## Shared UI and styles
- `src/components/ui-controls.tsx` — shared input, date, select, autocomplete and card primitives.
- `src/components/app-modal.tsx` — shared modal.
- `src/components/data-table.tsx` — shared table primitive for consistent headers, rows, loading/empty states and windowed rendering. It supports infinite loading via `hasMore`/`onLoadMore`: screens with paged APIs append newly fetched batches to the rows already cached in the frontend; there is no table pagination UI. Table navigation must use `DataTableLink`, which disables Next.js route prefetch so a rendered table does not fan out into one RSC request per row. Application screens should not render raw HTML tables directly.
- `src/app/globals.css` — global design/layout rules.
- `src/app/ui-fixes.css` — cross-screen UI corrections, including autocomplete/report modal behavior.
- `src/app/dark-mode.css`, `mobile.css`, `form-feedback.css` — theme/responsive/validation layers.

## Organizations, employers, employees and access
- `src/app/organizations/*`, `src/app/employers/*`, `src/app/employees/*`.
- `src/app/access/page.tsx` — users and permissions, including independent report creation/transmission permissions.
- `src/components/employer-form.tsx`, `employee-form.tsx`, `employer-employees-panel.tsx`. Employee create/edit uses the shared Employer Interface option control for identifier type and supports Israeli ID (1) and passport (2); the selected type is propagated into manual/Excel report snapshots.
- `src/lib/access-scope.ts`.

## Pension products and reference controls
- `src/components/pension-products-editor.tsx`.
- `src/components/employee-pension-mix.tsx`.
- `src/components/pension-fund-select.tsx`.
- `src/components/reference-option-select.tsx`, `address-autocomplete-fields.tsx`, `salary-layer-select.tsx`.
- Reference APIs: `src/lib/reference-options-api.ts`, `address-reference-api.ts`, `bank-reference-api.ts`.

## Reporting / Employer Interface 006
- `src/app/reports/new/page.tsx` — new-report orchestration.
- `src/components/manual-report-data.tsx` — manual report flow.
- `src/components/manual-deposit-data.tsx` — deposit data.
- `src/components/excel-employee-intake.tsx` — Excel intake.
- `src/components/employer-interface-xml-intake.tsx` — XML/DAT/TST intake.
- `src/lib/employer-interface-api.ts`, `manual-deposits-api.ts`, `report-validation-api.ts`, `report-transmission-api.ts`, `report-feedback-api.ts`.
- `src/app/reports/page.tsx` surfaces both transmission history and correlated official Employer Interface 006 clearinghouse feedback returned by `report-feedback-api.ts`.

## Billing and payments
- `src/components/alpha-billing-account-form.tsx`.
- `src/components/subscription-billing-panel.tsx`.
- `src/components/billing-gate-modal.tsx`, `upgrade-modal.tsx`.
- Organization pension payment: `organization-pension-payment-account.tsx`.
- Related page styling: `src/app/payment-editor.css`.

## API/session
- `src/lib/api.ts` — broad API client and shared types/calls. Collection URLs are canonicalized without trailing slashes to avoid proxy/Next 308 redirects. Dashboard statistics use `/api/dashboard/stats` rather than fetching employer/employee collections for counts.
- `src/lib/backend-fetch.ts` — shared authenticated Backend transport. It applies development auth headers, treats the first Backend `401` as authoritative session expiry, clears browser/HttpOnly session state, and redirects to `/session-timeout`.
- `src/app/api/backend/[...path]/route.ts` — backend proxy.
- `src/lib/session.ts`, `src/lib/app-store.ts`, `src/components/session-timeout-guard.tsx`. Session metadata is hydrated once into Zustand and persisted without bearer tokens. The server-side `UserSession.LastActivityAt` remains the authoritative idle-timeout source of truth and every Backend request is checked by session middleware. `/api/auth/session` is not polled on navigation/focus; the guard performs an explicit validation only after the local 30-minute idle boundary (including return from a tab after that boundary). `/session-timeout` is rendered outside the authenticated `AppShell` so it remains visible after session state is cleared.
- Login/register/invite routes live under `src/app/login`, `register`, `invite`.

## Verification guardrails
- `scripts/check-ui-primitives.mjs` — shared UI primitive enforcement.
- `scripts/check-hardcoded-select-options.mjs` — guards against hard-coded select data.
- `.github/workflows/ci.yml` — authoritative CI sequence.
