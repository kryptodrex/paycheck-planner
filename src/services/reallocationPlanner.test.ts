import { describe, expect, it } from 'vitest';
import type { SavingsContribution } from '../types/obligations';
import type { RetirementElection } from '../types/payroll';
import { applyReallocationPlan, buildOverriddenPlan, createReallocationPlan } from './reallocationPlanner';

const baseInput = {
  paySettings: {
    payType: 'salary' as const,
    annualSalary: 130000,
    payFrequency: 'bi-weekly' as const,
    minLeftover: 0,
  },
  preTaxDeductions: [],
  bills: [],
  benefits: [],
  taxSettings: {
    taxLines: [
      { id: 'fed', label: 'Federal', rate: 10 },
      { id: 'state', label: 'State', rate: 5 },
    ],
    additionalWithholding: 0,
  },
};

const baseSavings = (overrides: Partial<SavingsContribution>): SavingsContribution => ({
  id: 's1',
  name: 'Emergency Fund',
  amount: 100,
  frequency: 'monthly',
  accountId: 'account-1',
  type: 'savings',
  enabled: true,
  ...overrides,
});

const baseRetirement = (overrides: Partial<RetirementElection>): RetirementElection => ({
  id: 'r1',
  type: '401k',
  employeeContribution: 5,
  employeeContributionIsPercentage: true,
  enabled: true,
  isPreTax: true,
  deductionSource: 'paycheck',
  hasEmployerMatch: false,
  employerMatchCap: 0,
  employerMatchCapIsPercentage: false,
  ...overrides,
});

