# @paycheck-planner/api

Thin backend service for Paycheck Planner. It provides a small HTTP surface for health checks and currency conversion proxying, and is deployed separately from the desktop app.

---

## Deployment

This is a Node.js HTTP service deployed independently from the desktop app.

The repo-root `fly.toml` and `fly.dev.toml` keep the full monorepo as the Docker build context so the API can compile against shared workspace packages.

### Local development

```bash
pnpm install
cp .env.example .env
pnpm --filter @paycheck-planner/api run dev
```

The server starts on `http://localhost:3000` by default.

## Endpoints

- `GET /health` returns the service health payload.
- `GET /storage/health` returns storage-boundary placeholder readiness.
- `GET /currency-conversion?from=USD&to=EUR` proxies the upstream currency service and returns the same exchange-rate payload shape.
- `GET /reference-data/index` returns lightweight `{ version, hash }` metadata for each reference-data resource.
- `GET /reference-data/us-tax` returns US tax rule data envelope `{ version, hash, data }`.
- `GET /reference-data/glossary` returns glossary data envelope `{ version, hash, data }`.
- `GET /reference-data/app-faqs` returns FAQ data envelope `{ version, hash, data }`.
- Error responses use the standard envelope `{ status: number, message: string }`.

## Security

- Shared-secret auth supports `Authorization: Bearer <secret>` and `x-api-key`.
- When auth is required but misconfigured, the API fails closed with `503`.
- Security headers are applied on all responses.
- CORS is enabled so the desktop renderer can call API routes during local development and packaged app usage.
- Request IDs are added via `x-request-id` for traceability.
- In-memory rate limiting protects against burst abuse.

## Environment

- `CURRENCY_API_URL` optional override for the upstream currency provider.
- `CURRENCY_REQUEST_TIMEOUT_MS` optional request timeout for the currency proxy (default `8000`).
- `API_AUTH_MODE` supports `none` (default) or `shared-secret`.
- `API_SHARED_SECRET` required when `API_AUTH_MODE=shared-secret`; accepts `Authorization: Bearer <secret>` and `x-api-key`.
- `API_REQUIRE_AUTH` (`true`/`false`) fail-closed toggle; defaults to `false` unless explicitly enabled.
- `API_RATE_LIMIT_WINDOW_MS` in-memory rate-limit window (default `60000`).
- `API_RATE_LIMIT_MAX_REQUESTS` max requests per client per window (default `120`).
- `API_STORAGE_BACKEND` placeholder storage backend selector (currently `memory`).

For Fly deployments, keep non-secret values in `fly.toml` / `fly.dev.toml` and set `API_SHARED_SECRET` using Fly secrets.
