import type { TaxLine, TaxLineCalculationType } from '../types/payroll';
import { roundToCent, roundUpToCent } from './money';

export interface EditableTaxLineValues {
  id: string;
  label: string;
  rate: string;
  amount: string;
  taxableIncome: string;
  calculationType: TaxLineCalculationType;
  error?: string;
}

export function getTaxLineCalculationType(line: TaxLine): TaxLineCalculationType {
  return line.calculationType === 'fixed' ? 'fixed' : 'percentage';
}

export function calculateTaxLineAmountFromRate(taxableIncome: number, rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0 || taxableIncome <= 0) {
    return 0;
  }

  return roundUpToCent((taxableIncome * rate) / 100);
}

function normalizeTaxLabel(label: string): string {
  return label.trim().toLowerCase();
}

function isFederalOrStateStyleTaxLine(label: string): boolean {
  return /(federal|state|local|income\s*tax|withholding)/.test(label);
}

function isSocialSecurityTaxLine(label: string): boolean {
  return /(social\s*security|oasdi|fica\s*social|sui)/.test(label);
}

function isMedicareTaxLine(label: string): boolean {
  return /(medicare|fica\s*medicare)/.test(label);
}

export function getTaxableIncomeForTaxLine(defaultTaxableIncome: number, line: TaxLine, grossPay?: number): number {
  const fallbackTaxableIncome = roundToCent(Math.max(0, defaultTaxableIncome));
  const storedTaxableIncome = roundToCent(Math.max(0, line.taxableIncome ?? fallbackTaxableIncome));

  if (!Number.isFinite(grossPay) || grossPay === undefined || grossPay <= 0) {
    return storedTaxableIncome;
  }

  const normalizedLabel = normalizeTaxLabel(line.label || '');
  const safeGrossPay = roundToCent(Math.max(0, grossPay));

  if (isFederalOrStateStyleTaxLine(normalizedLabel)) {
    return roundToCent(Math.min(storedTaxableIncome, fallbackTaxableIncome));
  }

  if (isSocialSecurityTaxLine(normalizedLabel)) {
    return roundToCent(Math.min(safeGrossPay, storedTaxableIncome > 0 ? storedTaxableIncome : safeGrossPay));
  }

  if (isMedicareTaxLine(normalizedLabel)) {
    return safeGrossPay;
  }

  return storedTaxableIncome;
}

export function calculateTaxLineRateFromAmount(taxableIncome: number, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0 || taxableIncome <= 0) {
    return 0;
  }

  return Math.round((((amount / taxableIncome) * 100) + Number.EPSILON) * 10000) / 10000;
}

export function calculateTaxLineAmount(taxableIncome: number, line: TaxLine, grossPay?: number): number {
  const taxableIncomeForLine = getTaxableIncomeForTaxLine(taxableIncome, line, grossPay);
  if (getTaxLineCalculationType(line) === 'fixed') {
    return roundUpToCent(Math.max(0, line.amount || 0));
  }

  return calculateTaxLineAmountFromRate(taxableIncomeForLine, line.rate);
}

function formatRateInput(rate: number): string {
  return String(roundToCent(Math.max(0, rate)));
}

function formatAmountInput(amount: number): string {
  return roundToCent(Math.max(0, amount)).toFixed(2);
}

function clampDecimals(value: string, maxDecimals: number): string {
  if (value === '') return value;

  const decimalIndex = value.indexOf('.');
  if (decimalIndex === -1) {
    return value;
  }

  const integerPart = value.slice(0, decimalIndex + 1);
  const decimalPart = value.slice(decimalIndex + 1, decimalIndex + 1 + maxDecimals);
  return `${integerPart}${decimalPart}`;
}

function hasMoreThanTwoDecimals(value: string): boolean {
  const decimalIndex = value.indexOf('.');
  if (decimalIndex === -1) {
    return false;
  }

  return value.slice(decimalIndex + 1).length > 2;
}

export function toEditableTaxLineValues(line: TaxLine, taxableIncome: number): EditableTaxLineValues {
  const taxableIncomeForLine = getTaxableIncomeForTaxLine(taxableIncome, line);
  const calculationType = getTaxLineCalculationType(line);
  const amount = calculationType === 'fixed'
    ? roundToCent(Math.max(0, line.amount || 0))
    : calculateTaxLineAmountFromRate(taxableIncomeForLine, line.rate);
  const rate = calculationType === 'fixed'
    ? calculateTaxLineRateFromAmount(taxableIncomeForLine, amount)
    : roundToCent(Math.max(0, line.rate));

  return {
    id: line.id,
    label: line.label,
    rate: formatRateInput(rate),
    amount: formatAmountInput(amount),
    taxableIncome: formatAmountInput(taxableIncomeForLine),
    calculationType,
  };
}

