# ALPHA Frontend code map

## App shell and global behavior
- `src/app/layout.tsx` — root layout and global providers/styles.
- `src/components/app-shell.tsx` / `persistent-app-layout.tsx` — application shell.
- `src/lib/app-store.ts` / `use-app-store.ts` — global Zustand state for browser session metadata, authorized scope, persisted organization/employer/employee selection and scope-derived permissions. `src/lib/app-data-cache.ts` de-duplicates `/api/scope` requests and stores the result in Zustand; `AppShell`, `ScopeController` and application screens consume the same global state.
- `src/components/scope-controller.tsx` — organization/employer scope selection. Dashboard initialization does not emit a synthetic `alpha:scope-change`; only real selection changes trigger dashboard reloads.
- `src/components/theme-provider.tsx` — theme state.
- `src/components/validation-ux-bridge.tsx` — maps server/notice validation into field UI.

## Shared UI and styles
- `src/components/ui-controls.tsx` — shared input, `UiCheckbox`, date, select, autocomplete and card primitives. All checkboxes use `UiCheckbox` rather than `UiInput type="checkbox"` so sizing, focus and accessibility remain consistent.
- `src/components/app-modal.tsx` — unified dialog shell with persistent header and close, scrollable body, nested scroll locking, and persistent footer. The footer automatically groups cancel/back on the RTL right and positive/submit actions on the left; secondary-styled affirmative actions can explicitly set `data-modal-side="positive"`.
- `src/components/ui-controls.tsx` — shared `UiSelect` and `UiAutocomplete` both portal their option lists to the document body and recompute viewport position on modal scroll, resizing and opening above a field when needed. This prevents option lists from changing the modal's scroll size or being clipped by modal/table overflow.
- `src/components/ui-selection-list.tsx` and `src/app/selection-and-scrollbars.css` — searchable multi-select assignment lists (referent cards stretch to the same height), theme-aware scrollbar and shared popup/footer styles.
- `src/components/data-table.tsx` — shared table primitive for consistent headers, rows, loading/empty states and windowed rendering. Its fixed table layout, per-column colgroup and stable scrollbar gutter prevent column widths changing when virtualization swaps rows. It supports infinite loading via `hasMore`/`onLoadMore`: screens with paged APIs append newly fetched batches to the rows already cached in the frontend; there is no table pagination UI. Table navigation must use `DataTableLink`, which disables Next.js route prefetch so a rendered table does not fan out into one RSC request per row. Application screens should not render raw HTML tables directly.
- `src/app/globals.css` — global design/layout rules.
- `src/app/ui-fixes.css` — cross-screen UI corrections, including autocomplete/report modal behavior.
- `src/app/dark-mode.css`, `mobile.css`, `form-feedback.css` — theme/responsive/validation layers.

## Organizations, employers, employees and access
- `src/components/referents-admin-tab.tsx` — platform-only referent lifecycle and cross-organization assignment UI within the admin tabs; `src/lib/api.ts` supplies typed endpoints. Organization profile differentiates general-edit access from organization user/billing administration.
- `src/app/organizations/page.tsx` — platform-admin organization creation using a shared modal. `src/lib/organization-types.ts` provides the two selectable categories (small/one employer, regular) shared with organization profile editing and list labels; existing legacy/self-service values remain readable without being offered as new choices.
- `src/components/employer-transfer-modal.tsx` — shared platform-admin transfer/receive UI for organization and employer profiles. Uses the admin transfer API, source-scope validation and global scope cache invalidation.
- `src/app/organizations/*`, `src/app/employers/*`, `src/app/employees/*`. Employer lifecycle status is managed from Employer Profile → General Details. Employer status is intentionally binary in the UI and API: Active ("פעיל") or Closed ("מבוטל"). New employers start Active; legacy Onboarding/Suspended rows are normalized by the Backend.
- `src/app/access/page.tsx` — users and permissions, including independent report creation/transmission permissions. Platform-admin "new user" lets the administrator choose a customer invitation or an internal referent; the referent path opens the shared admin referent creation flow with required cross-organization assignments.
- `src/components/employer-form.tsx`, `employee-form.tsx`, `employer-employees-panel.tsx`. Employee create/edit uses the shared Employer Interface option control for identifier type and supports Israeli ID (1) and passport (2); the selected type is propagated into manual/Excel report snapshots.
- `src/lib/access-scope.ts`.

## Pension products and reference controls
- `src/components/pension-products-editor.tsx`.
- `src/components/employee-pension-mix.tsx`.
- `src/components/pension-fund-select.tsx`.
- `src/components/reference-option-select.tsx`, `address-autocomplete-fields.tsx`, `salary-layer-select.tsx`.
- Reference APIs: `src/lib/reference-options-api.ts`, `address-reference-api.ts`, `bank-reference-api.ts`.

## Reporting / Employer Interface 006
- `src/app/reports/new/page.tsx` — new-report orchestration, wider desktop workspace, and resumable editable drafts loaded from scope-authorized `GET /manual-reports`. Persisted Excel/XML imports resume in the shared manual editor without re-uploading the source.
- `src/components/manual-report-data.tsx` — manual report flow.
- `src/components/manual-deposit-data.tsx` — per-employee/product deposit data and separately secured payment confirmations, through `payment-confirmations-api.ts`. Payment evidence is not a clearinghouse attachment.
- `src/components/excel-employee-intake.tsx` — Excel intake; shared `ui-file-upload.tsx` handles file inputs, drag/drop, type and size checks across Excel, XML, payment evidence and V006 attachment uploads.
- `src/components/employer-interface-xml-intake.tsx` — XML/DAT/TST intake.
- `src/lib/employer-interface-api.ts`, `manual-deposits-api.ts`, `report-validation-api.ts`, `report-transmission-api.ts`, `report-feedback-api.ts`.
- `src/app/reports/page.tsx` surfaces both transmission history and correlated official Employer Interface 006 clearinghouse feedback returned by `report-feedback-api.ts`.

