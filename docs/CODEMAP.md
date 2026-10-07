# ALPHA Frontend code map

## App shell and global behavior
- `src/app/layout.tsx` — root layout and global providers/styles.
- `src/components/app-shell.tsx` / `persistent-app-layout.tsx` — application shell.
- `src/lib/app-store.ts` / `use-app-store.ts` — global Zustand state for browser session metadata, authorized scope, persisted organization/employer/employee selection and scope-derived permissions. `src/lib/app-data-cache.ts` de-duplicates `/api/scope` requests and stores the result in Zustand; `AppShell`, `ScopeController` and application screens consume the same global state.
- `src/components/scope-controller.tsx` — organization/employer scope selection. Dashboard initialization does not emit a synthetic `alpha:scope-change`; only real selection changes trigger dashboard reloads.
- `src/components/theme-provider.tsx` — theme state.
- `src/components/validation-ux-bridge.tsx` — maps server/notice validation into field UI.

## Shared UI and styles
- `src/components/ui-controls.tsx` — shared input, `UiCheckbox`, date, select, autocomplete, card and portal-based `UiActionMenu` primitives. `UiActionMenu` renders its three-dot menu into `document.body`, sizes vertically to its complete action list without an internal scrollbar, and repositions above the trigger when the full menu fits better there; row actions are therefore not clipped by virtualized table overflow. All checkboxes use `UiCheckbox` rather than `UiInput type="checkbox"` so sizing, focus and accessibility remain consistent.
- `src/components/app-modal.tsx` — unified dialog shell with persistent header and close, scrollable body, nested scroll locking, and persistent footer. The footer automatically groups cancel/back on the RTL right and positive/submit actions on the left; secondary-styled affirmative actions can explicitly set `data-modal-side="positive"`.
- `src/components/ui-controls.tsx` — shared `UiSelect` and `UiAutocomplete` both portal their option lists to the document body and recompute viewport position on modal scroll, resizing and opening above a field when needed. This prevents option lists from changing the modal's scroll size or being clipped by modal/table overflow.
- `src/components/ui-selection-list.tsx` and `src/app/selection-and-scrollbars.css` — searchable multi-select assignment lists (referent cards stretch to the same height), theme-aware scrollbar and shared popup/footer styles.
- `src/components/data-table.tsx` — shared table primitive for consistent headers, rows, loading/empty states and windowed rendering. Expandable tables may provide `canExpandRow(item)` to suppress the toggle and panel for rows whose detail view is not meaningful. When `expandToggleColumnKey` places the expander in an actions column, DataTable groups it inline with the cell's action control and gives the expander the same compact bordered treatment as the shared three-dot action trigger. Its fixed table layout, per-column colgroup and stable scrollbar gutter prevent column widths changing when virtualization swaps rows. It supports infinite loading via `hasMore`/`onLoadMore`: screens with paged APIs append newly fetched batches to the rows already cached in the frontend; there is no table pagination UI. Table navigation must use `DataTableLink`, which disables Next.js route prefetch so a rendered table does not fan out into one RSC request per row. Application screens should not render raw HTML tables directly.
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
- `src/components/pension-products-editor.tsx` — shared pension editor uses the same canonical contribution mapping as the backend (employee Benefits -> official SUG-HAFRASHA 2; employee Severance -> official code 4). In report drafts it only applies V006 rules knowable before official deposit metadata exists, notably future salary month (27) and same-draft product/month duplicate detection (28/43); it intentionally defers deposit-status-dependent Regulation 19 rules instead of guessing salaried status. `src/components/manual-deposit-data.tsx` owns the immediate frontend checks for 16/17/23/53/71/72/75 once the real deposit/employee status is selected, using canonical yearly limits supplied by the backend. Historical/cross-report and correction-lineage checks (28/43/50/100/101) remain authoritative backend validation. `scripts/check-v006-preventable-validations.mjs` guards this ownership split in frontend CI.
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
- `src/app/reports/page.tsx` is the unified Reports & Feedback operations screen. It keeps the report grid compact (including payoff rate), uses server-side dynamic filters and a persisted column chooser, expands reports into employee+product rows, and opens `report-deposit-feedback-modal.tsx` for employer-vs-manufacturer contribution comparison, financial feedback, manual treatment status/free-text notes and treatment history. Treatment saves send the `updatedAt` version observed by the modal so stale operators receive a conflict instead of overwriting a newer treatment. `report-feedback-api.ts` consumes normalized official Employer Interface 006 feedback; immutable submitted reports enter the formal focused correction flow instead of being edited in place.
- Feedback viewing now uses one generic entry point, `report-feedback-modal.tsx`, with exactly three modes: `employer`, `report`, and `deposit`. The same entry point now also owns a two-state modal flow: `view` keeps the existing feedback/details presentation, while `resolve` loads the Backend resolution-context contract through `feedback-resolution-mode.tsx`. Group and per-error CTAs switch the existing modal into resolution mode rather than opening another dialog. Stage 3 deliberately renders a placeholder resolver and raw problem progression only; resolver-specific editors and queue/grouping behavior remain separate later stages. Employer mode shows employer details plus employer-scope issues; report mode shows report summary plus report issues followed by employer issues affecting that report; deposit mode reuses the existing detailed employee+product modal and orders issues employee → deposit/product → contribution → report → employer. `feedback-resolve-button.tsx` provides the repeated branded issue action. Group and per-error resolution buttons are active once a playbook-backed resolution context exists; contribution-scoped selections fail closed to the exact contribution and never fall back to a different row that merely shares the same error code. Deposit rows expose two distinct states of the same deposit feedback modal: the red `שגיאות` entry opens the full deposit details layout with error UI enabled, while the three-dot `צפייה בהפקדה` opens the identical layout with error UI hidden. Employee/deposit errors are grouped at the top; contribution errors stay attached to the exact contribution row, including multiple errors per contribution. Employer/report entry points use red error language; the green branded action is reserved for `פתור בעיה` inside error modals. The employer error section includes an explicit `פתור בעיות` CTA. Report error counts and report modals include report-scope issues only.

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

