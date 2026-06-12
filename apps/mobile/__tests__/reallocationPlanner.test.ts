import { describe, it, expect } from 'vitest';
import {
  applyReallocationPlan,
  buildOverriddenPlan,
  createReallocationPlan,
  type Bill,
  type ReallocationPlannerInput,
  type RetirementElection,
  type SavingsContribution,
} from '@paycheck-planner/core';

function makeInput(overrides: Partial<ReallocationPlannerInput> = {}): ReallocationPlannerInput {
  return {
    targetRemainingPerPaycheck: 100,
    currentRemainingPerPaycheck: 0,
    grossPayPerPaycheck: 2000,
    paychecksPerYear: 26,
    paySettings: { payType: 'salary', annualSalary: 52000, payFrequency: 'bi-weekly' },
    preTaxDeductions: [],
    bills: [],
    benefits: [],
    taxSettings: { taxLines: [], additionalWithholding: 0 },
    savingsContributions: [],
    retirementElections: [],
    ...overrides,
  };
}

const savings = (partial: Partial<SavingsContribution>): SavingsContribution => ({
  id: 's1',
  name: 'Emergency Fund',
  amount: 200,
  frequency: 'bi-weekly',
  accountId: 'a1',
  type: 'savings',
  ...partial,
});

describe('createReallocationPlan', () => {
  it('returns a resolved empty plan when there is no shortfall', () => {
    const plan = createReallocationPlan(
      makeInput({ targetRemainingPerPaycheck: 50, currentRemainingPerPaycheck: 80 }),
    );
    expect(plan.shortfallPerPaycheck).toBe(0);
    expect(plan.fullyResolved).toBe(true);
    expect(plan.proposals).toHaveLength(0);
  });

  it('frees money from savings to cover a shortfall', () => {
    const plan = createReallocationPlan(
      makeInput({ savingsContributions: [savings({})] }),
    );
    expect(plan.shortfallPerPaycheck).toBe(100);
    expect(plan.proposals).toHaveLength(1);
    expect(plan.proposals[0].sourceType).toBe('savings');
    expect(plan.proposals[0].freedPerPaycheckAmount).toBeCloseTo(100, 1);
    expect(plan.fullyResolved).toBe(true);
  });

  it('skips reallocation-protected savings', () => {
    const plan = createReallocationPlan(
      makeInput({ savingsContributions: [savings({ reallocationProtected: true })] }),
    );
    expect(plan.proposals).toHaveLength(0);
    expect(plan.fullyResolved).toBe(false);
  });

  it('pauses discretionary bills before touching savings', () => {
    const bill: Bill = {
      id: 'b1',
      name: 'Streaming',
      amount: 120,
      frequency: 'monthly',
      accountId: 'a1',
      discretionary: true,
    };
    const plan = createReallocationPlan(
      makeInput({
        targetRemainingPerPaycheck: 40,
        bills: [bill],
        savingsContributions: [savings({})],
      }),
    );
    expect(plan.proposals[0].sourceType).toBe('bill');
    expect(plan.proposals[0].action).toBe('pause');
  });

  it('never touches non-discretionary bills', () => {
    const bill: Bill = {
      id: 'b1',
      name: 'Rent',
      amount: 1200,
      frequency: 'monthly',
      accountId: 'a1',
    };
    const plan = createReallocationPlan(makeInput({ bills: [bill] }));
    expect(plan.proposals).toHaveLength(0);
  });
});

describe('buildOverriddenPlan', () => {
  it('drops items the user opted out of', () => {
    const base = createReallocationPlan(makeInput({ savingsContributions: [savings({})] }));
    const overridden = buildOverriddenPlan(base, new Map([['s1', 0]]));
    expect(overridden.proposals).toHaveLength(0);
    expect(overridden.totalFreedPerPaycheck).toBe(0);
    expect(overridden.fullyResolved).toBe(false);
  });
});

describe('applyReallocationPlan', () => {
  it('pauses items and reduces amounts back into stored units', () => {
    const input = makeInput({
      targetRemainingPerPaycheck: 250,
      savingsContributions: [savings({ amount: 200 })],
      retirementElections: [
        {
          id: 'r1',
          type: '401k',
          employeeContribution: 100,
          employeeContributionIsPercentage: false,
          isPreTax: false,
          hasEmployerMatch: false,
          employerMatchCap: 0,
          employerMatchCapIsPercentage: false,
        } satisfies RetirementElection,
      ],
    });

    const plan = createReallocationPlan(input);
    const result = applyReallocationPlan(input, plan);

    const updatedSavings = result.savingsContributions[0];
    const updatedRetirement = result.retirementElections[0];

    // Savings is fully consumed (200 of the 250 target) → paused.
    expect(updatedSavings.enabled).toBe(false);

    // Retirement covers the remaining 50 → reduced to ~50 per paycheck.
    expect(updatedRetirement.enabled).not.toBe(false);
    expect(updatedRetirement.employeeContribution).toBeCloseTo(50, 0);
  });
});