describe('createReallocationPlan', () => {
  it('returns a no-op plan when the target is already met', () => {
    const plan = createReallocationPlan({
      ...baseInput,
      targetRemainingPerPaycheck: 150,
      currentRemainingPerPaycheck: 180,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      savingsContributions: [],
      retirementElections: [],
    });

    expect(plan.proposals).toEqual([]);
    expect(plan.fullyResolved).toBe(true);
    expect(plan.totalFreedPerPaycheck).toBe(0);
    expect(plan.projectedRemainingPerPaycheck).toBe(180);
  });

  it('prioritizes savings, then investments, then retirement', () => {
    const plan = createReallocationPlan({
      ...baseInput,
      targetRemainingPerPaycheck: 220,
      currentRemainingPerPaycheck: 100,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      savingsContributions: [
        baseSavings({ id: 'save-1', type: 'savings', amount: 150, frequency: 'bi-weekly', name: 'Emergency Fund' }),
        baseSavings({ id: 'invest-1', type: 'investment', amount: 200, frequency: 'bi-weekly', name: 'Brokerage' }),
      ],
      retirementElections: [baseRetirement({ id: 'ret-1', employeeContribution: 3 })],
    });

    expect(plan.proposals.map((proposal) => proposal.sourceId)).toEqual(['save-1']);
    expect(plan.totalFreedPerPaycheck).toBe(120);
    expect(plan.fullyResolved).toBe(true);
  });

  it('pauses a source when the whole amount must be freed', () => {
    const plan = createReallocationPlan({
      ...baseInput,
      targetRemainingPerPaycheck: 200,
      currentRemainingPerPaycheck: 0,
      grossPayPerPaycheck: 4000,
      paychecksPerYear: 26,
      savingsContributions: [baseSavings({ id: 'save-1', amount: 100, frequency: 'bi-weekly' })],
      retirementElections: [],
    });

    expect(plan.proposals).toHaveLength(1);
    expect(plan.proposals[0]).toMatchObject({
      sourceId: 'save-1',
      action: 'pause',
      currentPerPaycheckAmount: 100,
      proposedPerPaycheckAmount: 0,
      freedPerPaycheckAmount: 100,
    });
    expect(plan.fullyResolved).toBe(false);
  });

  it('reduces a monthly savings amount and converts back to stored units when applied', () => {
    const input = {
      ...baseInput,
      targetRemainingPerPaycheck: 150,
      currentRemainingPerPaycheck: 100,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      savingsContributions: [
        baseSavings({ id: 'save-1', amount: 260, frequency: 'monthly', name: 'Emergency Fund' }),
      ],
      retirementElections: [] as RetirementElection[],
    };

    const plan = createReallocationPlan(input);
    const applied = applyReallocationPlan(input, plan);

    expect(plan.proposals[0]).toMatchObject({
      sourceId: 'save-1',
      action: 'reduce',
      currentPerPaycheckAmount: 120,
      proposedPerPaycheckAmount: 70,
      freedPerPaycheckAmount: 50,
    });
    expect(applied.savingsContributions[0].amount).toBe(151.67);
    expect(applied.savingsContributions[0].enabled).toBe(true);
  });

  it('reduces retirement percentages using gross pay to derive the new stored percentage', () => {
    const input = {
      ...baseInput,
      targetRemainingPerPaycheck: 260,
      currentRemainingPerPaycheck: 200,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      savingsContributions: [] as SavingsContribution[],
      retirementElections: [baseRetirement({ id: 'ret-1', employeeContribution: 5 })],
    };

    const plan = createReallocationPlan(input);
    const applied = applyReallocationPlan(input, plan);

    expect(plan.proposals[0]).toMatchObject({
      sourceId: 'ret-1',
      action: 'reduce',
      currentPerPaycheckAmount: 250,
      proposedPerPaycheckAmount: 179.41,
      freedPerPaycheckAmount: 60,
    });
    expect(applied.retirementElections[0].employeeContribution).toBe(3.59);
  });

  it('pauses retirement elections when reduced to zero', () => {
    const input = {
      ...baseInput,
      targetRemainingPerPaycheck: 400,
      currentRemainingPerPaycheck: 200,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      savingsContributions: [] as SavingsContribution[],
      retirementElections: [baseRetirement({ id: 'ret-1', employeeContribution: 4 })],
    };

    const plan = createReallocationPlan(input);
    const applied = applyReallocationPlan(input, plan);

    expect(plan.proposals[0].action).toBe('pause');
    expect(applied.retirementElections[0].enabled).toBe(false);
  });

  it('includes only discretionary bills as bill candidates', () => {
    const plan = createReallocationPlan({
      ...baseInput,
      targetRemainingPerPaycheck: 150,
      currentRemainingPerPaycheck: 50,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      savingsContributions: [],
      retirementElections: [],
      bills: [
        {
          id: 'bill-1',
          name: 'Streaming Bundle',
          amount: 50,
          frequency: 'monthly',
          accountId: 'account-1',
          enabled: true,
          discretionary: true,
        },
        {
          id: 'bill-2',
          name: 'Rent',
          amount: 1200,
          frequency: 'monthly',
          accountId: 'account-1',
          enabled: true,
          discretionary: false,
        },
      ],
      benefits: [],
    });

    expect(plan.proposals).toHaveLength(1);
    expect(plan.proposals[0].sourceType).toBe('bill');
    expect(plan.proposals[0].sourceId).toBe('bill-1');
  });

  it('includes discretionary pre-tax deductions using their net-pay impact', () => {
    const plan = createReallocationPlan({
      ...baseInput,
      targetRemainingPerPaycheck: 140,
      currentRemainingPerPaycheck: 80,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      savingsContributions: [],
      retirementElections: [],
      bills: [],
      benefits: [
        {
          id: 'benefit-1',
          name: 'Transit Pass',
          amount: 100,
          enabled: true,
          discretionary: true,
          isTaxable: false,
          isPercentage: false,
          deductionSource: 'paycheck',
        },
      ],
    });

    expect(plan.proposals[0]).toMatchObject({
      sourceType: 'deduction',
      sourceId: 'benefit-1',
      action: 'pause',
      proposedPerPaycheckAmount: 0,
    });
    expect(plan.proposals[0].freedPerPaycheckAmount).toBeGreaterThanOrEqual(60);
  });

  it('prioritizes discretionary fixed items and custom allocations before savings/retirement', () => {
    const plan = createReallocationPlan({
      ...baseInput,
      targetRemainingPerPaycheck: 140,
      currentRemainingPerPaycheck: 100,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      bills: [
        {
          id: 'bill-1',
          name: 'Streaming',
          amount: 60,
          frequency: 'monthly',
          accountId: 'a1',
          enabled: true,
          discretionary: true,
        },
      ],
      benefits: [],
      customAllocations: [
        { accountId: 'a1', categoryId: 'c1', name: 'Fun Money', amount: 20 },
      ],
      savingsContributions: [
        baseSavings({ id: 'save-1', amount: 200, frequency: 'bi-weekly', name: 'Emergency Fund' }),
      ],
      retirementElections: [baseRetirement({ id: 'ret-1', employeeContribution: 5 })],
    });

    expect(plan.proposals[0].sourceType).toBe('bill');
    expect(plan.proposals[0].action).toBe('pause');
  });

  it('uses reduce-or-zero for custom allocation line items', () => {
    const plan = createReallocationPlan({
      ...baseInput,
      targetRemainingPerPaycheck: 140,
      currentRemainingPerPaycheck: 100,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      savingsContributions: [],
      retirementElections: [],
      customAllocations: [
        { accountId: 'a1', categoryId: 'c1', name: 'Dining Out', amount: 50 },
      ],
      bills: [],
      benefits: [],
    });

    expect(plan.proposals).toHaveLength(1);
    expect(plan.proposals[0].sourceType).toBe('custom-allocation');
    expect(['reduce', 'zero']).toContain(plan.proposals[0].action);
  });

  it('reduces custom allocations when shortfall is below the item amount', () => {
    const plan = createReallocationPlan({
      ...baseInput,
      targetRemainingPerPaycheck: 210,
      currentRemainingPerPaycheck: 150,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      savingsContributions: [],
      retirementElections: [],
      customAllocations: [
        { accountId: 'a1', categoryId: 'c1', name: 'Dining Out', amount: 500 },
      ],
      bills: [],
      benefits: [],
    });

    expect(plan.proposals).toHaveLength(1);
    expect(plan.proposals[0]).toMatchObject({
      sourceType: 'custom-allocation',
      action: 'reduce',
      currentPerPaycheckAmount: 500,
      proposedPerPaycheckAmount: 440,
      freedPerPaycheckAmount: 60,
    });
  });

  it('applies custom allocation proposals back to account categories', () => {
    const input = {
      ...baseInput,
      targetRemainingPerPaycheck: 120,
      currentRemainingPerPaycheck: 100,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      savingsContributions: [] as SavingsContribution[],
      retirementElections: [] as RetirementElection[],
      bills: [],
      benefits: [],
      customAllocations: [
        { accountId: 'a1', categoryId: 'c1', name: 'Dining Out', amount: 50 },
      ],
      accounts: [
        {
          id: 'a1',
          name: 'Checking',
          type: 'checking' as const,
          color: '#fff',
          allocationCategories: [
            { id: 'c1', name: 'Dining Out', amount: 50 },
          ],
        },
      ],
    };

    const plan = createReallocationPlan(input);
    const applied = applyReallocationPlan(input, plan);

    expect(applied.accounts[0].allocationCategories?.[0].amount).toBe(plan.proposals[0].proposedPerPaycheckAmount);
  });

  it('does not add extra penny-level follow-up proposals', () => {
    const plan = createReallocationPlan({
      ...baseInput,
      targetRemainingPerPaycheck: 290,
      currentRemainingPerPaycheck: 243.84,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      bills: [],
      benefits: [],
      customAllocations: [],
      savingsContributions: [
        baseSavings({ id: 'save-1', name: 'Emergencies', type: 'savings', amount: 46.15, frequency: 'bi-weekly' }),
        baseSavings({ id: 'inv-1', name: 'Test', type: 'investment', amount: 43.36, frequency: 'bi-weekly' }),
      ],
      retirementElections: [],
    });

    expect(plan.proposals).toHaveLength(1);
    expect(plan.proposals[0]).toMatchObject({
      sourceId: 'save-1',
      action: 'pause',
      freedPerPaycheckAmount: 46.15,
    });
  });

  it('proportionally distributes reductions across multiple savings items', () => {
    // Three savings items at $200/paycheck each, shortfall = $180.
    // New proportional algorithm should split the shortfall across all three (~$60 each)
    // rather than pausing the first item entirely.
    const plan = createReallocationPlan({
      ...baseInput,
      targetRemainingPerPaycheck: 280,
      currentRemainingPerPaycheck: 100,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      bills: [],
      benefits: [],
      savingsContributions: [
        baseSavings({ id: 'save-a', amount: 200, frequency: 'bi-weekly', name: 'Fund A', type: 'savings' }),
        baseSavings({ id: 'save-b', amount: 200, frequency: 'bi-weekly', name: 'Fund B', type: 'savings' }),
        baseSavings({ id: 'save-c', amount: 200, frequency: 'bi-weekly', name: 'Fund C', type: 'savings' }),
      ],
      retirementElections: [],
    });

    // All three items should appear (proportional vs. greedy pause-first).
    expect(plan.proposals.map((p) => p.sourceId)).toEqual(
      expect.arrayContaining(['save-a', 'save-b', 'save-c']),
    );
    expect(plan.proposals).toHaveLength(3);
    expect(plan.fullyResolved).toBe(true);
    expect(plan.totalFreedPerPaycheck).toBe(180);
    // Each item should be reduced by the same share (~60).
    for (const proposal of plan.proposals) {
      expect(proposal.action).toBe('reduce');
      expect(proposal.freedPerPaycheckAmount).toBeCloseTo(60, 1);
    }
  });

  it('bills are proposed in smallest-first order', () => {
    const plan = createReallocationPlan({
      ...baseInput,
      targetRemainingPerPaycheck: 250,
      currentRemainingPerPaycheck: 100,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      bills: [
        {
          id: 'bill-big',
          name: 'Cable TV',
          amount: 120,
          frequency: 'monthly',
          accountId: 'a1',
          enabled: true,
          discretionary: true,
        },
        {
          id: 'bill-small',
          name: 'Spotify',
          amount: 10,
          frequency: 'monthly',
          accountId: 'a1',
          enabled: true,
          discretionary: true,
        },
      ],
      savingsContributions: [],
      retirementElections: [],
      benefits: [],
    });

    // The smallest bill should appear first in proposals.
    expect(plan.proposals[0].sourceId).toBe('bill-small');
  });

  it('excludes savings contributions with reallocationProtected=true', () => {
    const plan = createReallocationPlan({
      ...baseInput,
      targetRemainingPerPaycheck: 250,
      currentRemainingPerPaycheck: 100,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      bills: [],
      benefits: [],
      savingsContributions: [
        baseSavings({ id: 'save-protected', amount: 300, frequency: 'bi-weekly', name: 'College Fund', reallocationProtected: true }),
        baseSavings({ id: 'save-open', amount: 200, frequency: 'bi-weekly', name: 'Emergency Fund' }),
      ],
      retirementElections: [],
    });

    const ids = plan.proposals.map((p) => p.sourceId);
    expect(ids).not.toContain('save-protected');
    expect(ids).toContain('save-open');
  });

  it('excludes retirement elections with reallocationProtected=true', () => {
    const plan = createReallocationPlan({
      ...baseInput,
      targetRemainingPerPaycheck: 220,
      currentRemainingPerPaycheck: 100,
      grossPayPerPaycheck: 5000,
      paychecksPerYear: 26,
      bills: [],
      benefits: [],
      savingsContributions: [],
      retirementElections: [
        baseRetirement({ id: 'ret-protected', employeeContribution: 6, reallocationProtected: true }),
        baseRetirement({ id: 'ret-open', employeeContribution: 3 }),
      ],
    });

    const ids = plan.proposals.map((p) => p.sourceId);
    expect(ids).not.toContain('ret-protected');
    expect(ids).toContain('ret-open');
  });
});

