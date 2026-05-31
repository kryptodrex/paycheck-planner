import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PayBreakdown from './PayBreakdown';

const {
  updateBudgetDataMock,
  calculatePaycheckBreakdownMock,
  openConfirmDialogMock,
  closeConfirmDialogMock,
  confirmCurrentDialogMock,
  buildPreTaxLineItemsMock,
  buildPostTaxLineItemsMock,
  mockBudgetData,
} = vi.hoisted(() => ({
  updateBudgetDataMock: vi.fn(),
  calculatePaycheckBreakdownMock: vi.fn(() => ({
    grossPay: 2000,
    netPay: 1200,
  })),
  openConfirmDialogMock: vi.fn(),
  closeConfirmDialogMock: vi.fn(),
  confirmCurrentDialogMock: vi.fn(),
  buildPreTaxLineItemsMock: vi.fn((): Array<{ id: string; label: string; amount: number }> => []),
  buildPostTaxLineItemsMock: vi.fn((): Array<{ id: string; label: string; amount: number }> => []),
  mockBudgetData: {
    settings: { currency: 'USD' },
    paySettings: {
      payFrequency: 'monthly',
      payType: 'salary',
      annualSalary: 72000,
      minLeftover: 0,
    },
    accounts: [
      {
        id: 'account-1',
        name: 'Checking',
        type: 'checking',
        color: '#667eea',
        allocationCategories: [] as Array<{ id: string; name: string; amount: number }>,
      },
    ],
    bills: [],
    benefits: [],
    otherIncome: [
      {
        id: 'oi-gross',
        name: 'Gross Side Work',
        incomeType: 'personal-business',
        amountMode: 'fixed',
        amount: 120,
        frequency: 'monthly',
        enabled: true,
        notes: '',
        isTaxable: true,
        payTreatment: 'gross',
        withholdingMode: 'manual',
      },
      {
        id: 'oi-taxable',
        name: 'Taxable Bonus',
        incomeType: 'bonus',
        amountMode: 'fixed',
        amount: 60,
        frequency: 'monthly',
        enabled: true,
        notes: '',
        isTaxable: true,
        payTreatment: 'taxable',
        withholdingMode: 'manual',
      },
      {
        id: 'oi-net',
        name: 'Net Reimbursement',
        incomeType: 'reimbursement',
        amountMode: 'fixed',
        amount: 30,
        frequency: 'monthly',
        enabled: true,
        notes: '',
        isTaxable: false,
        payTreatment: 'net',
        withholdingMode: 'none',
      },
    ],
    retirement: [],
    loans: [],
    savingsContributions: [],
    preTaxDeductions: [],
    taxSettings: {
      taxLines: [],
    },
  },
}));

vi.mock('../../../contexts/BudgetContext', () => ({
  useBudget: () => ({
    budgetData: mockBudgetData,
    calculatePaycheckBreakdown: calculatePaycheckBreakdownMock,
    updateBudgetData: updateBudgetDataMock,
  }),
}));

vi.mock('../../../hooks', () => ({
  useAppDialogs: () => ({
    confirmDialog: null,
    openConfirmDialog: openConfirmDialogMock,
    closeConfirmDialog: closeConfirmDialogMock,
    confirmCurrentDialog: confirmCurrentDialogMock,
  }),
}));

vi.mock('../../../services/budgetCalculations', () => ({
  calculateAnnualizedPayBreakdown: vi.fn(() => ({
    grossPay: 24000,
    otherIncomeGross: 1440,
    otherIncomeTaxable: 720,
    otherIncomeNet: 360,
    preTaxDeductions: 0,
    taxableIncome: 24000,
    totalTaxes: 0,
    taxLineAmounts: [],
    additionalWithholding: 0,
    postTaxDeductions: 0,
    netPay: 14400,
  })),
  calculateCalendarPeriodBreakdown: vi.fn((_perPaycheckBreakdown, paychecksInPeriod: number) => ({
    grossPay: 2000 * paychecksInPeriod,
    otherIncomeGross: 120 * paychecksInPeriod,
    otherIncomeTaxable: 60 * paychecksInPeriod,
    otherIncomeNet: 30 * paychecksInPeriod,
    preTaxDeductions: 482.69 * paychecksInPeriod,
    taxableIncome: 2000 * paychecksInPeriod,
    totalTaxes: 0,
    taxLineAmounts: [],
    additionalWithholding: 0,
    postTaxDeductions: 0,
    netPay: 1200 * paychecksInPeriod,
  })),
  calculateDisplayPayBreakdown: vi.fn((annualBreakdown) => annualBreakdown),
}));

vi.mock('../../../utils/deductionLineItems', () => ({
  buildPreTaxLineItems: buildPreTaxLineItemsMock,
  buildPostTaxLineItems: buildPostTaxLineItemsMock,
}));

vi.mock('../../../services/reallocationPlanner', () => ({
  createReallocationPlan: vi.fn(() => ({
    proposals: [],
    totalFreedPerPaycheck: 0,
    projectedRemainingPerPaycheck: 0,
    fullyResolved: true,
  })),
  applyReallocationPlan: vi.fn(),
}));

vi.mock('../../modals/ReallocationReviewModal/ReallocationReviewModal', () => ({
  default: () => null,
}));

