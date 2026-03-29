import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OtherIncomeManager from './OtherIncomeManager';

const {
  addOtherIncomeMock,
  updateOtherIncomeMock,
  deleteOtherIncomeMock,
  openConfirmDialogMock,
  closeConfirmDialogMock,
  confirmCurrentDialogMock,
  mockBudgetData,
} = vi.hoisted(() => ({
  addOtherIncomeMock: vi.fn(),
  updateOtherIncomeMock: vi.fn(),
  deleteOtherIncomeMock: vi.fn(),
  openConfirmDialogMock: vi.fn(),
  closeConfirmDialogMock: vi.fn(),
  confirmCurrentDialogMock: vi.fn(),
  mockBudgetData: {
    settings: { currency: 'USD' },
    paySettings: {
      payFrequency: 'bi-weekly',
      payType: 'salary',
      annualSalary: 104000,
    },
    accounts: [],
    bills: [],
    benefits: [],
    otherIncome: [
      {
        id: 'income-1',
        name: 'Weekend Studio',
        incomeType: 'personal-business',
        amountMode: 'fixed',
        amount: 400,
        frequency: 'monthly',
        enabled: true,
        notes: 'Client retainers',
        isTaxable: true,
        payTreatment: 'net',
        withholdingMode: 'manual',
      },
    ],
    retirement: [],
    loans: [],
    savingsContributions: [],
    preTaxDeductions: [],
    taxSettings: {
      taxLines: [],
      additionalWithholding: 0,
    },
  },
}));

vi.mock('../../../contexts/BudgetContext', () => ({
  useBudget: () => ({
    budgetData: mockBudgetData,
    addOtherIncome: addOtherIncomeMock,
    updateOtherIncome: updateOtherIncomeMock,
    deleteOtherIncome: deleteOtherIncomeMock,
  }),
}));

vi.mock('../../../hooks', async () => ({
  ...(await vi.importActual('../../../hooks')),
  useAppDialogs: () => ({
    confirmDialog: null,
    openConfirmDialog: openConfirmDialogMock,
    closeConfirmDialog: closeConfirmDialogMock,
    confirmCurrentDialog: confirmCurrentDialogMock,
  }),
}));

describe('OtherIncomeManager', () => {
  beforeEach(() => {
    addOtherIncomeMock.mockClear();
    updateOtherIncomeMock.mockClear();
    deleteOtherIncomeMock.mockClear();
    openConfirmDialogMock.mockClear();
  });

  it('renders personal business entries', () => {
    render(<OtherIncomeManager displayMode="paycheck" />);

    expect(screen.getByText('Weekend Studio')).toBeInTheDocument();
    expect(screen.getByText('Personal Business')).toBeInTheDocument();
    expect(screen.getAllByText('Add to Net Pay').length).toBeGreaterThan(0);
  });

  it('creates a new other income entry with Personal Business type', async () => {
    const user = userEvent.setup();

    render(<OtherIncomeManager displayMode="paycheck" />);

    await user.click(screen.getByRole('button', { name: /add other income/i }));
    await user.type(screen.getByPlaceholderText('e.g., Weekend Studio, Freelance Design'), 'Freelance Design');

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'personal-business');
    await user.selectOptions(selects[1], 'gross');

    await user.type(screen.getByPlaceholderText('0.00'), '650');
    await user.click(screen.getByRole('button', { name: /add entry/i }));

    expect(addOtherIncomeMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Freelance Design',
      incomeType: 'personal-business',
      amount: 650,
      payTreatment: 'gross',
    }));
  });

  it('shows per-paycheck, monthly, and annual previews in the editor', async () => {
    const user = userEvent.setup();

    render(<OtherIncomeManager displayMode="paycheck" />);

    await user.click(screen.getByRole('button', { name: /add other income/i }));
    await user.type(screen.getByPlaceholderText('e.g., Weekend Studio, Freelance Design'), 'Freelance Design');
    await user.type(screen.getByPlaceholderText('0.00'), '650');

    expect(screen.getByDisplayValue('300.00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('650.00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('7800.00')).toBeInTheDocument();
  });

  it('shows auto withholding profile selection and saves an explicit profile override', async () => {
    const user = userEvent.setup();

    render(<OtherIncomeManager displayMode="paycheck" />);

    await user.click(screen.getByRole('button', { name: /add other income/i }));

    await user.selectOptions(screen.getAllByRole('combobox')[4], 'auto');

    expect(screen.getAllByRole('combobox')).toHaveLength(6);

    await user.selectOptions(
      screen.getAllByRole('combobox')[5],
      'general-supplemental',
    );

    await user.type(screen.getByPlaceholderText('e.g., Weekend Studio, Freelance Design'), 'Freelance Design');
    await user.type(screen.getByPlaceholderText('0.00'), '650');
    expect(screen.getByText(/auto withholding preview/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add entry/i }));

    expect(addOtherIncomeMock).toHaveBeenCalledWith(expect.objectContaining({
      withholdingMode: 'auto',
      withholdingProfileId: 'general-supplemental',
    }));
  });

  it('validates percent-of-gross guardrails', async () => {
    const user = userEvent.setup();

    render(<OtherIncomeManager displayMode="paycheck" />);

    await user.click(screen.getByRole('button', { name: /add other income/i }));
    await user.type(screen.getByPlaceholderText('e.g., Weekend Studio, Freelance Design'), 'Side Hustle');
    await user.selectOptions(screen.getAllByRole('combobox')[2], 'percent-of-gross');
    await user.type(screen.getByPlaceholderText('0'), '130');
    await user.click(screen.getByRole('button', { name: /add entry/i }));

    expect(screen.getByText(/percent of gross must be 100 or less/i)).toBeInTheDocument();
  });
});