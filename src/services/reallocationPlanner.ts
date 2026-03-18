import type { Account } from '../types/accounts';
import type { Bill, SavingsContribution } from '../types/obligations';
import type { Benefit, Deduction, PaySettings, RetirementElection, TaxSettings } from '../types/payroll';
import { calculatePaycheckBreakdown } from './budgetCalculations';
import { getBillFrequencyOccurrencesPerYear, getSavingsFrequencyOccurrencesPerYear } from '../utils/frequency';
import { roundToCent, roundUpToCent } from '../utils/money';
import { getRetirementPlanDisplayLabel } from '../utils/retirement';

export type ReallocationProposalSourceType = 'bill' | 'deduction' | 'custom-allocation' | 'savings' | 'investment' | 'retirement';
export type ReallocationProposalAction = 'reduce' | 'pause' | 'zero';

export interface CustomAllocationReallocationItem {
  accountId: string;
  categoryId: string;
  name: string;
  amount: number;
}

export interface ReallocationProposal {
  sourceType: ReallocationProposalSourceType;
  sourceId: string;
  label: string;
  currentPerPaycheckAmount: number;
  proposedPerPaycheckAmount: number;
  freedPerPaycheckAmount: number;
  action: ReallocationProposalAction;
}

export interface ReallocationPlan {
  targetRemainingPerPaycheck: number;
  currentRemainingPerPaycheck: number;
  shortfallPerPaycheck: number;
  totalFreedPerPaycheck: number;
  projectedRemainingPerPaycheck: number;
  fullyResolved: boolean;
  proposals: ReallocationProposal[];
}

export interface ReallocationPlannerInput {
  targetRemainingPerPaycheck: number;
  currentRemainingPerPaycheck: number;
  grossPayPerPaycheck: number;
  paychecksPerYear: number;
  paySettings: PaySettings;
  preTaxDeductions: Deduction[];
  bills: Bill[];
  benefits: Benefit[];
  taxSettings: TaxSettings;
  savingsContributions: SavingsContribution[];
  retirementElections: RetirementElection[];
  accounts?: Account[];
  customAllocations?: CustomAllocationReallocationItem[];
}

type CandidatePolicy = 'pause-only' | 'reduce-or-pause' | 'reduce-or-zero';

interface ReallocationCandidate {
  sourceType: ReallocationProposalSourceType;
  sourceId: string;
  label: string;
  currentPerPaycheckAmount: number;
  maxRemainingIncreasePerPaycheck: number;
  policy: CandidatePolicy;
}

function getSavingsPerPaycheckAmount(
  contribution: SavingsContribution,
  paychecksPerYear: number,
): number {
  const occurrencesPerYear = getSavingsFrequencyOccurrencesPerYear(contribution.frequency);
  if (occurrencesPerYear === paychecksPerYear) {
    return contribution.amount;
  }

  return (contribution.amount * occurrencesPerYear) / paychecksPerYear;
}

function getRetirementPerPaycheckAmount(
  election: RetirementElection,
  grossPayPerPaycheck: number,
): number {
  if (election.employeeContributionIsPercentage) {
    return (grossPayPerPaycheck * election.employeeContribution) / 100;
  }

  return election.employeeContribution;
}

function buildSavingsCandidates(
  savingsContributions: SavingsContribution[],
  paychecksPerYear: number,
): ReallocationCandidate[] {
  return savingsContributions
    .filter((contribution) => contribution.enabled !== false && contribution.amount > 0)
    .map((contribution) => ({
      sourceType: contribution.type,
      sourceId: contribution.id,
      label: contribution.name,
      currentPerPaycheckAmount: roundToCent(
        getSavingsPerPaycheckAmount(contribution, paychecksPerYear),
      ),
      maxRemainingIncreasePerPaycheck: roundToCent(
        getSavingsPerPaycheckAmount(contribution, paychecksPerYear),
      ),
      policy: 'reduce-or-pause' as const,
    }))
    .sort((left, right) => right.currentPerPaycheckAmount - left.currentPerPaycheckAmount);
}