vi.mock('../../modals/ReallocationSummaryModal/ReallocationSummaryModal', () => ({
  default: () => null,
}));

vi.mock('../../modals/GlossaryModal', () => ({
  GlossaryTerm: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('PayBreakdown custom allocation validation', () => {
  beforeEach(() => {
    updateBudgetDataMock.mockClear();
    calculatePaycheckBreakdownMock.mockClear();
    openConfirmDialogMock.mockClear();
    closeConfirmDialogMock.mockClear();
    confirmCurrentDialogMock.mockClear();
    buildPreTaxLineItemsMock.mockReset();
    buildPostTaxLineItemsMock.mockReset();
    buildPreTaxLineItemsMock.mockReturnValue([]);
    buildPostTaxLineItemsMock.mockReturnValue([]);

    localStorage.clear();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    mockBudgetData.paySettings.minLeftover = 0;
    mockBudgetData.accounts[0].allocationCategories = [];
  });

  async function openCustomAllocationEditor(user: ReturnType<typeof userEvent.setup>) {
    render(
      <PayBreakdown
        displayMode="monthly"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Add Custom Item' }));
  }

  it('shows an error and blocks save when a custom allocation amount has no name', async () => {
    const user = userEvent.setup();

    await openCustomAllocationEditor(user);

    const amountInput = screen.getByRole('spinbutton');
    await user.clear(amountInput);
    await user.type(amountInput, '50');
    fireEvent.blur(amountInput);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText(/complete or remove the custom allocation item before saving/i)).toBeInTheDocument();
    expect(updateBudgetDataMock).not.toHaveBeenCalled();
  });

  it('shows an error and blocks save when a custom allocation item is left blank', async () => {
    const user = userEvent.setup();

    await openCustomAllocationEditor(user);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText(/complete or remove the custom allocation item before saving/i)).toBeInTheDocument();
    expect(updateBudgetDataMock).not.toHaveBeenCalled();
  });

  it('shows an error and blocks save when a custom allocation name has a zero amount', async () => {
    const user = userEvent.setup();

    await openCustomAllocationEditor(user);

    await user.type(screen.getByPlaceholderText('Item name'), 'Emergency fund');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText(/complete or remove the custom allocation item before saving/i)).toBeInTheDocument();
    expect(updateBudgetDataMock).not.toHaveBeenCalled();
  });

  it('renders a text-first below-target warning prefix when remaining is below the configured minimum', () => {
    mockBudgetData.paySettings.minLeftover = 1500;

    render(
      <PayBreakdown
        displayMode="monthly"
      />,
    );

    expect(screen.getByText(/below target:/i)).toBeInTheDocument();
    expect(screen.getByText(/below your target minimum/i)).toBeInTheDocument();
  });

  it('renders a text-first over-allocation prefix when allocations exceed net pay', () => {
    mockBudgetData.accounts[0].allocationCategories = [
      {
        id: 'custom-overallocated',
        name: 'Overallocated Item',
        amount: 1500,
      },
    ];

    render(
      <PayBreakdown
        displayMode="monthly"
      />,
    );

    expect(screen.getByText(/overallocation:/i)).toBeInTheDocument();
    expect(screen.getByText(/allocations exceed net pay/i)).toBeInTheDocument();
  });

  it('shows other income contribution details in gross, taxable, and net stages', () => {
    render(
      <PayBreakdown
        displayMode="monthly"
      />,
    );

    expect(screen.getByText('Gross Side Work')).toBeInTheDocument();
    expect(screen.getByText('Taxable Bonus')).toBeInTheDocument();
    expect(screen.getByText('Net Reimbursement')).toBeInTheDocument();
    expect(screen.getByText('+$120.00')).toBeInTheDocument();
    expect(screen.getByText('+$60.00')).toBeInTheDocument();
    expect(screen.getByText('+$30.00')).toBeInTheDocument();
  });

  it('keeps monthly-frequency other income details stable in calendar mode even during 3-paycheck periods', () => {
    render(
      <PayBreakdown
        displayMode="monthly"
        calendarAccurate={true}
        paychecksInPeriod={3}
      />,
    );

    expect(screen.getByText('Gross Side Work')).toBeInTheDocument();
    expect(screen.getByText('Taxable Bonus')).toBeInTheDocument();
    expect(screen.getByText('Net Reimbursement')).toBeInTheDocument();
    expect(screen.getByText('+$120.00')).toBeInTheDocument();
    expect(screen.getByText('+$60.00')).toBeInTheDocument();
    expect(screen.getByText('+$30.00')).toBeInTheDocument();
  });

  it('scales pre-tax deduction line items with selected paycheck count in calendar mode', () => {
    buildPreTaxLineItemsMock.mockReturnValue([
      { id: 'pretax-401k', label: '401(k)', amount: 279.39 },
      { id: 'pretax-health', label: 'Health Insurance', amount: 203.3 },
    ]);

    render(
      <PayBreakdown
        displayMode="monthly"
        calendarAccurate={true}
        paychecksInPeriod={3}
      />,
    );

    expect(screen.getByText(/401\(k\)/i)).toBeInTheDocument();
    expect(screen.getByText(/health insurance/i)).toBeInTheDocument();
    expect(screen.getByText(/838\.17/)).toBeInTheDocument();
    expect(screen.getByText(/609\.90/)).toBeInTheDocument();
  });

});
