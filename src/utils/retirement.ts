import type { RetirementElection } from '../types/payroll';

export const RETIREMENT_PLAN_OPTIONS: Array<{ value: RetirementElection['type']; label: string }> = [
  { value: '401k', label: '401(k)' },
  { value: '403b', label: '403(b)' },
  { value: 'roth-ira', label: 'Roth IRA' },
  { value: 'traditional-ira', label: 'Traditional IRA' },
  { value: 'pension', label: 'Pension' },
  { value: 'other', label: 'Other' },
];

const RETIREMENT_PLAN_LABELS: Record<RetirementElection['type'], string> = {
  '401k': '401(k)',
  '403b': '403(b)',
  'roth-ira': 'Roth IRA',
  'traditional-ira': 'Traditional IRA',
  pension: 'Pension',
  other: 'Other',
};

export function getRetirementPlanDisplayLabel(
  retirement: Pick<RetirementElection, 'type' | 'customLabel'>
): string {
  if (retirement.type === 'other' && retirement.customLabel?.trim()) {
    return retirement.customLabel.trim();
  }

  return RETIREMENT_PLAN_LABELS[retirement.type];
}