function buildCustomAllocationCandidates(
  customAllocations: CustomAllocationReallocationItem[],
): ReallocationCandidate[] {
  return customAllocations
    .filter((item) => item.amount > 0)
    .map((item) => ({
      sourceType: 'custom-allocation' as const,
      sourceId: `${item.accountId}:${item.categoryId}`,
      label: item.name,
      currentPerPaycheckAmount: roundToCent(item.amount),
      maxRemainingIncreasePerPaycheck: roundToCent(item.amount),
      policy: 'reduce-or-zero' as const,
    }))
    .sort((left, right) => right.currentPerPaycheckAmount - left.currentPerPaycheckAmount);
}

function getBillPerPaycheckAmount(bill: Bill, paychecksPerYear: number): number {
  const billsPerYear = getBillFrequencyOccurrencesPerYear(bill.frequency, bill.customFrequencyDays);
  return roundUpToCent((bill.amount * billsPerYear) / paychecksPerYear);
}

function buildBillCandidates(
  bills: Bill[],
  paychecksPerYear: number,
): ReallocationCandidate[] {
  return bills
    .filter((bill) => bill.enabled !== false && bill.discretionary === true && bill.amount > 0)
    .map((bill) => ({
      sourceType: 'bill' as const,
      sourceId: bill.id,
      label: bill.name,
      currentPerPaycheckAmount: getBillPerPaycheckAmount(bill, paychecksPerYear),
      maxRemainingIncreasePerPaycheck: getBillPerPaycheckAmount(bill, paychecksPerYear),
      policy: 'pause-only' as const,
    }))
    .sort((left, right) => right.currentPerPaycheckAmount - left.currentPerPaycheckAmount);
}

function getBenefitPerPaycheckAmount(
  benefit: Benefit,
  grossPayPerPaycheck: number,
): number {
  if (benefit.isPercentage) {
    return (grossPayPerPaycheck * benefit.amount) / 100;
  }

  return benefit.amount;
}

function buildBenefitCandidates(
  input: Pick<
    ReallocationPlannerInput,
    'paySettings' | 'preTaxDeductions' | 'bills' | 'benefits' | 'taxSettings' | 'retirementElections' | 'grossPayPerPaycheck'
  >,
  currentNetPay: number,
): ReallocationCandidate[] {
  return input.benefits
    .filter(
      (benefit) =>
        benefit.enabled !== false &&
        benefit.discretionary === true &&
        getBenefitPerPaycheckAmount(benefit, input.grossPayPerPaycheck) > 0,
    )
    .map((benefit) => {
      const currentPerPaycheckAmount = roundToCent(
        getBenefitPerPaycheckAmount(benefit, input.grossPayPerPaycheck),
      );
      let maxRemainingIncreasePerPaycheck = currentPerPaycheckAmount;

      if ((benefit.deductionSource || 'paycheck') === 'paycheck' && !benefit.isTaxable) {
        const modifiedBenefits = input.benefits.map((item) =>
          item.id === benefit.id ? { ...item, enabled: false } : item,
        );

        const modifiedNetPay = calculatePaycheckBreakdown({
          paySettings: input.paySettings,
          preTaxDeductions: input.preTaxDeductions,
          benefits: modifiedBenefits,
          retirement: input.retirementElections,
          taxSettings: input.taxSettings,
        }).netPay;

        maxRemainingIncreasePerPaycheck = roundToCent(modifiedNetPay - currentNetPay);
      }

      return {
        sourceType: 'deduction' as const,
        sourceId: benefit.id,
        label: benefit.name,
        currentPerPaycheckAmount,
        maxRemainingIncreasePerPaycheck,
        policy: 'pause-only' as const,
      };
    })
    .filter((candidate) => candidate.maxRemainingIncreasePerPaycheck > 0)
    .sort((left, right) => right.currentPerPaycheckAmount - left.currentPerPaycheckAmount);
}

