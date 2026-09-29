# ALPHA Frontend code map

## App shell and global behavior
- `src/app/layout.tsx` — root layout and global providers/styles.
- `src/components/app-shell.tsx` / `persistent-app-layout.tsx` — application shell.
- `src/components/scope-controller.tsx` — organization/employer scope selection.
- `src/components/theme-provider.tsx` — theme state.
- `src/components/validation-ux-bridge.tsx` — maps server/notice validation into field UI.

## Shared UI and styles
- `src/components/ui-controls.tsx` — shared input, date, select, autocomplete and card primitives.
- `src/components/app-modal.tsx` — shared modal.
- `src/app/globals.css` — global design/layout rules.
- `src/app/ui-fixes.css` — cross-screen UI corrections, including autocomplete/report modal behavior.
- `src/app/dark-mode.css`, `mobile.css`, `form-feedback.css` — theme/responsive/validation layers.

## Organizations, employers, employees and access
- `src/app/organizations/*`, `src/app/employers/*`, `src/app/employees/*`.
- `src/app/access/page.tsx` — users and permissions, including independent report creation/transmission permissions.
- `src/components/employer-form.tsx`, `employee-form.tsx`, `employer-employees-panel.tsx`.
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
- `src/lib/api.ts` — broad API client and shared types/calls.
- `src/app/api/backend/[...path]/route.ts` — backend proxy.
- `src/lib/session.ts`, `src/components/session-timeout-guard.tsx`.
- Login/register/invite routes live under `src/app/login`, `register`, `invite`.

## Verification guardrails
- `scripts/check-ui-primitives.mjs` — shared UI primitive enforcement.
- `scripts/check-hardcoded-select-options.mjs` — guards against hard-coded select data.
- `.github/workflows/ci.yml` — authoritative CI sequence.
