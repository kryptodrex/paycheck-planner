export const RETIREMENT_PLAN_METADATA = [
  { value: '401k', label: '401(k)' },
  { value: '403b', label: '403(b)' },
  { value: 'roth-ira', label: 'Roth IRA' },
  { value: 'traditional-ira', label: 'Traditional IRA' },
  { value: 'pension', label: 'Pension' },
  { value: 'other', label: 'Other' },
] as const;

export type RetirementPlanType = (typeof RETIREMENT_PLAN_METADATA)[number]['value'];

export const RETIREMENT_PLAN_LABELS: Record<RetirementPlanType, string> = Object.fromEntries(
  RETIREMENT_PLAN_METADATA.map((m) => [m.value, m.label]),
) as Record<RetirementPlanType, string>;
