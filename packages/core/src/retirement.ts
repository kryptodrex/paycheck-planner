import type { RetirementElection } from './payroll';
import { RETIREMENT_PLAN_LABELS, RETIREMENT_PLAN_METADATA } from './retirementTypes';

export { RETIREMENT_PLAN_METADATA as RETIREMENT_PLAN_OPTIONS };

export function getRetirementPlanDisplayLabel(
  retirement: Pick<RetirementElection, 'type' | 'customLabel'>,
): string {
  if (retirement.type === 'other' && retirement.customLabel?.trim()) {
    return retirement.customLabel.trim();
  }

  return RETIREMENT_PLAN_LABELS[retirement.type];
}
