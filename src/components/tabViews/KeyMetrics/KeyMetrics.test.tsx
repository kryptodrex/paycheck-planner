import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import KeyMetrics from './KeyMetrics';

const {
  mockBudgetData,
  annualizedSummary,
  annualizedBreakdown,
  calculatePaycheckBreakdownMock,
  calculateRetirementContributionsMock,
  updateBudgetSettingsMock,
} = vi.hoisted(() => ({
  mockBudgetData: {
    settings: {
      currency: 'USD',
      keyMetricsBreakdownView: 'bars',
    },
    paySettings: {
      payFrequency: 'monthly',
      payType: 'salary',
      annualSalary: 60000,
      minLeftover: 0,
    },
    accounts: [
      {
        id: 'acc-1',
        name: 'Checking',
        type: 'checking',
        color: '#4f46e5',
        icon: 'wallet',
        allocationCategories: [] as Array<{ id: string; name: string; amount: number }>,
      },
    ],
    bills: [
      {
        id: 'bill-1',
        name: 'Rent',
        amount: 1000,
        frequency: 'monthly',
        enabled: true,
      },
    ],
    benefits: [] as Array<{
      id: string;
      name: string;
      amount: number;
      isTaxable: boolean;
      isPercentage?: boolean;
      enabled?: boolean;
      deductionSource?: 'paycheck' | 'account';
    }>,
    retirement: [],
    loans: [] as Array<{
      id: string;
      name: string;
      type: 'mortgage' | 'auto' | 'student' | 'personal' | 'credit-card' | 'other';
      principal: number;
      currentBalance: number;
      interestRate: number;
      monthlyPayment: number;
      accountId: string;
      startDate: string;
      enabled?: boolean;
    }>,
    savingsContributions: [],
    preTaxDeductions: [],
    taxSettings: {
      taxLines: [],
      additionalWithholding: 0,
    },
  },
  annualizedSummary: {
    annualGross: 60000,
    annualNet: 42000,
    annualTaxes: 12000,
    monthlyGross: 5000,
    monthlyNet: 3500,
    monthlyTaxes: 1000,
  },
  annualizedBreakdown: {
    preTaxDeductions: 0,
    postTaxDeductions: 0,
  },
  calculatePaycheckBreakdownMock: vi.fn(() => ({
    grossPay: 5000,
    netPay: 3500,
  })),
  calculateRetirementContributionsMock: vi.fn(() => ({
    employeeAmount: 0,
  })),
  updateBudgetSettingsMock: vi.fn(),
}));

vi.mock('../../../contexts/BudgetContext', () => ({
  useBudget: () => ({
    budgetData: mockBudgetData,
    calculatePaycheckBreakdown: calculatePaycheckBreakdownMock,
    calculateRetirementContributions: calculateRetirementContributionsMock,
    updateBudgetSettings: updateBudgetSettingsMock,
  }),
}));

vi.mock('../../../services/budgetCalculations', () => ({
  calculateAnnualizedPaySummary: vi.fn(() => annualizedSummary),
  calculateAnnualizedPayBreakdown: vi.fn(() => annualizedBreakdown),
}));

vi.mock('../../../utils/keyMetricsSegments', () => ({
  buildKeyMetricsSegments: vi.fn(() => ({
    barSegments: [],
    flowRows: [
      {
        key: 'gross',
        label: 'Gross Pay',
        amount: 60000,
        percentage: 100,
        fillClass: 'km-flow-fill-income',
      },
    ],
  })),
}));

vi.mock('../../_shared', () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
  ViewModeSelector: () => null,
}));

vi.mock('../../modals/GlossaryModal', () => ({
  GlossaryTerm: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('KeyMetrics semantic badges', () => {
  beforeEach(() => {
    annualizedSummary.annualGross = 60000;
    annualizedSummary.annualNet = 42000;
    annualizedSummary.annualTaxes = 12000;
    annualizedSummary.monthlyGross = 5000;
    annualizedSummary.monthlyNet = 3500;
    annualizedSummary.monthlyTaxes = 1000;

    calculatePaycheckBreakdownMock.mockClear();
    calculateRetirementContributionsMock.mockClear();
    updateBudgetSettingsMock.mockClear();
    mockBudgetData.accounts[0].allocationCategories = [];
    mockBudgetData.benefits = [];
    mockBudgetData.loans = [];
  });

  it('renders visible semantic badges for the metric cards', () => {
    render(<KeyMetrics />);

    expect(screen.getByText('Incoming')).toBeTruthy();
    expect(screen.getByText('Withheld')).toBeTruthy();
    expect(screen.getByText('Take-home')).toBeTruthy();
    expect(screen.getByText('Committed')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('Flexible')).toBeTruthy();
  });

  it('shows recurring expenses card totals including bills, deductions, and loans', () => {
    mockBudgetData.benefits = [
      {
        id: 'benefit-1',
        name: 'Health Deduction',
        amount: 200,
        isTaxable: true,
        isPercentage: false,
        enabled: true,
        deductionSource: 'paycheck',
      },
    ];
    mockBudgetData.loans = [
      {
        id: 'loan-1',
        name: 'Auto Loan',
        type: 'auto',
        principal: 20000,
        currentBalance: 15000,
        interestRate: 4,
        monthlyPayment: 300,
        accountId: 'acc-1',
        startDate: '2026-01-01',
        enabled: true,
      },
    ];

    render(<KeyMetrics />);

    expect(screen.getByText('Recurring Expenses')).toBeTruthy();
    // 12k bills + (200*12) deductions + (300*12) loans = 18k yearly.
    expect(screen.getByText('$18,000')).toBeTruthy();
    expect(screen.getByText('3 items')).toBeTruthy();
  });

  it('includes custom allocation line items in recurring expenses totals', () => {
    mockBudgetData.accounts[0].allocationCategories = [
      { id: 'custom-1', name: 'Subscriptions', amount: 150 },
      { id: '__bills_auto-1', name: 'Auto Bills', amount: 400 },
    ];

    render(<KeyMetrics />);

    // 12k bills + (150*12) custom allocations = 13.8k yearly.
    // Auto allocation categories should not be double counted here.
    expect(screen.getByText('$13,800')).toBeTruthy();
    expect(screen.getByText('2 items')).toBeTruthy();
  });

  it('switches the remaining card badge to shortfall when bills exceed net pay', () => {
    mockBudgetData.accounts[0].allocationCategories = [
      { id: 'cat-1', name: 'Allocated', amount: 3600 },
    ];

    render(<KeyMetrics />);

    expect(screen.getByText('Shortfall')).toBeTruthy();
    expect(screen.queryByText('Flexible')).toBeNull();
  });

  it('uses allocation leftover math for remaining yearly amount', () => {
    // Net is 3,500 per paycheck, with 1,000 allocated => 2,500 remaining per paycheck.
    // Monthly pay frequency means yearly remaining should be 30,000.
    mockBudgetData.accounts[0].allocationCategories = [
      { id: 'cat-2', name: 'Planned spending', amount: 1000 },
    ];

    render(<KeyMetrics />);

    expect(screen.getByText('$30,000')).toBeTruthy();
  });
});