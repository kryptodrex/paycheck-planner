# @paycheck-planner/api

Thin backend service for Paycheck Planner. It provides a small HTTP surface for health checks and currency conversion proxying, and is deployed separately from the desktop app.

---

## Deployment

This is a Node.js HTTP service deployed independently from the desktop app.

The repo-root `fly.toml` and `fly.dev.toml` keep the full monorepo as the Docker build context so the API can compile against shared workspace packages.

### Local development

```bash
pnpm install
pnpm --filter @paycheck-planner/api run dev
```

The server starts on `http://localhost:3000` by default.

## Endpoints

- `GET /health` returns the service health payload.
- `GET /currency-conversion?from=USD&to=EUR` proxies the upstream currency service and returns the same exchange-rate payload shape.
- Error responses use the standard envelope `{ status: number, message: string }`.
