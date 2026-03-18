import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PayBreakdown from './PayBreakdown';

class LocalStorageMock {
  private store = new Map<string, string>();

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

const localStorageMock = new LocalStorageMock();

const {
  updateBudgetDataMock,
  calculatePaycheckBreakdownMock,
  openConfirmDialogMock,
  closeConfirmDialogMock,
  confirmCurrentDialogMock,
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
        allocationCategories: [],
      },
    ],
    bills: [],
    benefits: [],
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
    preTaxDeductions: 0,
    taxableIncome: 24000,
    totalTaxes: 0,
    taxLineAmounts: [],
    additionalWithholding: 0,
    postTaxDeductions: 0,
    netPay: 14400,
  })),
  calculateDisplayPayBreakdown: vi.fn((annualBreakdown) => annualBreakdown),
}));

vi.mock('../../../utils/deductionLineItems', () => ({
  buildPreTaxLineItems: vi.fn(() => []),
  buildPostTaxLineItems: vi.fn(() => []),
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

vi.mock('../../modals/PaySettingsModal', () => ({
  default: () => null,
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

    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });

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
  });

  it('shows an error and blocks save when a custom allocation amount has no name', async () => {
    const user = userEvent.setup();

    render(
      <PayBreakdown
        displayMode="monthly"
        onDisplayModeChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: '+ Add Item' }));

    const amountInput = screen.getByRole('spinbutton');
    await user.clear(amountInput);
    await user.type(amountInput, '50');
    fireEvent.blur(amountInput);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText(/add a name to the custom allocation item before saving/i)).toBeInTheDocument();
    expect(updateBudgetDataMock).not.toHaveBeenCalled();
  });
});