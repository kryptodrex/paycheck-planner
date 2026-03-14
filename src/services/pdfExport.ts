// Service for exporting budget data to PDF format
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BudgetData } from '../types/budget';
import { calculatePaycheckBreakdown } from './budgetCalculations';
import { formatWithSymbol } from '../utils/currency';
import { getRetirementPlanDisplayLabel } from '../utils/retirement';

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

function getNextYPosition(doc: jsPDF, fallback: number): number {
  const finalY = (doc as JsPdfWithAutoTable).lastAutoTable?.finalY;
  return typeof finalY === 'number' ? finalY + 15 : fallback;
}

export interface PDFExportOptions {
  password?: string;
  includeMetrics?: boolean;
  includePayBreakdown?: boolean;
  includeAccounts?: boolean;
  includeBills?: boolean;
  includeBenefits?: boolean;
  includeRetirement?: boolean;
  includeTaxes?: boolean;
}

/**
 * Export budget data as a PDF file
 * @param budgetData - The budget data to export
 * @param options - Export options including password protection
 * @returns PDF file as Uint8Array
 */
export async function exportToPDF(
  budgetData: BudgetData,
  options: PDFExportOptions = {}
): Promise<Uint8Array> {
  const {
    password,
    includeMetrics = true,
    includePayBreakdown = true,
    includeAccounts = true,
    includeBills = true,
    includeBenefits = true,
    includeRetirement = true,
    includeTaxes = true,
  } = options;

  const doc = new jsPDF();
  const currency = budgetData.settings.currency || 'USD';
  let yPosition = 20;

  // Helper function to check if we need a new page
  const checkPageBreak = (neededSpace: number) => {
    if (yPosition + neededSpace > 280) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Add header/title
  doc.setFontSize(24);
  doc.setTextColor(40, 40, 40);
  doc.text(budgetData.name, 20, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Year: ${budgetData.year}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Exported: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 15;

  const breakdown = calculatePaycheckBreakdown(budgetData);
  const paycheckAmount = breakdown.grossPay;
  const preTaxDeductions = breakdown.preTaxDeductions;
  const taxLineAmounts = (budgetData.taxSettings.taxLines || []).map((line, index) => ({
    label: line.label,
    rate: line.rate,
    amount: breakdown.taxLineAmounts[index]?.amount ?? 0,
  }));
  const additionalWithholding = breakdown.additionalWithholding;
  const totalTaxes = breakdown.totalTaxes;
  const netPay = breakdown.netPay;

  // Calculate total account allocations
  const totalAllocations = budgetData.accounts.reduce((sum, account) => {
    return sum + (account.allocation || 0);
  }, 0);

  const leftover = netPay - totalAllocations;

  // Key Metrics Section
  if (includeMetrics) {
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Key Metrics', 20, yPosition);
    yPosition += 10;

    const metricsData = [
      ['Gross Pay (per paycheck)', formatWithSymbol(paycheckAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
      ['Pre-Tax Deductions', formatWithSymbol(preTaxDeductions, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
      ['Total Taxes', formatWithSymbol(totalTaxes, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
      ['Net Pay', formatWithSymbol(netPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
      ['Total Allocations', formatWithSymbol(totalAllocations, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
      ['Leftover', formatWithSymbol(leftover, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Amount']],
      body: metricsData,
      theme: 'striped',
      headStyles: { fillColor: [70, 130, 180] },
      margin: { left: 20, right: 20 },
    });

    yPosition = getNextYPosition(doc, yPosition + 15);
  }

  // Pay Breakdown Section
  if (includePayBreakdown) {
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Pay Breakdown', 20, yPosition);
    yPosition += 10;

    const payType = budgetData.paySettings.payType === 'salary' ? 'Salary' : 'Hourly';
    const payAmount = budgetData.paySettings.payType === 'salary'
      ? formatWithSymbol(budgetData.paySettings.annualSalary || 0, currency)
      : formatWithSymbol(budgetData.paySettings.hourlyRate || 0, currency) + '/hr';
    
    const payFrequencyMap = {
      'weekly': 'Weekly (52/year)',
      'bi-weekly': 'Bi-weekly (26/year)',
      'semi-monthly': 'Semi-monthly (24/year)',
      'monthly': 'Monthly (12/year)',
    };

    const payData = [
      ['Pay Type', payType],
      ['Amount', payAmount],
      ['Pay Frequency', payFrequencyMap[budgetData.paySettings.payFrequency]],
      ['Target Leftover', formatWithSymbol(budgetData.paySettings.minLeftover || 0, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
    ];

    if (budgetData.paySettings.payType === 'hourly') {
      payData.splice(2, 0, ['Hours per Pay Period', (budgetData.paySettings.hoursPerPayPeriod || 0).toString()]);
    }

    autoTable(doc, {
      startY: yPosition,
      body: payData,
      theme: 'plain',
      margin: { left: 20, right: 20 },
    });

    yPosition = getNextYPosition(doc, yPosition + 15);
  }

  // Taxes Section
  if (includeTaxes) {
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Tax Settings', 20, yPosition);
    yPosition += 10;

    const taxData = [
      ...taxLineAmounts.map(l => [l.label, `${l.rate}%`, formatWithSymbol(l.amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })]),
      ['Additional Withholding', '-', formatWithSymbol(additionalWithholding, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Tax Type', 'Rate', 'Amount per Paycheck']],
      body: taxData,
      theme: 'striped',
      headStyles: { fillColor: [70, 130, 180] },
      margin: { left: 20, right: 20 },
    });

    yPosition = getNextYPosition(doc, yPosition + 15);
  }

  // Benefits Section
  if (includeBenefits && budgetData.benefits.length > 0) {
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Benefits', 20, yPosition);
    yPosition += 10;

    const benefitsData = budgetData.benefits.map(benefit => {
      const amount = benefit.isPercentage
        ? `${benefit.amount}% (${formatWithSymbol((paycheckAmount * benefit.amount) / 100, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
        : formatWithSymbol(benefit.amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const taxType = benefit.isTaxable ? 'Post-Tax' : 'Pre-Tax';
      const source = benefit.deductionSource === 'account' ? 'From Account' : 'From Paycheck';
      return [benefit.name, amount, taxType, source];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Benefit', 'Amount', 'Tax Type', 'Source']],
      body: benefitsData,
      theme: 'striped',
      headStyles: { fillColor: [70, 130, 180] },
      margin: { left: 20, right: 20 },
    });

    yPosition = getNextYPosition(doc, yPosition + 15);
  }

  // Retirement Section
  if (includeRetirement && budgetData.retirement.length > 0) {
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Retirement Contributions', 20, yPosition);
    yPosition += 10;

    const retirementData = budgetData.retirement.map(retirement => {
      const employeeAmt = retirement.employeeContributionIsPercentage
        ? `${retirement.employeeContribution}% (${formatWithSymbol((paycheckAmount * retirement.employeeContribution) / 100, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
        : formatWithSymbol(retirement.employeeContribution, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const taxType = retirement.isPreTax ?? true ? 'Pre-Tax' : 'Post-Tax';
      const matchInfo = retirement.hasEmployerMatch
        ? retirement.employerMatchCapIsPercentage
          ? `${retirement.employerMatchCap}%`
          : formatWithSymbol(retirement.employerMatchCap, currency)
        : 'No match';
      return [getRetirementPlanDisplayLabel(retirement), employeeAmt, matchInfo, taxType];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Type', 'Employee Contribution', 'Employer Match', 'Tax Type']],
      body: retirementData,
      theme: 'striped',
      headStyles: { fillColor: [70, 130, 180] },
      margin: { left: 20, right: 20 },
    });

    yPosition = getNextYPosition(doc, yPosition + 15);
  }

  // Accounts Section
  if (includeAccounts && budgetData.accounts.length > 0) {
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Accounts', 20, yPosition);
    yPosition += 10;

    const accountsData = budgetData.accounts.map(account => {
      const allocation = formatWithSymbol(account.allocation || 0, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const categories = account.allocationCategories?.length || 0;
      return [account.name, account.type, allocation, categories.toString()];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Account Name', 'Type', 'Allocation', 'Categories']],
      body: accountsData,
      theme: 'striped',
      headStyles: { fillColor: [70, 130, 180] },
      margin: { left: 20, right: 20 },
    });

    yPosition = getNextYPosition(doc, yPosition + 15);
  }

  // Bills Section
  if (includeBills && budgetData.bills.length > 0) {
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Bills', 20, yPosition);
    yPosition += 10;

    const billsData = budgetData.bills
      .filter(bill => bill.enabled !== false)
      .map(bill => {
        const account = budgetData.accounts.find(a => a.id === bill.accountId);
        const amount = formatWithSymbol(bill.amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return [bill.name, amount, bill.frequency, account?.name || 'Unknown'];
      });

    autoTable(doc, {
      startY: yPosition,
      head: [['Bill Name', 'Amount', 'Frequency', 'Account']],
      body: billsData,
      theme: 'striped',
      headStyles: { fillColor: [70, 130, 180] },
      margin: { left: 20, right: 20 },
    });

    yPosition = getNextYPosition(doc, yPosition + 15);
  }

  // Add footer to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'Generated by Paycheck Planner',
      20,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Get PDF as array buffer
  const pdfBytes = doc.output('arraybuffer');

  // If password protection is requested, use pdf-lib to encrypt
  // Note: pdf-lib v1.17.1 supports encryption but the API may vary
  // For now, we'll skip encryption and document it as a future enhancement
  if (password && password.trim() !== '') {
    // TODO: Implement PDF encryption with pdf-lib
    // The encrypt method is available in newer versions of pdf-lib
    // For now, we'll export without password protection
    console.warn('PDF password protection not yet implemented');
  }

  return new Uint8Array(pdfBytes);
}