export function syncEditableTaxLineValues(
  line: EditableTaxLineValues,
  field: 'label' | 'rate' | 'amount' | 'taxableIncome' | 'calculationType',
  value: string,
  taxableIncome: number,
): EditableTaxLineValues {
  if (field === 'label') {
    return { ...line, label: value, error: undefined };
  }

  if (field === 'calculationType') {
    return {
      ...line,
      calculationType: value === 'fixed' ? 'fixed' : 'percentage',
      error: undefined,
    };
  }

  if (field === 'taxableIncome') {
    const normalizedTaxableIncome = clampDecimals(value, 2);
    const parsedTaxableIncome = parseFloat(normalizedTaxableIncome);
    const effectiveTaxableIncome = Number.isFinite(parsedTaxableIncome) && parsedTaxableIncome >= 0
      ? parsedTaxableIncome
      : taxableIncome;

    return {
      ...line,
      taxableIncome: normalizedTaxableIncome,
      amount: line.calculationType === 'percentage'
        ? formatAmountInput(calculateTaxLineAmountFromRate(effectiveTaxableIncome, parseFloat(line.rate) || 0))
        : line.amount,
      rate: line.calculationType === 'fixed'
        ? formatRateInput(calculateTaxLineRateFromAmount(effectiveTaxableIncome, parseFloat(line.amount) || 0))
        : line.rate,
      error: undefined,
    };
  }

  const parsedTaxableIncome = parseFloat(line.taxableIncome);
  const effectiveTaxableIncome = Number.isFinite(parsedTaxableIncome) && parsedTaxableIncome >= 0
    ? parsedTaxableIncome
    : taxableIncome;

  if (field === 'rate') {
    const normalizedRate = clampDecimals(value, 2);
    const parsedRate = parseFloat(normalizedRate);
    return {
      ...line,
      rate: normalizedRate,
      amount: Number.isFinite(parsedRate) && parsedRate >= 0
        ? formatAmountInput(calculateTaxLineAmountFromRate(effectiveTaxableIncome, parsedRate))
        : line.amount,
      calculationType: 'percentage',
      error: undefined,
    };
  }

  const normalizedAmount = clampDecimals(value, 2);
  const parsedAmount = parseFloat(normalizedAmount);
  return {
    ...line,
    amount: normalizedAmount,
    rate: Number.isFinite(parsedAmount) && parsedAmount >= 0
      ? formatRateInput(calculateTaxLineRateFromAmount(effectiveTaxableIncome, parsedAmount))
      : line.rate,
    calculationType: 'fixed',
    error: undefined,
  };
}

export function validateEditableTaxLineValues(line: EditableTaxLineValues): EditableTaxLineValues {
  if (line.label.trim() === '') {
    return { ...line, error: 'Label is required.' };
  }

  const calculationType = line.calculationType === 'fixed' ? 'fixed' : 'percentage';

  if (calculationType === 'percentage') {
    const parsedRate = parseFloat(line.rate);
    if (hasMoreThanTwoDecimals(line.rate)) {
      return { ...line, error: 'Rate can have at most 2 decimal places.' };
    }
    if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      return { ...line, error: 'Rate must be between 0 and 100.' };
    }

    const parsedTaxableIncome = parseFloat(line.taxableIncome);
    if (hasMoreThanTwoDecimals(line.taxableIncome)) {
      return { ...line, error: 'Taxable income can have at most 2 decimal places.' };
    }
    if (!Number.isFinite(parsedTaxableIncome) || parsedTaxableIncome < 0) {
      return { ...line, error: 'Taxable income must be zero or greater.' };
    }
  } else {
    const parsedAmount = parseFloat(line.amount);
    if (hasMoreThanTwoDecimals(line.amount)) {
      return { ...line, error: 'Amount can have at most 2 decimal places.' };
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return { ...line, error: 'Amount must be zero or greater.' };
    }
  }

  return { ...line, error: undefined };
}

export function toStoredTaxLine(line: EditableTaxLineValues, taxableIncome: number): TaxLine {
  const calculationType = line.calculationType === 'fixed' ? 'fixed' : 'percentage';
  const parsedTaxableIncome = Math.max(0, parseFloat(line.taxableIncome) || 0);
  const effectiveTaxableIncome = Number.isFinite(parsedTaxableIncome) ? parsedTaxableIncome : taxableIncome;
  const parsedRate = Math.max(0, parseFloat(line.rate) || 0);
  const parsedAmount = Math.max(0, parseFloat(line.amount) || 0);

  return {
    id: line.id,
    label: line.label.trim(),
    rate: calculationType === 'fixed'
      ? calculateTaxLineRateFromAmount(effectiveTaxableIncome, parsedAmount)
      : parsedRate,
    amount: calculationType === 'fixed'
      ? roundToCent(parsedAmount)
      : calculateTaxLineAmountFromRate(effectiveTaxableIncome, parsedRate),
    taxableIncome: roundToCent(effectiveTaxableIncome),
    calculationType,
  };
}