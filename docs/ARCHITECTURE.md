# Frontend architecture

## Layout

```text
src/
├── app/                 Next.js routes only: layouts, page.tsx re-exports, API route handlers
│   └── api/             Server routes: backend proxy and session logout
├── features/<feature>/  Business features (auth, scope, organizations, employers, employees,
│   ├── api.ts           pension, payment-accounts, reporting, feedback, billing, access, admin,
│   ├── types.ts         reference-data, dashboard, settings, shell)
│   ├── queries.ts       TanStack Query keys, hooks and cache invalidation
│   ├── schemas.ts       Zod schemas for the feature's forms
│   ├── components/      Feature UI
│   └── screens/         One component per route
├── components/          Shared, feature-agnostic UI
│   ├── ui/              Controls, modal, table, tabs, tooltip, file upload, notifications, StatCard, EmptyState
│   ├── forms/           Field and the server-validation bridge
│   ├── brand/           Alpha logo, symbol and lockup
│   ├── loading/         AppLoader, skeletons, LoadingState, Spinner
│   └── layout/          PageHeader, accessibility menu
├── lib/                 Shared infrastructure (never imports from features)
│   ├── api/             Client, transport, ApiError, Hebrew error messages, paging
│   ├── query/           QueryClient defaults and provider
│   ├── session/         Zustand store, session storage, logout/expiry lifecycle
│   ├── forms/           useZodForm, Zod rules, input masks, server-error mapping, validators
│   ├── server/          Server-only helpers for route handlers
│   ├── format/          Date, month and money formatting
│   └── hooks/, download.ts
└── styles/              Design system: theme tokens, foundation, component, layout and feature stylesheets
```

Dependencies point one way: `app → features → components / lib`. Features may use another feature's `api`, `types`, `queries` or exported components; `lib` and `components` never import features. There are no barrel (`index.ts`) files and no circular imports.

## Backend communication

- Every backend call goes through `apiRequest` / `apiBlob` (`src/lib/api/client.ts`) from a feature `api.ts`. Paths are backend paths (`/api/...`); the transport sends them to the same-origin proxy with `credentials: "same-origin"` and `cache: "no-store"`.
- Request bodies are JSON-serialized automatically (FormData and Blob pass through). An optional `signal` cancels a request, `timeoutMs` bounds it, `messages` sets Hebrew wording per `errorCode`, and `anonymous` marks login/registration endpoints.
- API types are handwritten next to their feature in `types.ts`. When a backend contract changes, update the DTO there and let `tsc` show every consumer.
- Files are downloaded with `apiBlob` + `saveBlob`, never by linking to the proxy, so an expired session follows the same 401 path as every other call.
- Paged lists return `{ items, hasMore }` and page with `skip`/`take`. Paths never end with `/` (Next.js would answer with a redirect).
- The proxy (`src/app/api/backend/[...path]/route.ts`) turns the HttpOnly `alpha_access` cookie into a bearer header, moves the token issued by OTP verification into that cookie, and rejects cross-site writes. Errors it raises itself use the same Problem Details shape, including `errorCode`.

## Errors

Every failure becomes one `ApiError` (`src/lib/api/errors.ts`):

| Field | Meaning |
| --- | --- |
| `kind` | `http`, `network`, `timeout`, `aborted` or `parse` |
| `status` | HTTP status (0 when the backend never answered) |
| `code` | Backend `errorCode` (RFC 9457), e.g. `VALIDATION_FAILED`, `PLAN_LIMIT_REACHED` |
| `fieldErrors` | Field → messages for `VALIDATION_FAILED` |
| `traceId`, `problem` | Correlation id and the full Problem Details (incl. extensions such as `limit`) |

