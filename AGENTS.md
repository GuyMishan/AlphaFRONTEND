# ALPHA Frontend agent guide

## Purpose
This repository is the employer-facing ALPHA pension operations application. It is a Next.js 16 App Router application and talks to AlphaBACKEND through the server-side `/api/backend/*` proxy.

## Before changing code
1. Read `docs/CODEMAP.md` and the files in the affected flow.
2. Trace shared components, validation, CSS overrides and API calls before patching a page locally.
3. Prefer fixing shared primitives when the behavior is intended system-wide.
4. Treat the current code and API contracts as source of truth; README text may lag behind implementation.

## UI invariants
- Hebrew UI is RTL. Numeric/account identifiers may require explicit LTR handling.
- Dates are displayed DD/MM/YYYY through the shared date controls/helpers.
- Reuse shared controls from `src/components/ui-controls.tsx` instead of native ad-hoc controls.
- Keep Dark/Light, responsive behavior, keyboard interaction, ARIA and disabled states intact.
- Check global CSS plus page/modal-specific CSS before adding overrides.
- Validation can come from component props, native browser validity and `ValidationUxBridge`; a fix must account for all relevant layers.
- Do not create a page-specific workaround for a shared control unless the behavior is genuinely page-specific.

## Main integration boundaries
- Backend client/contracts: `src/lib/api.ts` and focused API modules in `src/lib/*-api.ts`.
- Backend proxy: `src/app/api/backend/[...path]/route.ts`.
- Scope/permissions: `src/components/scope-controller.tsx`, `src/lib/access-scope.ts`.
- Reporting/V006: reports pages plus manual report/deposit, XML and Excel components.
- Billing: billing account, subscription and upgrade components.

## Verification
For changes, run the relevant checks and before considering a broad change complete run:
```bash
npm run verify
```
Do not claim a build passed unless it was actually run or CI confirms it.

## Documentation
Update `docs/CODEMAP.md` when a major flow moves or a new shared subsystem is introduced. Keep detailed business rules in backend/domain documentation rather than duplicating volatile values here.
