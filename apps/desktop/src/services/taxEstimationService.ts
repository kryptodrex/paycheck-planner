import type { TaxLine, TaxSettings } from '../types/payroll';
import type { TaxFilingStatus } from '../types/payroll';
import type { FederalTaxBracket } from '../types/referenceData';
import { getCachedUsTaxData } from './referenceDataFetcher';

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
  const rules = getCachedUsTaxData();
  for (const band of rules.stateHeuristic.bands) {
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
  const rules = getCachedUsTaxData();
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

  const annualFederalTaxable = Math.max(0, annualTaxable - rules.federal.standardDeduction[filingStatus]);
  const annualFederalTax = calculateProgressiveTax(
    annualFederalTaxable,
    rules.federal.brackets[filingStatus],
  );
  const federalRate = annualTaxable > 0 ? (annualFederalTax / annualTaxable) * 100 : 0;

  const stateRate = estimateStateTaxRate(annualTaxable);

  const socialSecurityRate = rules.fica.socialSecurityEmployeeRate * 100;
  const socialSecurityPaycheckTaxableIncome = Math.min(
    paycheckGrossIncome,
    rules.fica.socialSecurityWageBase / safePaychecks,
  );

  const annualMedicareSurtaxThreshold = filingStatus === 'married_filing_jointly'
    ? rules.fica.medicareAdditionalThresholdMarried
    : rules.fica.medicareAdditionalThresholdSingle;
  const annualMedicareTax = (annualGross * rules.fica.medicareEmployeeRate)
    + (
      Math.max(0, annualGross - annualMedicareSurtaxThreshold)
      * rules.fica.medicareAdditionalRate
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
      `Federal estimate uses IRS ${rules.federal.taxYear} progressive brackets and standard deduction for ${filingStatus}.`,
      'State tax is a blended estimate based on post pre-tax taxable income; edit if your jurisdiction differs.',
      'Social Security uses gross wages as the base, with wage-base capping behavior.',
      'Medicare uses gross wages and includes the additional 0.9% surtax above the high-income threshold ($200k single / $250k married filing jointly).',
    ],
  };
}