`error.message` is already user-facing Hebrew (`src/lib/api/error-messages.ts`): backend `detail` wins unless it is one of the framework's generic English defaults, then validation messages, then per-code and per-status wording. Backend endpoints that identify an invalid field return `errors.<field>`; request-wide validation uses `errors.request`. `applyServerErrors` and the validation bridge map field keys when present. Components show `errorMessage(error, fallback)` for every caught error (never `error.message` directly) and never parse responses: it shows `ApiError` text and Hebrew messages the app throws itself, and the fallback for runtime failures (`TypeError`, `SyntaxError`, ...) and English library text, so technical errors never reach the user. The client has no UI side effects; the app shell subscribes to API errors to open the plan-upgrade dialog. A 401 ends the session once, globally.

## State

| Kind of state | Where |
| --- | --- |
| Server data (lists, details, scope, stats) | TanStack Query (`features/*/queries.ts`) |
| Signed-in user metadata, selected organization/employer/employee | Zustand (`src/lib/session/app-store.ts`) |
| UI state of one component (open modal, step, tab) | `useState` |

Query defaults (`src/lib/query/query-client.ts`): data revalidates when a screen mounts, no polling or focus refetch, one retry for network/timeout/5xx on queries, no automatic retry for mutations. Query keys start with the feature and include the organization (and employer) so tenants never share cache entries; mutations invalidate the keys they affect. The access scope (`/api/scope`) is cached until invalidated.

ScopeController resolves the working organization/employer for each page and publishes it through `src/features/scope/scope-events.ts`; screens subscribe (or use `useEmployerScope`) and key their queries by the result.

Reporting uses employer-keyed workspaces: the reports grid and report wizard remount their local state when the employer changes; the wizard also keys by URL entry. The wizard setup is a short-lived TanStack Query, while the editable draft is one typed local model (`features/reporting/new-report/model.ts`). Feature hooks own source/draft pagination, billing and feedback links; persistence operations are separate from JSX and navigation. Screens compose those responsibilities instead of hosting the entire workflow. All stage numbers come from `reportSteps` so Excel's extra import stage stays aligned with validation and edit navigation.

An organization without an employer clears employer-specific screen state. Local asynchronous workspaces (report wizard, expanded feedback deposits) invalidate older reads when scope or filters change; late success, error and loading updates must not overwrite the current selection. Loaders outside TanStack Query use `useLatestRequest(...scopeKeys)` (`src/lib/hooks/use-latest-request.ts`): each load calls `begin()` and applies its reply only while `isCurrent()`, so a slow reply for the previous organization or employer (or an older load) is dropped; debounced effects clear an `active` flag in their cleanup for the same reason. Complete employee lists are collected from the paged search endpoint, rather than relying on the legacy list endpoint's 500-row cap.

## Authentication and security