- Failed employee, deposit or final validation opens `ReportValidationErrorsModal` via the shared `AppModal` shell. It presents contextual Hebrew guidance with expandable original technical codes/messages, an XLSX export, and a button to close and resume editing. Backend validation responses remain the single source of truth; no front-end silent auto-correction.

- Shared DataTable now supports optional `expandedRowComponent(item)`, `expandedRowComponentSize` (number or callback), default/controlled expanded-row keys, change events and optional click-to-expand. Prefix-sum offsets virtualize variable-height expanded rows using stable `rowKey`, retaining expansion across infinite-load batches and keeping all columns fixed. Existing tables do not change unless an expansion renderer is provided.

- Reports & Feedback reuses `DataTable.expandedRowComponent` for lazy-loaded per-report deposit subrows. Parent report rows use one compact portal-based three-dot action menu: editable drafts offer “עריכת הדיווח”, eligible submitted reports offer “יצירת דיווח מתקן”, and all export variants live in the same menu. Editable/not-yet-sent reports deep-link with `resumeReportId` into the exact persisted draft in `/reports/new`; these not-sent rows intentionally do not expose expansion because their employee/deposit contents are still mutable and the report wizard is the source of truth until submission. Submitted/attempted reports retain the expansion arrow. Employee+product rows also use one compact three-dot menu containing read-only “צפייה” and, only while editable, “עריכה”. “יצירת דיווח מתקן” exists only at report level. Every employee+product row has one consistent read-only “צפייה” action that opens `report-deposit-feedback-modal.tsx`: the modal always shows the reported employee/product, payment/reference data, downloadable payment evidence and reported contribution components; when official feedback exists it additionally shows employer-vs-manufacturer reconciliation, money state and read-only treatment/history, while a no-feedback row shows only a compact “טרם התקבל משוב” badge rather than empty waiting sections. A separate “עריכה” action appears only while the report is actually editable and opens the shared `DepositPaymentEditor` from the wizard's deposit-data step. Immutable sent/submitted rows therefore have no duplicate read-only payment-editor action. Exact product loading uses the backend `reportProductId` filter rather than full-name search. Expanded contents remain cached across virtualization remounts, with explicit load-more for long reports.

- The reports/feedback parent grid now paginates through the existing report-feedback endpoint via shared DataTable infinite loading, while lazy expansion independently pages each report's deposit rows. Each expanded report also receives the complete distinct manufacturer list for that report and exposes a shared `UiAutocomplete` manufacturer filter; filtering is executed server-side so it remains correct across deposit pagination. Historical payment modals explicitly guard every upload/remove/save action in read-only mode, not merely disabled form controls.

