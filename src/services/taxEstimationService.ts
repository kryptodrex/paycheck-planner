import type { TaxLine, TaxSettings } from '../types/payroll';
import type { TaxFilingStatus } from '../types/payroll';
import {
  type FederalTaxBracket,
  US_FEDERAL_TAX_RULES_2026,
  US_FICA_RULES_2026,
  US_STATE_HEURISTIC_RULES_2026,
} from '../data/usTaxData';

export interface TaxEstimationInput {
  currency: string;
  annualGrossIncome: number;
  annualTaxableIncome?: number;
  paychecksPerYear: number;
  filingStatus?: TaxFilingStatus;
}

export interface TaxEstimationResult {
  taxSettings: TaxSettings;
  assumptions: string[];
}

function roundToFourDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function calculateProgressiveTax(taxableIncome: number, brackets: FederalTaxBracket[]): number {
  if (!Number.isFinite(taxableIncome) || taxableIncome <= 0) {
    return 0;
  }

  let remaining = taxableIncome;
  let previousCap = 0;
  let totalTax = 0;

  for (const bracket of brackets) {
    if (remaining <= 0) {
      break;
    }

    const taxableAtBracket = Math.min(remaining, bracket.upTo - previousCap);
    totalTax += taxableAtBracket * bracket.rate;
    remaining -= taxableAtBracket;
    previousCap = bracket.upTo;
  }

  return totalTax;
}

function estimateStateTaxRate(annualTaxableIncome: number): number {
  for (const band of US_STATE_HEURISTIC_RULES_2026.bands) {
    if (annualTaxableIncome <= band.upTo) {
      return band.rate;
    }
  }
  return 0;
}

function toTaxLine(id: string, label: string, rate: number, taxableIncomePerPaycheck: number): TaxLine {
  return {
    id,
    label,
    rate: roundToFourDecimals(Math.max(0, rate)),
    amount: 0,
    taxableIncome: Math.max(0, taxableIncomePerPaycheck),
    calculationType: 'percentage',
  };
}

function createNeutralTaxSettings(paycheckTaxableIncome: number): TaxSettings {
  return {
    taxLines: [
      {
        id: crypto.randomUUID(),
        label: 'Income Tax',
        rate: 0,
        amount: 0,
        taxableIncome: paycheckTaxableIncome,
        calculationType: 'percentage',
      },
    ],
    additionalWithholding: 0,
  };
}

export function estimateTaxSettings(input: TaxEstimationInput): TaxEstimationResult {
  const safePaychecks = Number.isFinite(input.paychecksPerYear) && input.paychecksPerYear > 0
    ? input.paychecksPerYear
    : 26;
  const filingStatus: TaxFilingStatus = input.filingStatus === 'married_filing_jointly'
    ? 'married_filing_jointly'
    : 'single';
  const annualGross = Math.max(0, input.annualGrossIncome || 0);
  const annualTaxable = Math.max(0, input.annualTaxableIncome ?? annualGross);
  const paycheckTaxableIncome = annualTaxable / safePaychecks;
  const paycheckGrossIncome = annualGross / safePaychecks;

  if (input.currency !== 'USD') {
    return {
      taxSettings: createNeutralTaxSettings(paycheckTaxableIncome),
      assumptions: [
        'Non-USD plans use a neutral tax template because country-specific bracket rules vary widely.',
      ],
    };
  }

  const annualFederalTaxable = Math.max(0, annualTaxable - US_FEDERAL_TAX_RULES_2026.standardDeduction[filingStatus]);
  const annualFederalTax = calculateProgressiveTax(
    annualFederalTaxable,
    US_FEDERAL_TAX_RULES_2026.brackets[filingStatus],
  );
  const federalRate = annualTaxable > 0 ? (annualFederalTax / annualTaxable) * 100 : 0;

  const stateRate = estimateStateTaxRate(annualTaxable);

  const socialSecurityRate = US_FICA_RULES_2026.socialSecurityEmployeeRate * 100;
  const socialSecurityPaycheckTaxableIncome = Math.min(
    paycheckGrossIncome,
    US_FICA_RULES_2026.socialSecurityWageBase / safePaychecks,
  );

  const annualMedicareTax = (annualGross * US_FICA_RULES_2026.medicareEmployeeRate)
    + (
      Math.max(0, annualGross - US_FICA_RULES_2026.medicareAdditionalThresholdSingle)
      * US_FICA_RULES_2026.medicareAdditionalRate
    );
  const medicareRate = annualGross > 0 ? (annualMedicareTax / annualGross) * 100 : 0;

  return {
    taxSettings: {
      taxLines: [
        toTaxLine(crypto.randomUUID(), 'Federal Tax', federalRate, paycheckTaxableIncome),
        toTaxLine(crypto.randomUUID(), 'State Tax', stateRate, paycheckTaxableIncome),
        toTaxLine(crypto.randomUUID(), 'Social Security', socialSecurityRate, socialSecurityPaycheckTaxableIncome),
        toTaxLine(crypto.randomUUID(), 'Medicare', medicareRate, paycheckGrossIncome),
      ],
      additionalWithholding: 0,
      filingStatus,
    },
    assumptions: [
      `Federal estimate uses IRS ${US_FEDERAL_TAX_RULES_2026.taxYear} progressive brackets and standard deduction for ${filingStatus}.`,
      'State tax is a blended estimate based on post pre-tax taxable income; edit if your jurisdiction differs.',
      'Social Security uses gross wages as the base, with wage-base capping behavior.',
      'Medicare uses gross wages and includes the additional 0.9% surtax above the high-income threshold.',
    ],
  };
}