describe('buildOverriddenPlan', () => {
  const planBase = createReallocationPlan({
    paySettings: {
      payType: 'salary' as const,
      annualSalary: 130000,
      payFrequency: 'bi-weekly' as const,
      minLeftover: 0,
    },
    preTaxDeductions: [],
    bills: [],
    benefits: [],
    taxSettings: {
      taxLines: [
        { id: 'fed', label: 'Federal', rate: 10 },
        { id: 'state', label: 'State', rate: 5 },
      ],
      additionalWithholding: 0,
    },
    targetRemainingPerPaycheck: 350,
    currentRemainingPerPaycheck: 100,
    grossPayPerPaycheck: 5000,
    paychecksPerYear: 26,
    savingsContributions: [
      {
        id: 'sv-1',
        name: 'A',
        amount: 100,
        frequency: 'bi-weekly',
        accountId: 'acct-1',
        type: 'savings',
        enabled: true,
      },
      {
        id: 'sv-2',
        name: 'B',
        amount: 200,
        frequency: 'bi-weekly',
        accountId: 'acct-1',
        type: 'savings',
        enabled: true,
      },
    ],
    retirementElections: [],
  });

  it('accepts a full override map and returns a plan reflecting user amounts', () => {
    const overrides = new Map<string, number>([
      ['sv-2', 200],
      ['sv-1', 0],
    ]);

    const result = buildOverriddenPlan(planBase, overrides);

    // sv-1 override = 0 → excluded from activeProposals
    expect(result.proposals.map((p) => p.sourceId)).not.toContain('sv-1');
    // sv-2 fully freed
    const sv2 = result.proposals.find((p) => p.sourceId === 'sv-2');
    expect(sv2).toBeDefined();
    expect(sv2!.freedPerPaycheckAmount).toBe(200);
    expect(sv2!.proposedPerPaycheckAmount).toBe(0);
    expect(result.totalFreedPerPaycheck).toBe(200);
  });

  it('applies a partial override and recalculates totals', () => {
    const overrides = new Map<string, number>([['sv-2', 50]]);

    const result = buildOverriddenPlan(planBase, overrides);

    const sv2 = result.proposals.find((p) => p.sourceId === 'sv-2');
    expect(sv2).toBeDefined();
    expect(sv2!.freedPerPaycheckAmount).toBe(50);
    expect(sv2!.proposedPerPaycheckAmount).toBe(150);
    expect(sv2!.action).toBe('reduce');
  });

  it('excludes proposals with an override of zero from active proposals', () => {
    const overrides = new Map<string, number>([
      ['sv-1', 0],
      ['sv-2', 0],
    ]);

    const result = buildOverriddenPlan(planBase, overrides);

    expect(result.proposals).toHaveLength(0);
    expect(result.totalFreedPerPaycheck).toBe(0);
    expect(result.fullyResolved).toBe(false);
  });

  it('marks fullyResolved when override amounts cover the shortfall', () => {
    // planBase shortfall = 250. sv-1 max = 100, sv-2 max = 200.
    const overrides = new Map<string, number>([
      ['sv-1', 100],
      ['sv-2', 150],
    ]);

    const result = buildOverriddenPlan(planBase, overrides);

    expect(result.totalFreedPerPaycheck).toBe(250);
    expect(result.fullyResolved).toBe(true);
  });
});