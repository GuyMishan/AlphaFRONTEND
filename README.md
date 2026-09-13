# Alpha Frontend

Next.js 15 frontend for the Alpha pension operations platform.

## Backend integration

The frontend proxies requests through `/api/backend/*` to avoid browser CORS coupling. Set:

```bash
ALPHA_API_URL=http://localhost:5080
```

The current backend supports development header authentication. The login screen forwards the selected UUID as `X-User-Id` and optionally `X-Platform-Admin: true` through the server-side proxy.

Implemented backend calls:

- `GET /health`
- `GET /api/organizations/`
- `GET /api/organizations/{organizationId}/employers/`
- `GET /api/organizations/{organizationId}/employers/{employerId}/employees`
- `POST /api/platform/users`

The backend does not yet expose reporting, payment, feedback, password login, or self-registration endpoints. Related UI is intentionally marked unavailable instead of simulating a successful server response.

## Run

```bash
npm install
npm run dev
```
