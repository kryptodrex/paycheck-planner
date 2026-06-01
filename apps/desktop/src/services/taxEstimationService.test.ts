import { describe, expect, it } from 'vitest';

import { estimateTaxSettings } from './taxEstimationService';
import { getCachedUsTaxData } from './referenceDataFetcher';

describe('taxEstimationService', () => {
  it('uses cached reference-data tax rules', () => {
    const rules = getCachedUsTaxData();

    expect(rules.federal.taxYear).toBe(2026);
    expect(rules.federal.standardDeduction.single).toBe(16100);
    expect(rules.federal.standardDeduction.married_filing_jointly).toBe(32200);
    expect(rules.federal.brackets.single[0].upTo).toBe(12400);
    expect(rules.federal.brackets.single[0].rate).toBe(0.1);

    expect(rules.fica.socialSecurityEmployeeRate).toBe(0.062);
    expect(rules.fica.medicareEmployeeRate).toBe(0.0145);
    expect(rules.fica.medicareAdditionalRate).toBe(0.009);
  });

  it('returns neutral template for non-USD currency', () => {
    const result = estimateTaxSettings({
      currency: 'EUR',
      annualGrossIncome: 65000,
      paychecksPerYear: 26,
    });

    expect(result.taxSettings.taxLines).toHaveLength(1);
    expect(result.taxSettings.taxLines[0].label).toBe('Income Tax');
    expect(result.taxSettings.taxLines[0].rate).toBe(0);
    expect(result.assumptions[0]).toContain('Non-USD');
  });

  it('returns four estimated USD tax lines', () => {
    const result = estimateTaxSettings({
      currency: 'USD',
      annualGrossIncome: 65000,
      paychecksPerYear: 26,
    });

    const labels = result.taxSettings.taxLines.map((line) => line.label);
    expect(labels).toEqual(['Federal Tax', 'State Tax', 'Social Security', 'Medicare']);

    const federal = result.taxSettings.taxLines.find((line) => line.label === 'Federal Tax');
    const state = result.taxSettings.taxLines.find((line) => line.label === 'State Tax');
    const social = result.taxSettings.taxLines.find((line) => line.label === 'Social Security');
    const medicare = result.taxSettings.taxLines.find((line) => line.label === 'Medicare');

    expect(federal?.rate ?? 0).toBeGreaterThan(0);
    expect(state?.rate ?? 0).toBeGreaterThan(0);
    expect(social?.rate ?? 0).toBeGreaterThan(0);
    expect(medicare?.rate ?? 0).toBeGreaterThan(0);
  });

  it('caps social security taxable income per paycheck above wage base', () => {
    const result = estimateTaxSettings({
      currency: 'USD',
      annualGrossIncome: 300000,
      paychecksPerYear: 26,
    });

    const social = result.taxSettings.taxLines.find((line) => line.label === 'Social Security');
    const federal = result.taxSettings.taxLines.find((line) => line.label === 'Federal Tax');

    expect(social).toBeTruthy();
    expect(federal).toBeTruthy();

    if (social && federal) {
      expect((social.taxableIncome ?? 0) < (federal.taxableIncome ?? 0)).toBe(true);
      expect(social.rate).toBe(6.2);
    }
  });

  it('includes medicare surtax effect for high income', () => {
    const lowIncome = estimateTaxSettings({
      currency: 'USD',
      annualGrossIncome: 100000,
      paychecksPerYear: 26,
    });
    const highIncome = estimateTaxSettings({
      currency: 'USD',
      annualGrossIncome: 300000,
      paychecksPerYear: 26,
    });

    const lowMedicare = lowIncome.taxSettings.taxLines.find((line) => line.label === 'Medicare');
    const highMedicare = highIncome.taxSettings.taxLines.find((line) => line.label === 'Medicare');

    expect(lowMedicare).toBeTruthy();
    expect(highMedicare).toBeTruthy();

    if (lowMedicare && highMedicare) {
      expect(highMedicare.rate).toBeGreaterThan(lowMedicare.rate);
    }
  });
});
