/**
 * Audit History File Size Benchmark
 *
 * This test does NOT validate application logic. Its purpose is to empirically
 * answer: "How large does a plan file get with a very long audit history?"
 *
 * Run with:
 *   npm run test:run -- src/test/auditHistoryBenchmark.test.ts
 *
 * Read the console output — sizes are printed per entity mix and history depth.
 */

import { describe, it, expect } from 'vitest';
import type { AuditEntry, AuditEntityType, AuditChangeType } from '../types/audit';

const uuidv4 = () => crypto.randomUUID();

// ---------------------------------------------------------------------------
// Realistic snapshot shapes per entity type
// These are intentionally representative of real paycheck-planner data to give
// accurate size estimates rather than stripped-down toy objects.
// ---------------------------------------------------------------------------

const SNAPSHOTS: Record<AuditEntityType, () => unknown> = {
  bill: () => ({
    id: uuidv4(),
    name: 'Electricity Bill',
    amount: 142.5,
    dueDay: 15,
    frequency: 'monthly',
    isActive: true,
    category: 'utilities',
    notes: 'Average estimated monthly, varies seasonally',
  }),
  deduction: () => ({
    id: uuidv4(),
    name: 'Health Insurance Premium',
    amount: 280.0,
    frequency: 'biweekly',
    type: 'pre-tax',
    isMandatory: false,
    description: 'Employee share of employer health plan',
  }),
  'savings-contribution': () => ({
    id: uuidv4(),
    name: 'Emergency Fund',
    amount: 200.0,
    frequency: 'biweekly',
    type: 'automatic',
    targetAccountId: uuidv4(),
    notes: 'Building 6-month buffer',
  }),
  'retirement-election': () => ({
    id: uuidv4(),
    name: '401(k) Traditional',
    percentage: 6.0,
    type: 'traditional',
    matchRate: 3.0,
    matchCap: 6.0,
    isActive: true,
    planProvider: 'Fidelity NetBenefits',
  }),
  loan: () => ({
    id: uuidv4(),
    name: 'Auto Loan - Honda Accord',
    originalPrincipal: 24500,
    currentBalance: 18340.55,
    interestRate: 5.9,
    monthlyPayment: 472.15,
    remainingMonths: 42,
    startDate: '2023-06-01',
    lender: 'Capital One Auto Finance',
    paymentBreakdown: [
      { label: 'Principal', amount: 354.72 },
      { label: 'Interest', amount: 90.13 },
      { label: 'Escrow', amount: 27.3 },
    ],
  }),
  benefit: () => ({
    id: uuidv4(),
    name: 'Dental Insurance',
    amount: 18.5,
    frequency: 'biweekly',
    type: 'pre-tax',
    coverageType: 'individual',
    planYear: 2026,
    carrier: 'Delta Dental',
    effectiveDate: '2026-01-01',
  }),
  account: () => {
    const accountId = uuidv4();
    return {
      id: accountId,
      name: 'Chase Checking (...4521)',
      type: 'checking',
      institution: 'Chase Bank',
      lastFour: '4521',
      isDefault: true,
      allocationCategories: [
        {
          id: uuidv4(),
          name: 'Housing',
          allocationItems: [
            { id: uuidv4(), name: 'Mortgage', amount: 2100, type: 'fixed', notes: '' },
            { id: uuidv4(), name: 'HOA Fees', amount: 125, type: 'fixed', notes: '' },
            { id: uuidv4(), name: 'Home Insurance', amount: 85.5, type: 'fixed', notes: '' },
          ],
        },
        {
          id: uuidv4(),
          name: 'Subscriptions',
          allocationItems: [
            { id: uuidv4(), name: 'Netflix', amount: 22.99, type: 'fixed', notes: '' },
            { id: uuidv4(), name: 'Spotify', amount: 10.99, type: 'fixed', notes: '' },
            { id: uuidv4(), name: 'iCloud+', amount: 2.99, type: 'recurring', notes: '50GB plan' },
          ],
        },
      ],
    };
  },
  'allocation-item': () => ({
    id: uuidv4(),
    name: 'Groceries',
    amount: 650.0,
    type: 'variable',
    categoryId: uuidv4(),
    accountId: uuidv4(),
    notes: 'Whole Foods + Costco, estimated monthly',
  }),
  'pay-settings': () => ({
    salary: 95000,
    salaryType: 'annual',
    payFrequency: 'biweekly',
    hoursPerWeek: 40,
    overtimeRate: 1.5,
    filingStatus: 'single',
    allowances: 1,
    additionalWithholding: 0,
    stateCode: 'CA',
    localTaxEnabled: false,
    ytdGrossEarnings: 38461.54,
  }),
  'tax-settings': () => ({
    federalFilingStatus: 'single',
    federalAllowances: 1,
    federalAdditionalWithholding: 0,
    stateFilingStatus: 'single',
    stateCode: 'CA',
    stateAllowances: 1,
    stateAdditionalWithholding: 0,
    socialSecurityEnabled: true,
    medicareEnabled: true,
    medicareAdditionalEnabled: false,
    sdiEnabled: true,
    sdiRate: 0.009,
    unemploymentEnabled: false,
    supplementalTaxRate: null,
    ytdFederalWithheld: 8420.15,
    ytdStateWithheld: 3610.4,
    ytdSocialSecurity: 2384.62,
    ytdMedicare: 557.69,
  }),
  'budget-settings': () => ({
    planName: 'My 2026 Budget',
    planYear: 2026,
    currency: 'USD',
    locale: 'en-US',
    theme: 'dark',
    showCents: true,
    autoSave: true,
    autoSaveIntervalMs: 30000,
    exportFormat: 'pdf',
    displayDensity: 'comfortable',
  }),
};

