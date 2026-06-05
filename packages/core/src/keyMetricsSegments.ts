export interface KeyMetricsSegment {
  key: string;
  label: string;
  amount: number;
  pct: number;
  segmentClass: string;
  dotClass: string;
  fillClass: string;
  glossaryTermId?: string;
}

export interface KeyMetricsSummaryRow {
  key: string;
  label: string;
  amount: number;
  percentage: number;
  fillClass: string;
  glossaryTermId?: string;
}

export interface KeyMetricsSegmentsInput {
  annualGross: number;
  annualTaxes: number;
  annualPreTaxDeductions: number;
  annualPostTaxDeductions: number;
  annualBillsCoveredByNet: number;
  annualSavingsInBar: number;
  annualFlexibleRemaining: number;
  annualShortfall: number;
}

export interface KeyMetricsSegmentsResult {
  barSegments: KeyMetricsSegment[];
  flowRows: KeyMetricsSummaryRow[];
}

type SegmentKey = 'billsAndDeductions' | 'taxes' | 'savings' | 'remaining' | 'shortfall';

type SegmentMeta = {
  label: string;
  segmentClass: string;
  dotClass: string;
  fillClass: string;
  glossaryTermId?: string;
};

const SEGMENT_META: Record<SegmentKey, SegmentMeta> = {
  billsAndDeductions: {
    label: 'Bills & Deductions',
    segmentClass: 'km-bills-segment',
    dotClass: 'km-bills-dot',
    fillClass: 'km-flow-fill-bills',
  },
  taxes: {
    label: 'Taxes',
    segmentClass: 'km-tax-segment',
    dotClass: 'km-tax-dot',
    fillClass: 'km-flow-fill-taxes',
    glossaryTermId: 'withholding',
  },
  savings: {
    label: 'Savings & Investments',
    segmentClass: 'km-savings-segment',
    dotClass: 'km-savings-dot',
    fillClass: 'km-flow-fill-savings',
  },
  remaining: {
    label: 'Remaining for Spending',
    segmentClass: 'km-remaining-segment',
    dotClass: 'km-remaining-dot',
    fillClass: 'km-flow-fill-remaining',
  },
  shortfall: {
    label: 'Shortfall',
    segmentClass: 'km-shortfall-segment',
    dotClass: 'km-shortfall-dot',
    fillClass: 'km-flow-fill-shortfall',
  },
};

function buildSegment(key: SegmentKey, amount: number, toPercentOfGross: (value: number) => number): KeyMetricsSegment | null {
  if (amount <= 0) return null;

  const meta = SEGMENT_META[key];
  return {
    key,
    label: meta.label,
    amount,
    pct: toPercentOfGross(amount),
    segmentClass: meta.segmentClass,
    dotClass: meta.dotClass,
    fillClass: meta.fillClass,
    glossaryTermId: meta.glossaryTermId,
  };
}

export function buildKeyMetricsSegments(input: KeyMetricsSegmentsInput): KeyMetricsSegmentsResult {
  const {
    annualGross,
    annualTaxes,
    annualPreTaxDeductions,
    annualPostTaxDeductions,
    annualBillsCoveredByNet,
    annualSavingsInBar,
    annualFlexibleRemaining,
    annualShortfall,
  } = input;

  const toPercentOfGross = (amount: number): number => {
    if (annualGross <= 0) return 0;
    return (amount / annualGross) * 100;
  };

  const annualBillsAndDeductions = annualPreTaxDeductions + annualPostTaxDeductions + annualBillsCoveredByNet;

  const barSegments = [
    buildSegment('billsAndDeductions', annualBillsAndDeductions, toPercentOfGross),
    buildSegment('taxes', annualTaxes, toPercentOfGross),
    buildSegment('savings', annualSavingsInBar, toPercentOfGross),
    buildSegment('remaining', annualFlexibleRemaining, toPercentOfGross),
    buildSegment('shortfall', annualShortfall, toPercentOfGross),
  ].filter((segment): segment is KeyMetricsSegment => segment !== null);

  const flowRows: KeyMetricsSummaryRow[] = [
    {
      key: 'gross',
      label: 'Gross Pay',
      amount: annualGross,
      percentage: 100,
      fillClass: 'km-flow-fill-income',
      glossaryTermId: 'gross-pay',
    },
    ...barSegments.map((segment) => ({
      key: segment.key,
      label: segment.label,
      amount: segment.amount,
      percentage: segment.pct,
      fillClass: segment.fillClass,
      glossaryTermId: segment.glossaryTermId,
    })),
  ];

  return { barSegments, flowRows };
}
