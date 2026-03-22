import { describe, expect, it } from 'vitest';
import type { SavingsContribution } from '../types/obligations';
import type { RetirementElection } from '../types/payroll';
import { applyReallocationPlan, createReallocationPlan } from './reallocationPlanner';

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
});