const ENTITY_TYPES = Object.keys(SNAPSHOTS) as AuditEntityType[];
const CHANGE_TYPES: AuditChangeType[] = ['create', 'update', 'update', 'update', 'delete'];
// Weight update heavily — in real usage >80% of entries are updates

// ---------------------------------------------------------------------------
// Entry factory
// ---------------------------------------------------------------------------

function makeEntry(i: number): AuditEntry {
  const entityType = ENTITY_TYPES[i % ENTITY_TYPES.length];
  const changeType = CHANGE_TYPES[i % CHANGE_TYPES.length];
  const baseTime = new Date('2025-01-01T00:00:00.000Z').getTime();
  const timestamp = new Date(baseTime + i * 60_000).toISOString(); // one entry per minute

  return {
    id: uuidv4(),
    timestamp,
    entityType,
    entityId: uuidv4(),
    changeType,
    sourceAction: `SimulatedAction_${entityType}`,
    snapshot: SNAPSHOTS[entityType](),
  };
}

// ---------------------------------------------------------------------------
// Size helpers
// ---------------------------------------------------------------------------

function toJsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Simulate the wrapper that fileStorage uses: BudgetData top-level shape
// Only the metadata field matters for size measurement here.
function makePlanFileWrapper(auditHistory: AuditEntry[]): object {
  return {
    version: '0.4.0',
    metadata: { auditHistory },
    // Representative non-history payload (about 3–5 KB for a typical plan)
    settings: SNAPSHOTS['budget-settings'](),
    paySettings: SNAPSHOTS['pay-settings'](),
    taxSettings: SNAPSHOTS['tax-settings'](),
    bills: Array.from({ length: 8 }, () => SNAPSHOTS['bill']()),
    preTaxDeductions: Array.from({ length: 4 }, () => SNAPSHOTS['deduction']()),
    savingsContributions: Array.from({ length: 3 }, () => SNAPSHOTS['savings-contribution']()),
    retirement: Array.from({ length: 2 }, () => SNAPSHOTS['retirement-election']()),
    loans: Array.from({ length: 2 }, () => SNAPSHOTS['loan']()),
    benefits: Array.from({ length: 3 }, () => SNAPSHOTS['benefit']()),
    accounts: Array.from({ length: 2 }, () => SNAPSHOTS['account']()),
  };
}

// ---------------------------------------------------------------------------
// Benchmark
// ---------------------------------------------------------------------------

const DEPTHS = [50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000];

