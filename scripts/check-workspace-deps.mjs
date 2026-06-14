#!/usr/bin/env node
// Workspace architecture guardrail.
//
// Enforces the allowed dependency direction between workspace packages and fails
// on circular dependencies. This validates *declared* deps in each package.json;
// source-level import leaks (deep imports, forbidden runtime imports) are caught
// separately by per-package ESLint `no-restricted-imports` rules.
//
// Run: `node scripts/check-workspace-deps.mjs` (also `pnpm check:boundaries`).
//
// Layers — a package may depend ONLY on packages in a strictly lower layer:
//   0  domain leaves   : core, storage            (no internal deps allowed)
//   1  platform adapters: platform-electron       (may use layer 0)
//   2  apps            : desktop, api, mobile      (may use layers 0–1, never each other)
// Add new packages to LAYERS below; an unclassified workspace package is an error.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const LAYERS = {
  '@paycheck-planner/core': 0,
  '@paycheck-planner/storage': 0,
  '@paycheck-planner/platform-electron': 1,
  '@paycheck-planner/desktop': 2,
  '@paycheck-planner/api': 2,
  '@paycheck-planner/mobile': 2,
}

const LAYER_NAMES = ['domain leaf', 'platform adapter', 'app']

// Discover every workspace package.json under packages/* and apps/*.
function discoverPackages() {
  const found = []
  for (const group of ['packages', 'apps']) {
    const groupDir = join(repoRoot, group)
    if (!existsSync(groupDir)) continue
    for (const entry of readdirSync(groupDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const pkgPath = join(groupDir, entry.name, 'package.json')
      if (!existsSync(pkgPath)) continue
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      if (!pkg.name) continue
      const internalDeps = Object.keys({
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
      }).filter((d) => d.startsWith('@paycheck-planner/'))
      found.push({ name: pkg.name, dir: `${group}/${entry.name}`, internalDeps })
    }
  }
  return found
}

function checkDirection(packages) {
  const violations = []
  for (const pkg of packages) {
    const fromLayer = LAYERS[pkg.name]
    if (fromLayer === undefined) {
      violations.push(`${pkg.name} (${pkg.dir}) is not classified in scripts/check-workspace-deps.mjs LAYERS.`)
      continue
    }
    for (const dep of pkg.internalDeps) {
      const toLayer = LAYERS[dep]
      if (toLayer === undefined) {
        violations.push(`${pkg.name} depends on unclassified workspace package ${dep}.`)
        continue
      }
      if (toLayer >= fromLayer) {
        violations.push(
          `${pkg.name} (${LAYER_NAMES[fromLayer]}) must not depend on ${dep} (${LAYER_NAMES[toLayer]}) — ` +
            `allowed direction is strictly downward (higher layer → lower layer).`,
        )
      }
    }
  }
  return violations
}

function findCycles(packages) {
  const graph = new Map(packages.map((p) => [p.name, p.internalDeps]))
  const cycles = []
  const state = new Map() // name -> 'visiting' | 'done'

  function visit(node, stack) {
    state.set(node, 'visiting')
    for (const next of graph.get(node) ?? []) {
      if (!graph.has(next)) continue
      if (state.get(next) === 'visiting') {
        const start = stack.indexOf(next)
        cycles.push([...stack.slice(start), next].join(' → '))
      } else if (state.get(next) !== 'done') {
        visit(next, [...stack, next])
      }
    }
    state.set(node, 'done')
  }

  for (const p of packages) {
    if (state.get(p.name) !== 'done') visit(p.name, [p.name])
  }
  return [...new Set(cycles)]
}

const packages = discoverPackages()
const violations = [...checkDirection(packages), ...findCycles(packages).map((c) => `Circular dependency: ${c}`)]

if (violations.length > 0) {
  console.error('✗ Workspace dependency boundary violations:\n')
  for (const v of violations) console.error(`  • ${v}`)
  console.error(`\n${violations.length} violation(s). See docs/architecture.md for the allowed dependency graph.`)
  process.exit(1)
}

console.log(`✓ Workspace boundaries OK — ${packages.length} packages, no direction or cycle violations.`)
