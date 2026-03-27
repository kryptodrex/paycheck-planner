import { describe, expect, it } from 'vitest';

import {
  calculateTaxLineAmount,
  syncEditableTaxLineValues,
  toEditableTaxLineValues,
  toStoredTaxLine,
} from './taxLines';

describe('taxLines', () => {
  it('derives editable values for fixed tax lines from the stored amount', () => {
    const editable = toEditableTaxLineValues(
      { id: 'tax-1', label: 'Local Tax', rate: 0, amount: 40, calculationType: 'fixed' },
      2000,
    );

    expect(editable.amount).toBe('40.00');
    expect(editable.rate).toBe('2');
    expect(editable.calculationType).toBe('fixed');
  });

  it('syncs rate and amount when the user edits the fixed amount', () => {
    const nextLine = syncEditableTaxLineValues(
      { id: 'tax-1', label: 'Local Tax', rate: '0', amount: '0', taxableIncome: '2200.00', calculationType: 'percentage' },
      'amount',
      '55',
      2200,
    );

    expect(nextLine.calculationType).toBe('fixed');
    expect(nextLine.amount).toBe('55');
    expect(nextLine.rate).toBe('2.5');
  });

  it('clamps rate and amount input decimals to two places', () => {
    const nextRate = syncEditableTaxLineValues(
      { id: 'tax-1', label: 'Federal Tax', rate: '0', amount: '0.00', taxableIncome: '1000.00', calculationType: 'percentage' },
      'rate',
      '10.0003',
      1000,
    );

    expect(nextRate.rate).toBe('10.00');

    const nextAmount = syncEditableTaxLineValues(
      { id: 'tax-1', label: 'Local Tax', rate: '0', amount: '0.00', taxableIncome: '1000.00', calculationType: 'fixed' },
      'amount',
      '50.109',
      1000,
    );

    expect(nextAmount.amount).toBe('50.10');
  });

  it('stores fixed tax lines with amount authority while keeping the equivalent rate', () => {
    const stored = toStoredTaxLine(
      { id: 'tax-1', label: 'Local Tax', rate: '2.5', amount: '55', taxableIncome: '2200.00', calculationType: 'fixed' },
      2200,
    );

    expect(stored).toEqual({
      id: 'tax-1',
      label: 'Local Tax',
      rate: 2.5,
      amount: 55,
      taxableIncome: 2200,
      calculationType: 'fixed',
    });
    expect(calculateTaxLineAmount(2200, stored)).toBe(55);
  });

  it('recomputes percentage amount when taxable income changes', () => {
    const nextLine = syncEditableTaxLineValues(
      {
        id: 'tax-1',
        label: 'Federal Tax',
        rate: '10',
        amount: '100.00',
        taxableIncome: '1000.00',
        calculationType: 'percentage',
      },
      'taxableIncome',
      '1200',
      1000,
    );

    expect(nextLine.taxableIncome).toBe('1200');
    expect(nextLine.amount).toBe('120.00');
    expect(nextLine.rate).toBe('10');
  });

  it('uses post pre-tax taxable income for withholding lines and gross wages for Medicare lines', () => {
    const federalAmount = calculateTaxLineAmount(
      1900,
      { id: 'tax-fed', label: 'Federal Withholding', rate: 10, taxableIncome: 2000, calculationType: 'percentage' },
      2000,
    );
    const medicareAmount = calculateTaxLineAmount(
      1900,
      { id: 'tax-med', label: 'Medicare (USA)', rate: 1.45, taxableIncome: 2000, calculationType: 'percentage' },
      2000,
    );

    expect(federalAmount).toBe(190);
    expect(medicareAmount).toBe(29);
  });
});