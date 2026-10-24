# Cortexstone dashboard

React 18 + TypeScript (strict) + Vite. Dark-first and responsive. Remember · Act · Protect.

## Run

```bash
cd frontend/dashboard
npm ci
cp .env.example .env     # public configuration only
npm run dev              # http://localhost:5173
```

Checks: `npm run typecheck` · `npm test` · `npm run build` · `npm audit`

## Environment (all `VITE_*` values are bundled into the browser: never put secrets here)

| Variable | Values | Notes |
|---|---|---|
| `VITE_DATA_MODE` | `mock` (default) or `live` | Anything else shows a configuration error and makes no requests. |
| `VITE_API_BASE_URL` | empty, or an `https` origin | Empty uses the Vite dev proxy. `http` is accepted only for localhost. Credentials, query strings and fragments are rejected. |
| `VITE_API_PROXY_TARGET` | URL, default `http://localhost:8000` | Dev proxy target only; read by `vite.config.ts`, not bundled. |

## Modes

- **mock**: simulated data for all eight sections, labelled "Demo · simulated data". Nothing is described as a real operation.
- **live**: real responses only. Unreachable API, 401/403, 503 and unregistered routes are shown as they are. There is no silent fallback to mock.

## Backend

```bash
docker compose up --build            # repo root; API on :8000
curl localhost:8000/health/live
```

## What is real

| Section | Live mode | Mock mode |
|---|---|---|
| Health (`/health/live`, `/health/ready`, `/api/v1/health`) | Live | Simulated |
| Actions: `POST /api/v1/actions/validate` | Live; the backend returns 503 until a trusted principal is configured | Simulated policy |
| Overview approvals and activity | Not available (no endpoint) | Simulated |
| Chat | Not available (no `/api/v1/chat` route) | Simulated |
| Memory (list, filter, forget) | Not available (no routes) | Simulated, forget persists for the session |
| Jobs, Guardian, Integrations | Not available (no routes) | Simulated; Guardian scan and connector changes are disabled with an explanation |
| Settings | Connection details | Mode details |

## Security notes

- No secrets, tokens or user identity live in the frontend. The API derives identity server-side.
- All server and model text is rendered as plain text; the codebase has no `innerHTML`.
- Action arguments are held in memory only. The sole browser-storage use is the sidebar-collapsed preference.
- Destructive actions (forget) use a confirmation dialog and block duplicate submission.
- The backend registers no CORS middleware: use the dev proxy, serve same-origin, or add CORS server-side.