## Billing and payments
- `src/app/admin/page.tsx` — billing and pricing administration table links directly to the relevant organization/employer `?tab=billing` or `?tab=pension-payment` card rather than opening a separate pricing edit modal. Employer links include `organizationId` to preserve the target scope.
- `src/components/alpha-billing-account-form.tsx`.
- `src/components/subscription-billing-panel.tsx`.
- `src/components/billing-gate-modal.tsx`, `upgrade-modal.tsx`.
- Organization pension payment: `organization-pension-payment-account.tsx`.
- Related page styling: `src/app/payment-editor.css`.

## API/session
- Auth session metadata carries `isReferent` for staff-specific UI (hiding self-service subscription management for internal referents); the server continues to authorize every request from database assignments.
- `src/lib/api.ts` — broad API client and shared types/calls. Collection URLs are canonicalized without trailing slashes to avoid proxy/Next 308 redirects. Dashboard statistics use `/api/dashboard/stats` rather than fetching employer/employee collections for counts.
- `src/lib/backend-fetch.ts` — shared authenticated Backend transport. It applies development auth headers, treats the first Backend `401` as authoritative session expiry, clears browser/HttpOnly session state, and redirects to `/session-timeout`.
- `src/app/api/backend/[...path]/route.ts` — backend proxy.
- `src/lib/session.ts`, `src/lib/app-store.ts`, `src/components/session-timeout-guard.tsx`. Session metadata is hydrated once into Zustand and persisted without bearer tokens. The server-side `UserSession.LastActivityAt` remains the authoritative idle-timeout source of truth and every Backend request is checked by session middleware. `/api/auth/session` is not polled on navigation/focus; the guard performs an explicit validation only after the local 30-minute idle boundary (including return from a tab after that boundary). `/session-timeout` is rendered outside the authenticated `AppShell` so it remains visible after session state is cleared.
- Login/register/invite routes live under `src/app/login`, `register`, `invite`.

## Verification guardrails
- `scripts/check-ui-primitives.mjs` — shared UI primitive, checkbox and modal-shell enforcement (rejects raw/UiInput checkboxes and local checkbox roles). All modal dialogs must render through `AppModal`; the anchored accessibility popover is a non-modal exception.
- `scripts/check-hardcoded-select-options.mjs` — guards against hard-coded select data.
- `.github/workflows/ci.yml` — authoritative CI sequence.

- Financial report attachments and payment evidence use the shared file picker with an initial 3 MB upload ceiling to match the Cloudmersive free-evaluation scanning integration. Server-side endpoint and scanner validate the limit independently; increase both only after a commercially suitable scanning plan is configured.

- Deposit payment editor preserves explicitly saved payment-method overrides even when a pension-debit mandate exists. Method 6 is only an initial default; users can select an official manual method and provide bank/reference/date details. Payment-evidence documents remain visible and downloadable for any current-report payment mode, while optional date/documents under method 6 stay operational-only and are not exported into irrelevant V006 fields.

- `המשך דיווח קיים` is a fourth reporting-type card. Open drafts show today/yesterday or date, plus Israel-local 24-hour time.
- An active pension-debit mandate locks current-report payment method to code 6, while allowing operational-only bank, branch, account, reference, value date and evidence in the editor. Actual mandate account changes belong to the employer payment-account setup; official V006 code 6 emits zeroed employer account fields. Deposit receipt codes display the official Hebrew text, fetched from backend option data.

- The existing-draft card uses the shared virtualized `DataTable` with a 340px scrolling viewport and built-in incremental loading; pension bank selection in the deposit editor uses the shared `UiAutocomplete` as the only bank field. For payment code 6, stored bank/reference/date entries do not override official V006's zeroed employer-bank export (users must choose a suitable payment method for real account details to appear in the XML).

- The deposit grid fetches report-wide evidence in one scoped call and presents per-product downloadable proof links (all saved versions). The modal keeps the grid's evidence state in sync immediately after upload. Payment dates rely on the single global `UiDateInput` calendar icon; the mandate account prefills from the authorized encrypted DB resolution with a valid numeric check.


- Postal code and post-office box are edited in the employee profile only. The report product modal links to the employee card in a new tab; editing the card synchronizes matching editable draft address snapshots via backend but never alters submitted reports.

- Failed employee, deposit or final validation opens `ReportValidationErrorsModal` via the shared `AppModal` shell. It presents contextual Hebrew guidance with expandable original technical codes/messages, a UTF-8 BOM CSV export, and a button to close and resume editing. Backend validation responses remain the single source of truth; no front-end silent auto-correction.

- Shared DataTable now supports optional `expandedRowComponent(item)`, `expandedRowComponentSize` (number or callback), default/controlled expanded-row keys, change events and optional click-to-expand. Prefix-sum offsets virtualize variable-height expanded rows using stable `rowKey`, retaining expansion across infinite-load batches and keeping all columns fixed. Existing tables do not change unless an expansion renderer is provided.

- Reports & Feedback reuses `DataTable.expandedRowComponent` for lazy-loaded per-report deposit subrows. It fetches authorized deposit snapshots plus official report feedback, displays correlated 006 contribution-record feedback when available and distinguishes unmatched report-level feedback. Deposit editing reuses the shared `DepositPaymentEditor` only while report status is editable; immutable sent/submitted reports open the same modal read-only and require a formal correction report for changes. Expanded contents remain cached across virtualization remounts, with explicit load-more for long reports.