function buildRetirementCandidates(
  input: Pick<
    ReallocationPlannerInput,
    'paySettings' | 'preTaxDeductions' | 'benefits' | 'taxSettings' | 'retirementElections' | 'grossPayPerPaycheck'
  >,
  retirementElections: RetirementElection[],
): ReallocationCandidate[] {
  const currentNetPay = calculatePaycheckBreakdown({
    paySettings: input.paySettings,
    preTaxDeductions: input.preTaxDeductions,
    benefits: input.benefits,
    retirement: input.retirementElections,
    taxSettings: input.taxSettings,
  }).netPay;

  return retirementElections
    .filter(
      (election) =>
        election.enabled !== false &&
        getRetirementPerPaycheckAmount(election, input.grossPayPerPaycheck) > 0,
    )
    .map((election) => {
      const currentPerPaycheckAmount = roundToCent(
        getRetirementPerPaycheckAmount(election, input.grossPayPerPaycheck),
      );

      let maxRemainingIncreasePerPaycheck = currentPerPaycheckAmount;

      if ((election.deductionSource || 'paycheck') === 'paycheck' && election.isPreTax !== false) {
        const modifiedRetirement = input.retirementElections.map((item) =>
          item.id === election.id ? { ...item, enabled: false } : item,
        );

        const modifiedNetPay = calculatePaycheckBreakdown({
          paySettings: input.paySettings,
          preTaxDeductions: input.preTaxDeductions,
          benefits: input.benefits,
          retirement: modifiedRetirement,
          taxSettings: input.taxSettings,
        }).netPay;

        maxRemainingIncreasePerPaycheck = roundToCent(modifiedNetPay - currentNetPay);
      }

      return {
        sourceType: 'retirement' as const,
        sourceId: election.id,
        label: getRetirementPlanDisplayLabel(election),
        currentPerPaycheckAmount,
        maxRemainingIncreasePerPaycheck,
        policy: 'reduce-or-pause' as const,
      };
    })
    .filter((candidate) => candidate.maxRemainingIncreasePerPaycheck > 0)
    .sort((left, right) => right.currentPerPaycheckAmount - left.currentPerPaycheckAmount);
}

function getCandidates(input: ReallocationPlannerInput): ReallocationCandidate[] {
  const currentNetPay = calculatePaycheckBreakdown({
    paySettings: input.paySettings,
    preTaxDeductions: input.preTaxDeductions,
    benefits: input.benefits,
    retirement: input.retirementElections,
    taxSettings: input.taxSettings,
  }).netPay;
  const savingsCandidates = buildSavingsCandidates(
    input.savingsContributions,
    input.paychecksPerYear,
  );
  const billCandidates = buildBillCandidates(input.bills, input.paychecksPerYear);
  const benefitCandidates = buildBenefitCandidates(input, currentNetPay);
  const customAllocationCandidates = buildCustomAllocationCandidates(input.customAllocations || []);
  const retirementCandidates = buildRetirementCandidates(input, input.retirementElections);

  return [
    ...billCandidates,
    ...benefitCandidates,
    ...customAllocationCandidates,
    ...savingsCandidates.filter((candidate) => candidate.sourceType === 'savings'),
    ...savingsCandidates.filter((candidate) => candidate.sourceType === 'investment'),
    ...retirementCandidates,
  ];
}

