import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BudgetData } from '../types/auth';

const { pdfInstances, autoTableMock, MockJsPDF } = vi.hoisted(() => {
  const instances: Array<Record<string, unknown>> = [];

  class JsPDFMock {
    lastAutoTable?: { finalY: number };
    internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    };

    setFontSize = vi.fn();
    setTextColor = vi.fn();
    text = vi.fn();
    addPage = vi.fn();
    getNumberOfPages = vi.fn(() => 1);
    setPage = vi.fn();
    output = vi.fn(() => new ArrayBuffer(16));

    constructor() {
      instances.push(this as unknown as Record<string, unknown>);
    }
  }

  const tableMock = vi.fn((doc: { lastAutoTable?: { finalY: number } }, options: { startY?: number }) => {
    doc.lastAutoTable = { finalY: (options.startY ?? 20) + 10 };
  });

  return {
    pdfInstances: instances,
    autoTableMock: tableMock,
    MockJsPDF: JsPDFMock,
  };
});

vi.mock('jspdf', () => ({
  default: MockJsPDF,
}));

vi.mock('jspdf-autotable', () => ({
  default: autoTableMock,
}));

import { exportToPDF } from './pdfExport';
import { calculatePaycheckBreakdown } from './budgetCalculations';

function createBudgetFixture(): BudgetData {
  return {
    id: 'plan-1',
    name: 'My 2026 Plan',
    year: 2026,
    paySettings: {
      payType: 'salary',
      annualSalary: 130000,
      payFrequency: 'bi-weekly',
      minLeftover: 100,
    },
    preTaxDeductions: [
      {
        id: 'deduction-1',
        name: 'HSA',
        amount: 100,
        isPercentage: false,
      },
    ],
    benefits: [
      {
        id: 'benefit-1',
        name: 'Health Insurance',
        amount: 75,
        isTaxable: false,
        isPercentage: false,
        deductionSource: 'paycheck',
      },
    ],
    retirement: [
      {
        id: 'ret-1',
        type: 'roth-ira',
        customLabel: '',
        employeeContribution: 5,
        employeeContributionIsPercentage: true,
        hasEmployerMatch: false,
        employerMatchCap: 0,
        employerMatchCapIsPercentage: false,
        isPreTax: false,
        deductionSource: 'paycheck',
      },
    ],
    taxSettings: {
      taxLines: [
        { id: 'tax-1', label: 'Federal Tax', rate: 10 },
        { id: 'tax-2', label: 'State Tax', rate: 5 },
      ],
      additionalWithholding: 25,
    },
    accounts: [
      {
        id: 'acct-1',
        name: 'Checking',
        type: 'checking',
        allocation: 1200,
        allocationCategories: [],
        color: '#123456',
      },
    ],
    bills: [
      {
        id: 'bill-1',
        name: 'Rent',
        amount: 1000,
        frequency: 'monthly',
        accountId: 'acct-1',
        enabled: true,
      },
    ],
    loans: [],
    savingsContributions: [],
    settings: {
      currency: 'USD',
      locale: 'en-US',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('pdfExport', () => {
  beforeEach(() => {
    pdfInstances.length = 0;
    autoTableMock.mockClear();
  });

  it('exports budget data to a Uint8Array and writes plan title', async () => {
    const bytes = await exportToPDF(createBudgetFixture());

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBe(16);

    const doc = pdfInstances[0] as unknown as InstanceType<typeof MockJsPDF>;
    expect(doc.text).toHaveBeenCalledWith('My 2026 Plan', 20, 20);
    expect(doc.output).toHaveBeenCalledWith('arraybuffer');
    expect(autoTableMock).toHaveBeenCalled();
  });

  it('supports excluding all sections (no auto tables rendered)', async () => {
    await exportToPDF(createBudgetFixture(), {
      includeMetrics: false,
      includePayBreakdown: false,
      includeAccounts: false,
      includeBills: false,
      includeBenefits: false,
      includeRetirement: false,
      includeTaxes: false,
    });

    expect(autoTableMock).not.toHaveBeenCalled();
    const doc = pdfInstances[0] as unknown as InstanceType<typeof MockJsPDF>;
    expect(doc.output).toHaveBeenCalledWith('arraybuffer');
  });

  it('renders retirement section labels using display label mapping', async () => {
    await exportToPDF(createBudgetFixture(), {
      includeMetrics: false,
      includePayBreakdown: false,
      includeAccounts: false,
      includeBills: false,
      includeBenefits: false,
      includeRetirement: true,
      includeTaxes: false,
    });

    const retirementCall = autoTableMock.mock.calls.find((call) => {
      const options = call[1] as { head?: string[][] };
      return options.head?.[0]?.[0] === 'Type';
    });

    expect(retirementCall).toBeTruthy();
    const options = retirementCall?.[1] as { body?: string[][] };
    expect(options.body?.[0]?.[0]).toBe('Roth IRA');
  });

  it('warns when password option is provided (encryption not implemented)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await exportToPDF(createBudgetFixture(), { password: 'secret' });

    expect(warnSpy).toHaveBeenCalledWith('PDF password protection not yet implemented');
    warnSpy.mockRestore();
  });

  it('uses shared budget calculation totals in the metrics section', async () => {
    const budget = createBudgetFixture();
    const breakdown = calculatePaycheckBreakdown(budget);

    await exportToPDF(budget, {
      includeMetrics: true,
      includePayBreakdown: false,
      includeAccounts: false,
      includeBills: false,
      includeBenefits: false,
      includeRetirement: false,
      includeTaxes: false,
    });

    const metricsCall = autoTableMock.mock.calls.find((call) => {
      const options = call[1] as { head?: string[][] };
      return options.head?.[0]?.[0] === 'Metric';
    });

    expect(metricsCall).toBeTruthy();
    const options = metricsCall?.[1] as { body?: string[][] };
    expect(options.body).toEqual([
      ['Gross Pay (per paycheck)', '$5,000.00'],
      ['Pre-Tax Deductions', '$175.00'],
      ['Total Taxes', '$748.75'],
      ['Net Pay', '$3,826.25'],
      ['Total Allocations', '$1,200.00'],
      ['Leftover', '$2,626.25'],
    ]);
    expect(breakdown.grossPay).toBe(5000);
    expect(breakdown.netPay).toBe(3826.25);
  });
});