describe('Audit History File Size Benchmark', () => {
  it('measures JSON size at various history depths and prints a summary', () => {
    console.log('\n');
    console.log('='.repeat(70));
    console.log('  Audit History — File Size Benchmark');
    console.log('='.repeat(70));
    console.log(
      ['Depth'.padEnd(10), 'History only'.padEnd(16), 'Full plan file'.padEnd(18), 'Bytes/entry'].join('  '),
    );
    console.log('-'.repeat(70));

    const results: Array<{ depth: number; historyBytes: number; planBytes: number }> = [];

    for (const depth of DEPTHS) {
      const entries = Array.from({ length: depth }, (_, i) => makeEntry(i));
      const historyBytes = toJsonBytes(entries);
      const planBytes = toJsonBytes(makePlanFileWrapper(entries));
      const bytesPerEntry = Math.round(historyBytes / depth);

      results.push({ depth, historyBytes, planBytes });

      console.log(
        [
          String(depth).padEnd(10),
          formatBytes(historyBytes).padEnd(16),
          formatBytes(planBytes).padEnd(18),
          `~${formatBytes(bytesPerEntry)}/entry`,
        ].join('  '),
      );
    }

    console.log('='.repeat(70));
    console.log('');

    // Informational assertions — these tell you where the boundaries are.
    // A plan with 1,000 audit entries should be well under 2 MB total.
    const result1k = results.find((r) => r.depth === 1_000)!;
    expect(result1k.planBytes, '1,000-entry plan should stay under 2 MB').toBeLessThan(2 * 1024 * 1024);

    // A plan with 5,000 entries should be under 10 MB.
    const result5k = results.find((r) => r.depth === 5_000)!;
    expect(result5k.planBytes, '5,000-entry plan should stay under 10 MB').toBeLessThan(10 * 1024 * 1024);

    // Sanity: entries should have non-trivial size
    const result50 = results.find((r) => r.depth === 50)!;
    expect(result50.historyBytes, '50 entries should be at least 10 KB').toBeGreaterThan(10 * 1024);
  });

  it('measures per-entity-type snapshot sizes for reference', () => {
    console.log('\n');
    console.log('='.repeat(50));
    console.log('  Per-Entity Snapshot Size (single entry)');
    console.log('='.repeat(50));
    console.log(['Entity type'.padEnd(26), 'Snapshot size'].join('  '));
    console.log('-'.repeat(50));

    for (const entityType of ENTITY_TYPES) {
      const snapshot = SNAPSHOTS[entityType]();
      const entryBytes = toJsonBytes({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        entityType,
        entityId: uuidv4(),
        changeType: 'update' as AuditChangeType,
        sourceAction: 'Benchmark',
        snapshot,
      } satisfies AuditEntry);

      console.log([entityType.padEnd(26), formatBytes(entryBytes)].join('  '));
      expect(entryBytes).toBeGreaterThan(0);
    }

    console.log('='.repeat(50));
    console.log('');
  });

  it('estimates a realistic one-year active-user history (200 changes)', () => {
    // A very active user making ~4 changes/week × 52 weeks ≈ 200 audit entries/year
    const YEARLY_DEPTH = 200;
    const entries = Array.from({ length: YEARLY_DEPTH }, (_, i) => makeEntry(i));
    const planBytes = toJsonBytes(makePlanFileWrapper(entries));

    console.log('\n');
    console.log(`  Realistic 1-year active user (${YEARLY_DEPTH} entries): ${formatBytes(planBytes)}`);
    console.log('');

    // This should be very small
    expect(planBytes, 'Realistic yearly plan should be under 500 KB').toBeLessThan(500 * 1024);
  });

  it('audit entry generation throughput stays under 50ms for 500 accumulated entries', () => {
    // Simulates the overhead of buildAuditEntries-style JSON diffing on each mutation:
    // serialize + compare + deep-clone a snapshot. This is the hot path on every tracked save.
    // 500 entries represents roughly 2+ years of heavy daily use — far beyond normal.
    const COUNT = 500;

    const start = performance.now();
    for (let i = 0; i < COUNT; i++) {
      const entry = makeEntry(i);
      // Simulate what applyBudgetMutation does: JSON round-trip the snapshot
      JSON.parse(JSON.stringify(entry.snapshot));
    }
    const elapsed = performance.now() - start;

    console.log(`\n  ${COUNT} entry snapshot round-trips: ${elapsed.toFixed(1)}ms\n`);

    expect(elapsed, `${COUNT} snapshot round-trips should complete in under 50ms`).toBeLessThan(50);
  });
});