export function createReallocationPlan(input: ReallocationPlannerInput): ReallocationPlan {
  const MIN_ACTIONABLE_REALLOCATION = 1;

  const targetRemainingPerPaycheck = roundToCent(
    Math.max(0, input.targetRemainingPerPaycheck || 0),
  );
  const currentRemainingPerPaycheck = roundToCent(input.currentRemainingPerPaycheck || 0);
  const shortfallPerPaycheck = roundToCent(
    Math.max(0, targetRemainingPerPaycheck - currentRemainingPerPaycheck),
  );

  // Ignore tiny shortfalls that are likely rounding noise.
  if (shortfallPerPaycheck < MIN_ACTIONABLE_REALLOCATION) {
    return {
      targetRemainingPerPaycheck,
      currentRemainingPerPaycheck,
      shortfallPerPaycheck: 0,
      totalFreedPerPaycheck: 0,
      projectedRemainingPerPaycheck: currentRemainingPerPaycheck,
      fullyResolved: true,
      proposals: [],
    };
  }

  const candidates = getCandidates(input);
  const proposals: ReallocationProposal[] = [];
  let remainingShortfall = shortfallPerPaycheck;

  for (const candidate of candidates) {
    if (remainingShortfall < MIN_ACTIONABLE_REALLOCATION) break;

    if (candidate.policy === 'pause-only') {
      const freedPerPaycheckAmount = candidate.maxRemainingIncreasePerPaycheck;
      proposals.push({
        sourceType: candidate.sourceType,
        sourceId: candidate.sourceId,
        label: candidate.label,
        currentPerPaycheckAmount: candidate.currentPerPaycheckAmount,
        proposedPerPaycheckAmount: 0,
        freedPerPaycheckAmount,
        action: 'pause',
      });
      remainingShortfall = roundToCent(Math.max(0, remainingShortfall - freedPerPaycheckAmount));
      continue;
    }

    const maxFreedPerPaycheckAmount = candidate.maxRemainingIncreasePerPaycheck;
    const freedPerPaycheckAmount = roundToCent(
      Math.min(maxFreedPerPaycheckAmount, remainingShortfall),
    );

    if (freedPerPaycheckAmount < MIN_ACTIONABLE_REALLOCATION) continue;

    const sourceReductionPerPaycheck = roundToCent(
      (candidate.currentPerPaycheckAmount * freedPerPaycheckAmount) /
        candidate.maxRemainingIncreasePerPaycheck,
    );

    const proposedPerPaycheckAmount = roundToCent(
      Math.max(0, candidate.currentPerPaycheckAmount - sourceReductionPerPaycheck),
    );

    // Keep custom allocations in "reduce" mode unless the remainder is tiny.
    // Other sources still use the <10% fallback to avoid pointless tiny leftovers.
    const isReductionTrivial =
      proposedPerPaycheckAmount > 0
      && (
        proposedPerPaycheckAmount < 1
        || (
          candidate.policy !== 'reduce-or-zero'
          && (proposedPerPaycheckAmount / candidate.currentPerPaycheckAmount) < 0.1
        )
      );
    const shouldZeroOut = proposedPerPaycheckAmount <= 0 || isReductionTrivial;
    const action: ReallocationProposalAction = candidate.policy === 'reduce-or-zero'
      ? (shouldZeroOut ? 'zero' : 'reduce')
      : (shouldZeroOut ? 'pause' : 'reduce');

    proposals.push({
      sourceType: candidate.sourceType,
      sourceId: candidate.sourceId,
      label: candidate.label,
      currentPerPaycheckAmount: candidate.currentPerPaycheckAmount,
      proposedPerPaycheckAmount: action === 'pause' || action === 'zero' ? 0 : proposedPerPaycheckAmount,
      freedPerPaycheckAmount,
      action,
    });

    remainingShortfall = roundToCent(remainingShortfall - freedPerPaycheckAmount);
  }

  const totalFreedPerPaycheck = roundToCent(
    proposals.reduce((sum, proposal) => sum + proposal.freedPerPaycheckAmount, 0),
  );
  const projectedRemainingPerPaycheck = roundToCent(
    currentRemainingPerPaycheck + totalFreedPerPaycheck,
  );

  return {
    targetRemainingPerPaycheck,
    currentRemainingPerPaycheck,
    shortfallPerPaycheck,
    totalFreedPerPaycheck,
    projectedRemainingPerPaycheck,
    fullyResolved: projectedRemainingPerPaycheck >= targetRemainingPerPaycheck,
    proposals,
  };
}

function convertPerPaycheckSavingsToStoredAmount(
  perPaycheckAmount: number,
  frequency: SavingsContribution['frequency'],
  paychecksPerYear: number,
): number {
  const occurrencesPerYear = getSavingsFrequencyOccurrencesPerYear(frequency);
  if (occurrencesPerYear === paychecksPerYear) {
    return roundToCent(perPaycheckAmount);
  }

  return roundToCent((perPaycheckAmount * paychecksPerYear) / occurrencesPerYear);
}

function convertPerPaycheckRetirementToStoredAmount(
  perPaycheckAmount: number,
  grossPayPerPaycheck: number,
  isPercentage: boolean,
): number {
  if (!isPercentage) {
    return roundToCent(perPaycheckAmount);
  }

  if (grossPayPerPaycheck <= 0) {
    return 0;
  }

  return roundToCent((perPaycheckAmount / grossPayPerPaycheck) * 100);
}

export interface AppliedReallocationResult {
  accounts: Account[];
  bills: Bill[];
  benefits: Benefit[];
  savingsContributions: SavingsContribution[];
  retirementElections: RetirementElection[];
}

