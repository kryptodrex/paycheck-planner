# Contributing — Workspace Quickstart

This is a pnpm + Turborepo monorepo. Read [architecture.md](./architecture.md)
for the dependency-boundary rules before adding cross-package imports.

## Prerequisites

- Node `>=22 <26` (see `.nvmrc`), pnpm `>=10 <12` (pinned via `packageManager`).
- `pnpm install` from the repo root.

## Common commands

All commands run from the repo root and go through Turbo.

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Run desktop + mobile + api dev servers |
| `pnpm dev:desktop` / `pnpm dev:mobile` / `pnpm dev:api` | Single-app dev |
| `pnpm ws:lint` / `pnpm ws:typecheck` / `pnpm ws:test:run` / `pnpm ws:build` | Whole-workspace checks |
| `pnpm check:boundaries` | Validate dependency direction + no cycles |
| `pnpm turbo run <task> --filter=@paycheck-planner/<pkg>` | Scope any task to one package + its deps |
| `pnpm turbo run <task> --affected` | Only projects changed vs the base branch |

Before opening a PR, the same gate CI runs is:

```sh
pnpm check:boundaries && pnpm turbo run lint typecheck test:run build
```

## Scaffolding a new package or app

A ready-to-copy template lives in [`templates/package/`](../templates/package/).

1. Copy it into place:
   ```sh
   cp -r templates/package packages/<name>      # or apps/<name>
   ```
2. In the new `package.json`, set `name` to `@paycheck-planner/<name>` and add any
   `@paycheck-planner/*` deps as `"workspace:*"` (only downward — see the layer
   table in [architecture.md](./architecture.md)).
3. **Classify the package** by adding it to the `LAYERS` map in
   [`scripts/check-workspace-deps.mjs`](../scripts/check-workspace-deps.mjs).
   An unclassified workspace package fails `pnpm check:boundaries`.
4. `pnpm install` to wire the workspace link, then verify:
   ```sh
   pnpm check:boundaries
   pnpm turbo run lint typecheck test:run --filter=@paycheck-planner/<name>
   ```

### Conventions the template encodes

- ESM (`"type": "module"`), `tsconfig.json` extends `../../tsconfig.base.json`.
- Explicit `exports` map — no deep imports into a package's internals.
- Per-package flat ESLint config; add `no-restricted-imports` boundary rules if
  the package must not reach for UI/platform/other workspace packages (mirror
  `packages/core/eslint.config.js`).
- Vitest with `vitest.config.ts`; tests as `*.test.ts` colocated in `src/`.
- `lint`, `typecheck`, `test`, `test:run`, `build` scripts so Turbo can pick the
  package up automatically.