- Shared DataTable supports optional `expandToggleColumnKey` for placement in an existing non-first column; Reports & Feedback places its expand control after its existing Details action. Deposit subrow values are vertically centered and no longer duplicate the report-level feedback action. The shared DepositPaymentEditor renders one evidence panel, keeping downloads outside the disabled form for immutable report viewing and hiding uploads for non-editable reports; summary values share right-aligned RTL styling.

- Free-plan utilization cards on Dashboard, Employees and Organization → Employers are displayed only when the entitlement plan code is `FREE`. Paid customers retain ordinary employee/employer counts and the dedicated subscription/billing interfaces; paid pricing remains visible in authorized billing/admin surfaces.

- Focused correction entry from Reports & Feedback passes the source report/product to `/reports/new`; derived-report creation can clone only that selected source product while preserving the normal 006 correction rules and immutable-source behavior.

- Report-row three-dot actions expose formal correction entry plus the three authorized backend CSV exports (employee/contribution detail, deposit summary and manufacturer feedback); these menus are portaled above table overflow rather than rendered inside the virtualized viewport.


## Correction drafts, retransmission and deletion
- Reports & Feedback treats transmitted reports as immutable history. “תקן דיווח” creates or resumes one internal full-report correction workspace; per-deposit “תיקון הפקדה” edits the matching version inside that workspace instead of changing the transmitted source row.
- Multiple deposit/report edits accumulate in the same correction workspace. “דיווח חוזר” materializes all pending changes into the official Employer Interface 006 sequence and routes the user through the generated negative cancellation before the follow-up current correction.
- Product lineage is preserved through `sourceReportProductId` in the report editor. The shared pension-products editor carries this optional identifier through normalization so saving an employee does not break deposit history.
- Editable drafts that have never had an external transmission may be deleted from Reports & Feedback or from “המשך דיווח קיים”. The frontend always uses the shared `AppModal` confirmation; the backend remains authoritative about whether deletion is still allowed.
- A generated correction workspace is an internal Differences draft and is hidden from the normal resumable-drafts list. When opened explicitly from Reports & Feedback it can be edited fully, then saved and returned to Reports & Feedback for “דיווח חוזר”.


- “דיווח חוזר” no longer asks for one global operation 2/3. The backend resolves the correction operation independently per changed deposit/product, so one retransmission may correctly contain both no-money corrections and additional-money corrections.


- Correction editor products also carry `workspaceReportProductId`. This keeps newly-added products stable across repeated saves even though they have no immutable `SourceReportProductId` yet, preventing duplicate products inside the same correction workspace.


- The correction-workspace deposit editor now has an explicit per-transfer choice between operation 2 (no additional deposit) and operation 3 (additional deposit), including the mandatory additional amount for operation 3. The backend reports correction-workspace context on deposit rows and applies the selected operation/payment details across the same V006 fund transfer.


- In correction-workspace UI, structural add/remove controls are disabled: employee selection is locked and the shared pension-product editor receives `allowAdd=false` / `allowRemove=false`. Users can still edit the source-backed employee/product values and deposits that the backend can version safely.


- Correction workspaces are full desired next-revision snapshots: employee and product add/remove controls remain available. Backend delta materialization compares the workspace with the last effective revision and emits only required V006 technical documents.
- Existing source-backed products use correction operation 2/3 as needed; newly added products are ordinary current operation 1 records and expose the normal V006 payment/metadata editor.
- “דיווח חוזר” remains report-level only and handles all delta shapes: negative-only, current-only, or negative followed by current.

- Reports & Feedback deposit rows summarize crowded manufacturer feedback tooltips by business scope once there are more than three distinct errors. Deposit details show all actionable errors grouped for users by deposit/product, employee, employer, report and contribution scopes (the internal backend scope remains `money` for compatibility), while contribution cards still show local numeric/context detail.

- `PensionProductsEditor` owns pension-editor reference data in component-local state. It loads the bundled `/api/reference-data/pension-editor-options` response once per mounted editor and supplies the resulting option arrays to all child selects. No module/global cache is used, so closing the editor releases the data and multiple product rows do not duplicate reference-data requests.

- Reference-data request discipline: repeated select/autocomplete fields should not fetch independently on mount. `EmployeeForm` bundles identifier/gender options in local form state; `DepositPaymentEditor` bundles its static Employer Interface option families in local modal state; address and bank/branch autocompletes load remote suggestions only after the user opens/interacts with the field; `PensionFundSelect` searches only while its autocomplete is open. Dynamic dependent lookups (for example payment methods by operation code) remain request-driven because their option set changes with user state.
