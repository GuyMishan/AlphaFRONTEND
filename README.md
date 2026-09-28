# Alpha Frontend

Employer-facing web application for **ALPHA**, a multi-tenant pension operations platform.

## Stack

- Next.js 16.3.5 (App Router)
- React 19
- TypeScript
- Server-side proxy to AlphaBACKEND through `/api/backend/*`

Node.js 20.9+ is required. CI currently uses Node 22.

## Main product areas

- Authentication, OTP login, registration and invitations
- Platform / organization / employer scope and permissions
- Organizations, employers and employees
- Employee pension products and pension-fund reference data
- Employer Interface 006 reporting
  - Manual reporting
  - Excel intake
  - XML / DAT / TST intake
  - Validation, transmission and feedback
- Pension payment-account configuration
- ALPHA subscription billing, entitlements and upgrade/contact flows
- Dark/Light UI, RTL, responsive layout and accessibility

See `docs/CODEMAP.md` for the current source map and `AGENTS.md` for development rules.

## Backend integration

Browser requests are proxied through:

```text
/api/backend/*
```

to AlphaBACKEND. Configure the backend origin with:

```bash
ALPHA_API_URL=http://localhost:5080
```

API calls are primarily defined in `src/lib/api.ts` and focused `src/lib/*-api.ts` modules. The proxy implementation is `src/app/api/backend/[...path]/route.ts`.

Do not duplicate backend business rules in the frontend when they belong to authorization, entitlements, billing or Employer Interface 006 validation. The backend and the official 006 specifications stored in AlphaBACKEND are authoritative for those rules.

## Shared UI

Shared controls live in `src/components/ui-controls.tsx`. Before introducing a native/ad-hoc input, select, autocomplete or date control, check whether a shared primitive already exists.

Important global UI layers include:

- `src/app/globals.css`
- `src/app/ui-fixes.css`
- `src/app/dark-mode.css`
- `src/app/mobile.css`
- `src/app/form-feedback.css`
- `src/components/validation-ux-bridge.tsx`

## Run locally

```bash
npm install
npm run dev
```

## Verification

Run the complete local verification sequence with:

```bash
npm run verify
```

This runs the select-data guard, shared UI guard, ESLint, TypeScript typecheck and production build. The authoritative CI sequence is in `.github/workflows/ci.yml`.

## Related repositories

- `GuyMishan/AlphaBACKEND` — API, domain, database, Employer Interface 006, billing and integrations.
- `GuyMishan/AlphaMarketing` — public ALPHA marketing website.
