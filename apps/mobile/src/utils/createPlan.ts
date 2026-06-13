import {
  generateId,
  getDefaultAccountColor,
  getDefaultAccountIconKey,
  type BudgetData,
  type PayFrequency,
  type PayType,
} from '@paycheck-planner/core';

export interface NewPlanOptions {
  name: string;
  year: number;
  currency: string;
  payType: PayType;
  annualSalary?: number;
  hourlyRate?: number;
  hoursPerPayPeriod?: number;
  payFrequency: PayFrequency;
}

/**
 * Create a fresh plan with the same defaults as the desktop's
 * FileStorageService.createEmptyBudget: four standard tax lines and a
 * single checking account, plus the pay settings collected on mobile.
 */
export function createEmptyPlan(options: NewPlanOptions): BudgetData {
  const now = new Date().toISOString();

  return {
    id: generateId(),
    name: options.name,
    year: options.year,
    paySettings: {
      payType: options.payType,
      annualSalary: options.payType === 'salary' ? options.annualSalary : undefined,
      hourlyRate: options.payType === 'hourly' ? options.hourlyRate : undefined,
      hoursPerPayPeriod: options.payType === 'hourly' ? options.hoursPerPayPeriod : undefined,
      payFrequency: options.payFrequency,
    },
    preTaxDeductions: [],
    otherIncome: [],
    benefits: [],
    retirement: [],
    taxSettings: {
      taxLines: [
        { id: generateId(), label: 'Federal Tax', rate: 0, amount: 0, calculationType: 'percentage' },
        { id: generateId(), label: 'State Tax', rate: 0, amount: 0, calculationType: 'percentage' },
        { id: generateId(), label: 'Social Security', rate: 6.2, amount: 0, calculationType: 'percentage' },
        { id: generateId(), label: 'Medicare', rate: 1.45, amount: 0, calculationType: 'percentage' },
      ],
      additionalWithholding: 0,
    },
    accounts: [
      {
        id: generateId(),
        name: 'My Checking',
        type: 'checking',
        color: getDefaultAccountColor('checking'),
        icon: getDefaultAccountIconKey('checking'),
        isRemainder: true,
      },
    ],
    bills: [],
    loans: [],
    savingsContributions: [],
    metadata: {
      auditHistory: [],
    },
    settings: {
      currency: options.currency,
      locale: 'en-US',
      displayMode: 'paycheck',
    },
    createdAt: now,
    updatedAt: now,
  };
}