function convertPerPaycheckBillToStoredAmount(
  perPaycheckAmount: number,
  bill: Bill,
  paychecksPerYear: number,
): number {
  const occurrencesPerYear = getBillFrequencyOccurrencesPerYear(bill.frequency, bill.customFrequencyDays);
  return roundToCent((perPaycheckAmount * paychecksPerYear) / occurrencesPerYear);
}

function convertPerPaycheckBenefitToStoredAmount(
  perPaycheckAmount: number,
  benefit: Benefit,
  grossPayPerPaycheck: number,
): number {
  if (!benefit.isPercentage) {
    return roundToCent(perPaycheckAmount);
  }

  if (grossPayPerPaycheck <= 0) {
    return 0;
  }

  return roundToCent((perPaycheckAmount / grossPayPerPaycheck) * 100);
}

export function applyReallocationPlan(
  input: ReallocationPlannerInput,
  plan: ReallocationPlan,
): AppliedReallocationResult {
  const customAllocationById = new Map(
    plan.proposals
      .filter((proposal) => proposal.sourceType === 'custom-allocation')
      .map((proposal) => [proposal.sourceId, proposal]),
  );
  const billById = new Map(plan.proposals.filter((proposal) => proposal.sourceType === 'bill').map((proposal) => [proposal.sourceId, proposal]));
  const benefitById = new Map(plan.proposals.filter((proposal) => proposal.sourceType === 'deduction').map((proposal) => [proposal.sourceId, proposal]));
  const savingsById = new Map(plan.proposals.filter((proposal) => proposal.sourceType === 'savings' || proposal.sourceType === 'investment').map((proposal) => [proposal.sourceId, proposal]));
  const retirementById = new Map(plan.proposals.filter((proposal) => proposal.sourceType === 'retirement').map((proposal) => [proposal.sourceId, proposal]));

  const bills = input.bills.map((bill) => {
    const proposal = billById.get(bill.id);
    if (!proposal) return bill;

    if (proposal.action === 'pause') {
      return {
        ...bill,
        enabled: false,
      };
    }

    return {
      ...bill,
      amount: convertPerPaycheckBillToStoredAmount(
        proposal.proposedPerPaycheckAmount,
        bill,
        input.paychecksPerYear,
      ),
    };
  });

  const benefits = input.benefits.map((benefit) => {
    const proposal = benefitById.get(benefit.id);
    if (!proposal) return benefit;

    if (proposal.action === 'pause') {
      return {
        ...benefit,
        enabled: false,
      };
    }

    return {
      ...benefit,
      amount: convertPerPaycheckBenefitToStoredAmount(
        proposal.proposedPerPaycheckAmount,
        benefit,
        input.grossPayPerPaycheck,
      ),
    };
  });

  const savingsContributions = input.savingsContributions.map((contribution) => {
    const proposal = savingsById.get(contribution.id);
    if (!proposal) return contribution;

    if (proposal.action === 'pause') {
      return {
        ...contribution,
        enabled: false,
      };
    }

    return {
      ...contribution,
      amount: convertPerPaycheckSavingsToStoredAmount(
        proposal.proposedPerPaycheckAmount,
        contribution.frequency,
        input.paychecksPerYear,
      ),
    };
  });

  const retirementElections = input.retirementElections.map((election) => {
    const proposal = retirementById.get(election.id);
    if (!proposal) return election;

    if (proposal.action === 'pause') {
      return {
        ...election,
        enabled: false,
      };
    }

    return {
      ...election,
      employeeContribution: convertPerPaycheckRetirementToStoredAmount(
        proposal.proposedPerPaycheckAmount,
        input.grossPayPerPaycheck,
        election.employeeContributionIsPercentage,
      ),
    };
  });

  const accounts = (input.accounts || []).map((account) => ({
    ...account,
    allocationCategories: (account.allocationCategories || []).map((category) => {
      const proposal = customAllocationById.get(`${account.id}:${category.id}`);
      if (!proposal) return category;

      return {
        ...category,
        amount: roundToCent(proposal.proposedPerPaycheckAmount),
      };
    }),
  }));

  return {
    accounts,
    bills,
    benefits,
    savingsContributions,
    retirementElections,
  };
}