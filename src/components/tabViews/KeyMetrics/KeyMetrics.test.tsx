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
    accounts: [],
    bills: [
      {
        id: 'bill-1',
        name: 'Rent',
        amount: 1000,
        frequency: 'monthly',
        enabled: true,
      },
    ],
    benefits: [],
    retirement: [],
    loans: [],
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

  it('switches the remaining card badge to shortfall when bills exceed net pay', () => {
    annualizedSummary.annualNet = 6000;
    annualizedSummary.monthlyNet = 500;

    render(<KeyMetrics />);

    expect(screen.getByText('Shortfall')).toBeTruthy();
    expect(screen.queryByText('Flexible')).toBeNull();
  });
});