# Alpha Frontend

The employer-facing web application of **ALPHA**, a multi-tenant pension operations platform: organizations, employers, employees, pension products, Employer Interface 006 reporting and feedback, payments and subscription billing. The UI is Hebrew and right-to-left, in light and dark themes.

## Tech stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** (strict)
- **TanStack Query 5** for server state · **Zustand** for shared client state
- **React Hook Form + Zod** for forms
- Global CSS with design tokens (`src/styles`) · `lucide-react` icons · `sonner` toasts
- **Vitest** for unit tests

The browser never talks to the backend directly: every call goes through the same-origin proxy `/api/backend/*`, which forwards it to AlphaBACKEND with the session token kept in an HttpOnly cookie.

## Prerequisites

- Node.js 22 (see `.nvmrc`; 20.9+ works)
- npm
- A running AlphaBACKEND instance (local or remote)

## Getting started

```bash
cp .env.example .env.local   # then point ALPHA_API_URL at your backend
npm ci                       # exact versions from package-lock.json
npm run dev                  # http://localhost:3000
```

### Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `ALPHA_API_URL` | server only | Origin of AlphaBACKEND, without a trailing `/api` (e.g. `http://localhost:5080`). Required in production: without it the server answers backend requests with 503 (and the build logs a warning). `npm run dev` and tests default to `http://localhost:5080`. |

No secrets are needed in the frontend; never expose backend URLs or tokens through `NEXT_PUBLIC_*` variables.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run test` | Unit tests (Vitest) |
| `npm run verify` | Everything CI runs: guard scripts, lint, typecheck, tests and the production build |

Run `npm run verify` before opening a pull request.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the frontend is organized and why
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — recipes: adding a feature, endpoint, query, form or component
- [`docs/CODEMAP.md`](docs/CODEMAP.md) — where each flow and shared building block lives
- [`AGENTS.md`](AGENTS.md) — rules for automated and human contributors

## Related repositories

- `GuyMishan/AlphaBACKEND` — API, domain, database, Employer Interface 006, billing and integrations. The backend and the official 006 specifications are authoritative for authorization, entitlements, billing and 006 validation.
- `GuyMishan/AlphaMarketing` — the public ALPHA marketing site.