- The token exists only in the HttpOnly, `SameSite=Strict`, `Secure` (production) cookie. JavaScript stores only display metadata (`sessionStorage`), never tokens. Browser storage goes through `src/lib/browser-storage.ts`, which never throws: when storage is blocked, the session and selections live in memory for the page and a reload restores the session from the cookie.
- Logout and expiry (`src/lib/session/lifecycle.ts`) clear session storage and the whole Query cache, call `/api/session/logout` (which revokes the backend session and clears the cookie), and perform a full navigation. Signing in as a different user also clears the cache.
- A tab without session metadata (new tab, reopened browser) asks the backend once per page load whether the cookie is valid (`resolveSession`, `src/features/auth/restore-session.ts`): authenticated rebuilds the metadata, 401 means sign in, and a network/server failure is reported as unavailable and retried by the next caller. The proxy answers that check with 401 itself when there is no cookie, so anonymous visitors do not use the backend's `/api/auth` rate limit.
- Tabs share the cookie but not session metadata: sign-in/sign-out is broadcast (`BroadcastChannel("alpha-session")`), and other tabs of a signed-out or replaced user drop their local data and go to `/login`.
- The proxy and logout route reject state-changing requests whose `Origin` does not match the host (CSRF defense on top of SameSite). The proxy validates decoded `api/...` segments before URL resolution, rejecting absolute URLs, empty/dot segments, separators and ambiguous encodings. Both routes refuse upstream redirects. Authentication path matching is case-insensitive, matching the backend, so alternative casing cannot bypass token stripping or anonymous-request handling.
- Browser logout has a 15-second timeout (the server's revocation timeout is 10 seconds). Unavailable or blocked BroadcastChannel access must never prevent local sign-in, sign-out or navigation.
- Query-string state that changes without navigation (selected tab, one-time flags such as `?payment=`) is written with `replaceSearchParams` (`src/lib/url-search-params.ts`), never `history.replaceState(window.history.state, ...)`: Next ignores calls that pass its own history state, so `useSearchParams` would not update.
- Navigation to a URL returned by the API (payment-provider setup) is limited to `https:` or this app's origin.
- Server data with unmasked sensitive values (full bank account details for editing) stays in component state, not in the shared Query cache.
- The backend authorizes every request. Capabilities and roles in the UI only decide what to show.
- The proxy does not forward the browser's IP address (client-supplied forwarding headers are never trusted), so backend rate limits and audit IPs see the frontend server until the backend accepts an authenticated client-IP header. Until then every `/api/auth` call shares one per-IP budget: the session-timeout guard backs off after a failed check instead of retrying every second.
- `ALPHA_API_URL` has no production default; a missing or invalid value makes the proxy answer 503 rather than reach another environment. `AlphaBACKEND/` (any letter case) is ignored by Git, `.vercelignore` and ESLint.
- Server-only code (`src/lib/server`, route handlers) reads `ALPHA_API_URL`; nothing secret is bundled for the browser.

## Forms

Forms use `useZodForm(schema, { defaultValues })` (`src/lib/forms/use-zod-form.ts`): validation on submit, a field's error clears when it is edited, and focus moves to the first invalid field. Schemas live in the feature's `schemas.ts` and compose shared rules from `src/lib/forms/zod-rules.ts`; messages are Hebrew. `UiSelect` fields use `FormSelect` (`src/components/forms/form-select.tsx`) because the custom select renders its label from `value`; dates and autocompletes bind through `Controller`/`setValue`. After a failed save, `applyServerErrors` maps backend field errors onto the form; forms not yet on React Hook Form rely on `ValidationUxBridge` for the same purpose. The backend remains the validation authority.

## Styling

The design system is described in `docs/DESIGN-SYSTEM.md`. Global CSS is imported once by `src/app/layout.tsx` in cascade order: theme (`src/styles/theme/palette.css` raw scales, `tokens.css` semantic tokens), `foundation.css`, shared component styles (`src/styles/components`), app layout (`src/styles/layout`), then feature refinements (`src/styles/features`). Light values sit on `:root` and dark values under `html[data-theme="dark"]`, so code written with semantic tokens (`var(--color-*)`, `--space-*`, `--radius-*`) needs no dark-mode rules. Raw colors and palette references outside `src/styles/theme` are rejected by `scripts/check-design-tokens.mjs`. Screen-only styles sit next to their screen. Shared controls (`src/components/ui`) are mandatory, and `scripts/check-ui-primitives.mjs` rejects raw inputs, tables and dialogs. Layout is RTL; numbers and identifiers use `dir="ltr"` where needed.

Loading states use the shared components in `src/components/loading` (branded `AppLoader` for bootstrap, skeletons for pages, cards and tables, `LoadingState` for dialogs and panels). Route segments have `loading.tsx` files that re-export the shell's `RouteLoading`, and the shell shows TanStack Query activity in the topbar.

## Quality gates

`npm run verify` (and CI) runs the guard scripts (UI primitives, hard-coded select data, V006 ownership, double-escaped regexes), ESLint, `tsc`, Vitest and the production build. CI installs with `npm ci` from the committed lockfile.

Dependencies to know: `xlsx` is SheetJS 0.20.3 from the vendor CDN (the npm registry copy is unmaintained and vulnerable), pinned by integrity in `package-lock.json`.
