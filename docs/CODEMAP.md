# ALPHA Frontend code map

Where things live. Conventions and the reasons behind them: `docs/ARCHITECTURE.md`; recipes: `docs/DEVELOPMENT.md`; visual conventions: `docs/DESIGN-SYSTEM.md`. Business rules (Employer Interface 006, billing, feedback playbooks) are owned by the backend and its documentation; the frontend only presents them.

Route files `src/app/**/page.tsx` only re-export a screen from `src/features/<feature>/screens/`; `loading.tsx` files only re-export the shell's `RouteLoading`.

## App shell and session

| Path | Responsibility |
| --- | --- |
| `src/app/layout.tsx` | Root layout: global stylesheets in cascade order, `QueryProvider`, `ThemeProvider`, `AlphaToaster`, `ValidationUxBridge`, `SessionTimeoutGuard` |
| `src/features/shell/components/persistent-app-layout.tsx` | Lists the public routes rendered without the shell (`/login`, `/register`, `/invite`, `/session-timeout`); `isPublicPath` |
| `src/features/shell/components/app-shell.tsx` | Authenticated shell: navigation rail (sections from the access scope, `useLinkStatus` pending state), topbar with the TanStack Query fetch indicator, `AppLoader` while the session and scope resolve, route guards, self-service onboarding, plan-upgrade dialog (`subscribeToApiErrors`) |
| `src/features/shell/components/route-loading.tsx` | Route loading UI re-exported by `src/app/**/loading.tsx`: page skeleton inside the shell, `AppLoader` on public pages |
| `src/lib/session/` | `app-store.ts` (Zustand: session display metadata, selected organization/employer/employee), `storage.ts` (persistence, never tokens), `lifecycle.ts` (logout, expiry, multi-tab broadcast) |
| `src/features/auth/` | Login/OTP, registration, invitation and session-timeout screens; `session-timeout-guard.tsx` (local 30-minute idle check, then server validation); `restore-session.ts` (`resolveSession`: one backend check for a tab without session metadata); `api.ts` maps auth error codes to Hebrew |
| `src/features/scope/` | `scope-context.ts` (`/api/scope` query), `components/scope-controller.tsx` (organization/employer/employee selection), `scope-events.ts` (page scope resolved/changed), `use-employer-scope.ts` |
| `src/features/settings/` | Theme provider (light/dark/system saved to user preferences; follows the session in the app store), `theme-init.ts` (storage keys and the pre-paint script inlined in the root layout's `<head>`, so the saved theme and accessibility modes apply before first paint), and the settings screen |

## Shared UI (`src/components`)

| Path | Responsibility |
| --- | --- |
| `ui/ui-controls.tsx` | `UiInput`, `UiTextarea`, `UiCheckbox`, `UiDateInput` (DD/MM/YYYY), `UiSelect`, `UiAutocomplete`, `UiActionMenu`. Option lists and menus are portaled to `document.body` so modals and tables never clip them |
| `ui/floating-menu.ts` | Shared viewport placement, outside-focus/pointer dismissal and Escape handling for select, autocomplete and action menus; enabled-option navigation |
| `ui/ui-action-menu.tsx` | Action-menu implementation, exposed through the existing `ui-controls.tsx` import path; owns menu keyboard navigation and focus |
| `ui/app-modal.tsx` | The only dialog shell: fixed header/footer, scrollable body, nested scroll locking; cancel/back on the RTL right, positive actions on the left (`data-modal-side="positive"`) |
| `ui/data-table.tsx` | The only table: fixed layout, windowed rows, infinite loading (`hasMore`/`onLoadMore`), optional expandable rows (`expandedRowComponent`, `canExpandRow`, `expandToggleColumnKey`); links use `DataTableLink` (no prefetch) |
| `ui/ui-file-upload.tsx` | File picker with drag/drop, type and size checks (each caller passes the backend's limit) |
| `ui/ui-selection-list.tsx`, `ui/app-tabs.tsx`, `ui/tooltip.tsx`, `ui/notifications.tsx`, `ui/alpha-toaster.tsx` | Searchable multi-select, tabs, tooltip, `notify` toasts and the single branded Sonner host (`AlphaToaster`, mounted by the root layout) |
| `forms/form-feedback.tsx`, `forms/form-select.tsx` | `Field` (label + error), `FormSelect` (`UiSelect` bound to React Hook Form) |
| `forms/validation-ux-bridge.tsx` | Highlights fields from error notices and server validation for forms not on React Hook Form |
| `layout/page-header.tsx`, `layout/accessibility-menu.tsx` | `PageHeader` (every page title), accessibility menu |
| `brand/` | `AlphaLogo`, `AlphaSymbol` (inline, themeable marks from `public/branding`), `Brand` lockup |
| `loading/` | `AppLoader`, `LoadingState`, `Spinner`, skeletons (`PageSkeleton`, `TableSkeleton`, `CardSkeleton`, `FormSkeleton`, `StatGridSkeleton`) |
| `ui/stat-card.tsx`, `ui/empty-state.tsx` | `StatCard`, `EmptyState` |

Styles (`docs/DESIGN-SYSTEM.md`): `src/styles/theme` (palette and semantic tokens, light and dark), `foundation.css`, `components/` (one file per shared pattern), `layout/` (shell, auth pages), `features/` (management screens, reporting, report feedback, payment editor); screen-only styles sit next to the screen (`dashboard-screen.css`, `reports-screen.css`). The browser icon is `src/app/icon.svg`; brand source files are in `public/branding/`.

## Infrastructure (`src/lib`)

| Path | Responsibility |
| --- | --- |
| `api/client.ts`, `api/transport.ts` | `apiRequest`, `apiBlob`, `queryString`, `subscribeToApiErrors`; same-origin transport, global 401 → session expiry |
| `api/errors.ts`, `api/error-messages.ts` | `ApiError` (kind, status, `code`, `fieldErrors`, `traceId`, `problem`) and the Hebrew message policy |
| `api/paging.ts` | `PagedResult` (`{ items, hasMore }`, offset paging with `skip`/`take`), `collectPages` for flows that need a complete list |
| `query/` | `QueryClient` defaults and provider |
| `forms/` | `useZodForm`, shared Zod rules, input masks, `applyServerErrors`, validators |
| `format/` | Dates (DD/MM/YYYY), reporting months, money |
| `server/backend.ts` | Server-only: backend URL, session cookie, cross-site request check |
| `download.ts`, `browser-storage.ts`, `url-search-params.ts`, `hooks/` | `saveBlob`; Web Storage that never throws; `replaceSearchParams` (query state in sync with `useSearchParams`); `useDebouncedValue`, `useUrlScope`, `useLatestRequest` (drops stale replies after a scope change) |

Server routes: `src/app/api/backend/[...path]/route.ts` (proxy) and `src/app/api/session/logout/route.ts`.

## Features

### Organizations, employers, employees, access
- `organizations/` — list and creation (platform admin), profile screen, general details form, `organization-types.ts` (selectable categories).
- `employers/` — list, creation, profile screen with tabs in `components/profile/` (general, employees, pension payment, billing, reporting); shared `employer-transfer-modal.tsx` (platform admin hierarchy only), `employer-documents-tab.tsx` + `documents-api.ts` (employer and pension-product PDF library), `employer-status.ts` (Active/Closed).
- `employees/` — list, creation, profile; `employee-form.tsx`, `employee-pension-mix.tsx` (pension products + product documents), `excel-employee-intake.tsx`, `inline-employee-create-modal.tsx`.
- `employeesApi.employees` collects the `/employees/search` pages, including beyond 500 rows; the report wizard and employee selectors use the complete list. Profile URL scope and tabs follow Next navigation; employee forms and employer editors are keyed by scope/entity so cached navigation cannot reuse another entity's draft.
- `access/` — users, roles, permissions, employer assignments and invitations (`access-screen.tsx`). The user editor lets authorized managers switch organization/employer access, while platform-admin assignment is restricted to existing platform admins; the backend applies transitions atomically within one organization.
- `admin/` — platform administration: billing customers, reference-data integrations, platform users, referents (`referents-admin-tab.tsx`), and the organization/employer hierarchy (`components/organization-hierarchy-admin-tab.tsx`). The hierarchy tab owns reassignment UI, reusing `EmployerTransferModal`. The underlying employer model currently requires an organization; unassigned employers are not supported.

Organization profile → Employers lists employers, allows direct active/closed status changes for users with employer access, and links to the existing new-employer screen with the organization ID. It does not offer transfer or attach-existing operations; these are central to the platform-admin hierarchy tab.

### Pension products and reference data
- `pension/components/pension-products-editor.tsx` — the shared product/contribution editor (employee pension mix and report drafts); `pension-fund-select.tsx`, `salary-layer-select.tsx`, `contribution-math.ts`.
- `pension/components/pension-products-editor.tsx` validates local, status-independent 006 input rules (e.g. insurance exempt payments/code 74, monetary precision, policy length and product dates) in both employee and report editors; salaried Regulation-19 relationship rules remain employee-only until the report's deposit status is known.
- `reference-data/` — banks, branches, cities, streets, option lists, salary layers and the pension-editor option bundle; `reference-option-select.tsx`, `address-autocomplete-fields.tsx`. Autocompletes load suggestions only when opened.

### Reporting (Employer Interface 006)
- `reporting/screens/new-report-screen.tsx` — route composition: resolves employer scope and setup, parses the URL entry and mounts the wizard. Each employer/URL entry gets a fresh workspace, including follow-up corrections and back/forward navigation.
- `reporting/new-report/model.ts` — typed draft state, URL entry and shared stage numbering. `use-report-wizard.ts` owns local draft state, resumption and import callbacks; `use-report-wizard-actions.ts` owns stage validation/advancement and transmission.
- `reporting/new-report/use-report-setup.ts`, `use-report-billing.ts`, `use-report-sources.ts`, `use-open-report-drafts.ts`, `use-report-resolution.ts` — setup query, billing gate, correction source search, resumable drafts and feedback links. These responsibilities do not live in screen JSX.
- `reporting/new-report/draft-operations.ts` and `import-excel-report.ts` — persistence workflows, with no rendering or navigation. A newly created draft ID is retained before later reads/writes so retries can reuse it. Complete employee lists use `collectPages`.
- `reporting/components/new-report/` — `report-wizard.tsx` composes stages, footer and dialogs; `report-wizard-stages.tsx` selects the active editor, `report-wizard-footer.tsx` renders navigation, and `report-wizard-dialogs.tsx` renders billing, deletion and validation dialogs. Details and summary have their own presentation components. Source selection and open drafts reuse `report-selection-table.tsx` for identical columns, formatting and month-search UI. Correction selection opens its workspace and advances immediately through the existing payment/billing gate; resuming a draft loads its existing editable report immediately. Source search is server-side, while draft search exhausts available paged drafts before applying its month filter. Both keep their distinct eligible records and actions.
- `reporting/components/manual-report-data.tsx` (employees and products), `manual-deposit-data.tsx` + `deposit-payment-editor.tsx` (payment details, V006 metadata, payment evidence, report attachments), `employer-interface-xml-intake.tsx` (XML/DAT/TST import), `report-validation-errors-modal.tsx`, `salary-template-tools.tsx` (template in `public/templates/`).
- API modules: `api.ts` (drafts), `deposits-api.ts`, `validation-api.ts`, `transmission-api.ts`, `derived-reports-api.ts` (corrections and differences), `attachments-api.ts`, `payment-confirmations-api.ts`, `employer-interface-api.ts` (006 profiles, metadata, preflight, options).
- `reporting/screens/reports-screen.tsx` — Reports & Feedback composition: header/summary plus the filter, table and dialog components in `components/reports/`. A change of employer mounts a fresh workspace.
- `reporting/hooks/use-reports-view.ts` owns the filtered query and column preferences; `use-report-deposits.ts` owns expanded deposit paging and manufacturer filtering; `use-report-actions.ts` owns exports, correction/transmission actions and dialog state. `components/reports/report-columns.tsx` owns cell renderers and row actions; `reports-view-model.ts` owns column/filter metadata. The actions column stays pinned while the grid scrolls (`src/styles/features/report-feedback.css`).

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
- `dashboard/` — statistics from `/api/dashboard/stats` and plan usage; brand hero, employer picker and quick actions (`dashboard-screen.css`).

## Quality gates

| Check | Purpose |
| --- | --- |
| `npm run test` | Vitest (`src/**/*.test.ts`): API client and errors, proxy/logout security, form schemas |
| `scripts/check-ui-primitives.mjs` | Shared controls, checkboxes and `AppModal` only |
| `scripts/check-design-tokens.mjs` | No raw colors, palette references or retired token names outside `src/styles/theme`; every `var(--*)` used is defined |
| `scripts/check-hardcoded-select-options.mjs` | Select data comes from reference data, not literals |
| `scripts/check-v006-preventable-validations.mjs` | V006 validation ownership split |
| `scripts/check-regex-escaping.mjs` | No double-escaped regex literals |
| `.github/workflows/ci.yml` | The authoritative CI sequence (same as `npm run verify`) |

Reporting pre-send validation modal: `reporting/components/report-validation-errors-modal.tsx` groups by exact backend error code using `reporting/validation-groups.ts`, preserves every scoped issue in XLSX, resolves report employee names, and navigates to report/employee/product/payment editing in the wizard.

User list filtering: the global platform-administrator view uses `/api/platform/users` and hides the shell scope picker; organization scope lists all non-platform users linked by membership or direct employer access, while selecting an employer returns direct employer users only. Filtering is enforced server-side for tenant-scoped users.

Address suggestions use `useCities` / `useStreets` in `features/reference-data/queries.ts`, with query keys including the search and city code. `AddressAutocompleteFields` debounces input, hides results for earlier input, and distinguishes loading, no matching city, empty streets and request failures. It preserves free-text entry; reference lookups do not impose new business validation.

## Public legal policy

`/legal` renders `src/features/legal/screens/legal-policy-screen.tsx` without the authenticated shell. The screen uses `src/features/legal/api.ts` and the anonymous shared API `/api/legal-document/active`; the same backend Markdown is exposed on the marketing website. The app sidebar links to it under Sign out, and the page shows the document version and application package version.

## Employer agreement gate (legal stage 4)

The shared `src/features/employers/components/employer-documents-tab.tsx` displays the employer-wide type-7 ALPHA agreement in the existing employer Documents tab, with the shared accessible Tooltip explaining that uploading constitutes employer acceptance. The existing `documents-api.ts` transports the PDF through the backend scan/encryption pathway. `src/features/reporting/transmission-api.ts` and shared API error messages surface HTTP 409 `employer_legal_agreement_required` returned from server-controlled send/resume gates. No separate agreement screen or parallel document store.

## Shared legal consent and settings

Registration and login use `features/auth/components/legal-consent-modal.tsx`. Only after successful login OTP verification does the login screen check `legalConsentRequired` and block navigation until the active legal version is accepted. Visiting `/login` with an existing cookie does not automatically open the consent modal; OTP is required first. `PersistentAppLayout` checks authenticated routes as defense in depth and redirects outstanding consent to `/login`, rather than opening a modal over the app loader. The login screen owns the required modal for both OTP and existing-cookie entry. The Settings screen uses `features/settings/api.ts` to edit optional marketing email consent. Backend rejects protected production APIs until latest policy consent is given.
