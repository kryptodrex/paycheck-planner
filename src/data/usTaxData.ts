export type FederalFilingStatus = 'single' | 'married_filing_jointly';

export interface FederalTaxBracket {
  upTo: number;
  rate: number;
}

export interface USFederalTaxRuleSet {
  taxYear: number;
  source: string;
  sourceLastReviewed: string;
  standardDeduction: Record<FederalFilingStatus, number>;
  brackets: Record<FederalFilingStatus, FederalTaxBracket[]>;
}

export interface FicaRuleSet {
  taxYear: number;
  socialSecurityEmployeeRate: number;
  socialSecurityWageBase: number;
  medicareEmployeeRate: number;
  medicareAdditionalRate: number;
  medicareAdditionalThresholdSingle: number;
}

export interface StateTaxBandRule {
  upTo: number;
  rate: number;
}

export interface USStateHeuristicRuleSet {
  taxYear: number;
  source: string;
  bands: StateTaxBandRule[];
}

// IRS source:
// https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill
export const US_FEDERAL_TAX_RULES_2026: USFederalTaxRuleSet = {
  taxYear: 2026,
  source: 'IRS inflation adjustments news release (IR-2025-103)',
  sourceLastReviewed: '2026-03-27',
  standardDeduction: {
    single: 16100,
    married_filing_jointly: 32200,
  },
  brackets: {
    single: [
      { upTo: 12400, rate: 0.10 },
      { upTo: 50400, rate: 0.12 },
      { upTo: 105700, rate: 0.22 },
      { upTo: 201775, rate: 0.24 },
      { upTo: 256225, rate: 0.32 },
      { upTo: 640600, rate: 0.35 },
      { upTo: Number.POSITIVE_INFINITY, rate: 0.37 },
    ],
    married_filing_jointly: [
      { upTo: 24800, rate: 0.10 },
      { upTo: 100800, rate: 0.12 },
      { upTo: 211400, rate: 0.22 },
      { upTo: 403550, rate: 0.24 },
      { upTo: 512450, rate: 0.32 },
      { upTo: 768700, rate: 0.35 },
      { upTo: Number.POSITIVE_INFINITY, rate: 0.37 },
    ],
  },
};

// FICA values align with the rates currently used by the app and IRS/FICA guidance.
export const US_FICA_RULES_2026: FicaRuleSet = {
  taxYear: 2026,
  socialSecurityEmployeeRate: 0.062,
  socialSecurityWageBase: 176100,
  medicareEmployeeRate: 0.0145,
  medicareAdditionalRate: 0.009,
  medicareAdditionalThresholdSingle: 200000,
};

// State tax remains a heuristic in-app model for now.
export const US_STATE_HEURISTIC_RULES_2026: USStateHeuristicRuleSet = {
  taxYear: 2026,
  source: 'In-app heuristic bands (editable in Tax Lines)',
  bands: [
    { upTo: 30000, rate: 3.5 },
    { upTo: 60000, rate: 4.5 },
    { upTo: 100000, rate: 5.5 },
    { upTo: 160000, rate: 6.5 },
    { upTo: 250000, rate: 7.5 },
    { upTo: Number.POSITIVE_INFINITY, rate: 8.5 },
  ],
};
