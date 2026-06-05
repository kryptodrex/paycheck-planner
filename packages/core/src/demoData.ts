import type { Account } from './accounts';
import type { BudgetData, BudgetSettings } from './budget';
import type { Bill, Loan, SavingsContribution } from './obligations';
import type { Benefit, RetirementElection, TaxFilingStatus, TaxSettings } from './payroll';
import type { PayFrequency } from './frequency';
import { getPaychecksPerYear } from './payPeriod';
import { getDefaultAccountColor } from './accountDefaults';

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function calculatePrincipal(monthlyPayment: number, annualInterestRate: number, termMonths: number): number {
  const monthlyRate = annualInterestRate / 100 / 12;
  if (monthlyRate === 0) return monthlyPayment * termMonths;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  return monthlyPayment * (factor - 1) / (monthlyRate * factor);
}

function calculateRemainingBalance(
  principal: number,
  annualInterestRate: number,
  termMonths: number,
  monthsElapsed: number,
): number {
  if (monthsElapsed >= termMonths) return 0;
  if (monthsElapsed === 0) return principal;
  const monthlyRate = annualInterestRate / 100 / 12;
  if (monthlyRate === 0) return principal * (1 - monthsElapsed / termMonths);
  const factorTotal = Math.pow(1 + monthlyRate, termMonths);
  const factorElapsed = Math.pow(1 + monthlyRate, monthsElapsed);
  return Math.max(0, principal * (factorTotal - factorElapsed) / (factorTotal - 1));
}

/**
 * Built-in simplified tax estimation for demo data.
 * Uses approximate effective rates — not a substitute for the full
 * API-backed tax estimation used in the desktop setup wizard.
 */
function estimateDemoTaxSettings(
  annualGrossPay: number,
  paychecksPerYear: number,
  filingStatus: TaxFilingStatus,
): TaxSettings {
  const federalRate =
    annualGrossPay <= 11000 ? 10
    : annualGrossPay <= 44725 ? 12
    : annualGrossPay <= 95375 ? 22
    : annualGrossPay <= 201050 ? 24
    : 32;

  const stateRate = annualGrossPay <= 40000 ? 4 : annualGrossPay <= 80000 ? 5 : 6;

  const ssWageCap = 160200;
  const ssRate = annualGrossPay <= ssWageCap ? 6.2 : roundToPrecision((ssWageCap / annualGrossPay) * 6.2, 4);

  void paychecksPerYear;
  void filingStatus;

  return {
    taxLines: [
      { id: 'federal', label: 'Federal Tax', rate: federalRate },
      { id: 'state', label: 'State Tax', rate: stateRate },
      { id: 'social-security', label: 'Social Security', rate: ssRate },
      { id: 'medicare', label: 'Medicare', rate: 1.45 },
    ],
    additionalWithholding: 0,
    filingStatus,
  };
}

function estimateAnnualNet(
  annualGrossPay: number,
  paychecksPerYear: number,
  benefits: Benefit[],
  retirement: RetirementElection[],
  taxSettings: TaxSettings,
): number {
  const grossPerPaycheck = annualGrossPay / paychecksPerYear;

  let preTaxPerPaycheck = 0;
  for (const b of benefits) {
    if ((b.deductionSource ?? 'paycheck') === 'paycheck' && !b.isTaxable) {
      preTaxPerPaycheck += b.isPercentage ? (grossPerPaycheck * b.amount) / 100 : b.amount;
    }
  }
  for (const r of retirement) {
    if ((r.deductionSource ?? 'paycheck') === 'paycheck' && r.isPreTax !== false) {
      preTaxPerPaycheck += r.employeeContributionIsPercentage
        ? (grossPerPaycheck * r.employeeContribution) / 100
        : r.employeeContribution;
    }
  }

  const taxableIncome = Math.max(0, grossPerPaycheck - preTaxPerPaycheck);
  const totalTaxRate = taxSettings.taxLines.reduce((s, l) => s + l.rate, 0);
  const netPerPaycheck = Math.max(0, taxableIncome - (taxableIncome * totalTaxRate) / 100);
  return roundToCents(netPerPaycheck * paychecksPerYear);
}

/**
 * Generate realistic demo budget data.
 * Self-contained: uses built-in simplified tax rates so it works on any
 * platform without an API connection. Pass in the current year and
 * optional currency code.
 */
export function generateDemoBudgetData(year: number, currency = 'USD'): BudgetData<BudgetSettings> {
  const payFrequencies: PayFrequency[] = ['weekly', 'bi-weekly', 'semi-monthly', 'monthly'];
  const payFrequency = payFrequencies[Math.floor(Math.random() * payFrequencies.length)];
  const paychecksPerYear = getPaychecksPerYear(payFrequency);

  const isHourly = Math.random() > 0.6;
  let payType: 'salary' | 'hourly' = 'salary';
  let annualSalary: number | undefined;
  let hourlyRate: number | undefined;
  let hoursPerPayPeriod: number | undefined;
  let annualGrossPay = 0;

  if (isHourly) {
    payType = 'hourly';
    const rates = [16, 18, 20, 22, 24, 27, 30, 34, 38, 42, 48];
    hourlyRate = rates[Math.floor(Math.random() * rates.length)];
    const weeklyHours = [25, 30, 35, 40][Math.floor(Math.random() * 4)];
    hoursPerPayPeriod = Math.round(weeklyHours * (52 / paychecksPerYear));
    annualGrossPay = hourlyRate * weeklyHours * 52;
  } else {
    const salaries = [32000, 38000, 45000, 52000, 60000, 70000, 82000, 92000, 98000, 110000, 130000, 210000];
    annualSalary = salaries[Math.floor(Math.random() * salaries.length)];
    annualGrossPay = annualSalary * randomBetween(0.88, 1.12);
  }

  const checkingId = crypto.randomUUID();
  const accounts: Account[] = [
    { id: checkingId, name: 'Example Bank', type: 'checking', color: getDefaultAccountColor('checking') },
  ];

  const additionalTypes: Array<'savings' | 'investment'> = ['savings', 'investment'];
  const numExtra = Math.floor(Math.random() * 3);
  if (numExtra > 0) {
    const shuffled = [...additionalTypes].sort(() => Math.random() - 0.5);
    const names = { savings: 'Emergency Fund', investment: 'Investment Account' };
    for (let i = 0; i < numExtra; i++) {
      const type = shuffled[i];
      accounts.push({ id: crypto.randomUUID(), name: names[type], type, color: getDefaultAccountColor(type) });
    }
  }

  const grossPerPaycheck = roundToCents(annualGrossPay / paychecksPerYear);
  const benefits: Benefit[] = [];

  if (Math.random() > 0.12) {
    const pct = randomBetween(4.5, 7.5) / 100;
    benefits.push({
      id: crypto.randomUUID(),
      name: 'Health Insurance',
      amount: roundToCents(Math.max(45, grossPerPaycheck * pct)),
      isTaxable: false,
      deductionSource: 'paycheck',
    });
  }

  if (Math.random() > 0.65) {
    benefits.push({
      id: crypto.randomUUID(),
      name: 'Dental & Vision',
      amount: roundToCents(Math.max(10, grossPerPaycheck * randomBetween(0.7, 1.6) / 100)),
      isTaxable: false,
      deductionSource: 'paycheck',
    });
  }

  const retirement: RetirementElection[] = [];
  if (annualGrossPay >= 42000 && (payType === 'salary' ? Math.random() > 0.25 : Math.random() > 0.7)) {
    retirement.push({
      id: crypto.randomUUID(),
      type: '401k',
      employeeContribution: roundToCents(annualGrossPay >= 70000 ? randomBetween(4, 6) : randomBetween(3, 5)),
      employeeContributionIsPercentage: true,
      isPreTax: true,
      deductionSource: 'paycheck',
      hasEmployerMatch: Math.random() > 0.3,
      employerMatchCap: 4,
      employerMatchCapIsPercentage: true,
    });
  }

  const filingStatus: TaxFilingStatus = Math.random() > 0.75 ? 'married_filing_jointly' : 'single';
  const taxSettings = estimateDemoTaxSettings(annualGrossPay, paychecksPerYear, filingStatus);
  const estimatedAnnualNet = estimateAnnualNet(annualGrossPay, paychecksPerYear, benefits, retirement, taxSettings);

  const monthlyGross = annualGrossPay / 12;
  const housingPct = randomBetween(0.30, 0.45);
  const utilitiesPct = randomBetween(0.03, 0.06);

  const billTemplates = [
    { name: 'Rent', basePct: housingPct, baseAmt: 0 },
    { name: 'Utilities', basePct: utilitiesPct, baseAmt: 0 },
    { name: 'Internet', basePct: 0.02, baseAmt: 0 },
    { name: 'Insurance', basePct: 0.05, baseAmt: 0 },
    { name: 'Streaming Service', basePct: 0, baseAmt: 10 },
    { name: 'Gym', basePct: 0, baseAmt: randomBetween(15, 60) },
  ];

  const bills: Bill[] = billTemplates.map((t) => {
    const v = randomBetween(0.88, 1.12);
    const amount = t.basePct === 0
      ? roundToCents(t.baseAmt * v)
      : roundToCents(monthlyGross * t.basePct * v);
    return { id: crypto.randomUUID(), name: t.name, amount, frequency: 'monthly', accountId: checkingId };
  });

  const maxAnnualBills = estimatedAnnualNet * 0.78;
  const currentAnnualBills = bills.reduce((s, b) => s + b.amount * 12, 0);
  if (currentAnnualBills > maxAnnualBills && maxAnnualBills > 0) {
    const scale = maxAnnualBills / currentAnnualBills;
    bills.forEach((b) => { b.amount = roundToCents(Math.max(12, b.amount * scale)); });
  }

  const loans: Loan[] = [];
  const savingsContributions: SavingsContribution[] = [];

  const savingsAccount = accounts.find((a) => a.type === 'savings');
  const investmentAccount = accounts.find((a) => a.type === 'investment');

  if (savingsAccount && Math.random() > 0.25) {
    savingsContributions.push({
      id: crypto.randomUUID(),
      name: 'Emergency Fund Transfer',
      amount: roundToCents(Math.max(25, grossPerPaycheck * randomBetween(0.03, 0.08))),
      frequency: 'bi-weekly',
      accountId: checkingId,
      type: 'savings',
      enabled: true,
    });
  }

  if (investmentAccount && Math.random() > 0.35) {
    savingsContributions.push({
      id: crypto.randomUUID(),
      name: 'Brokerage Auto-Invest',
      amount: roundToCents(Math.max(30, grossPerPaycheck * randomBetween(0.03, 0.07))),
      frequency: 'monthly',
      accountId: checkingId,
      type: 'investment',
      enabled: true,
    });
  }

  if (annualGrossPay >= 50000 && Math.random() > 0.5) {
    const pct = randomBetween(0.25, 0.35);
    const mp = roundToCents(monthlyGross * pct);
    const rate = roundToPrecision(randomBetween(3.5, 6.5), 3);
    const propertyTaxRate = roundToPrecision(randomBetween(0.8, 2.2), 3);
    const term = 360;
    const principal = roundToCents(calculatePrincipal(mp, rate, term));
    const propertyValue = roundToCents(principal * randomBetween(1.05, 1.35));
    const elapsed = Math.floor(Math.random() * 120);
    loans.push({
      id: crypto.randomUUID(),
      name: 'Home Mortgage',
      type: 'mortgage',
      principal,
      currentBalance: roundToCents(calculateRemainingBalance(principal, rate, term, elapsed)),
      interestRate: rate,
      propertyTaxRate,
      propertyValue,
      monthlyPayment: mp,
      accountId: checkingId,
      startDate: new Date(year - Math.floor(elapsed / 12), (new Date().getMonth() - (elapsed % 12) + 12) % 12).toISOString().split('T')[0],
      termMonths: term,
      enabled: true,
    });
  }

  if (annualGrossPay >= 35000 && Math.random() > 0.4) {
    const pct = randomBetween(0.08, 0.14);
    const mp = roundToCents(monthlyGross * pct);
    const rate = roundToPrecision(randomBetween(3.0, 8.5), 3);
    const term = Math.random() > 0.5 ? 60 : 72;
    const principal = roundToCents(calculatePrincipal(mp, rate, term));
    const elapsed = Math.floor(Math.random() * (term * 0.7));
    loans.push({
      id: crypto.randomUUID(),
      name: 'Car Loan',
      type: 'auto',
      principal,
      currentBalance: roundToCents(calculateRemainingBalance(principal, rate, term, elapsed)),
      interestRate: rate,
      monthlyPayment: mp,
      accountId: checkingId,
      startDate: new Date(year - Math.floor(elapsed / 12), (new Date().getMonth() - (elapsed % 12) + 12) % 12).toISOString().split('T')[0],
      termMonths: term,
      enabled: true,
    });
  }

  if (annualGrossPay >= 30000 && annualGrossPay < 90000 && Math.random() > 0.5) {
    const pct = randomBetween(0.07, 0.12);
    const mp = roundToCents(monthlyGross * pct);
    const rate = roundToPrecision(randomBetween(4.5, 7.0), 3);
    const term = 120;
    const principal = roundToCents(calculatePrincipal(mp, rate, term));
    const elapsed = Math.floor(Math.random() * 84);
    loans.push({
      id: crypto.randomUUID(),
      name: 'Student Loans',
      type: 'student',
      principal,
      currentBalance: roundToCents(calculateRemainingBalance(principal, rate, term, elapsed)),
      interestRate: rate,
      monthlyPayment: mp,
      accountId: checkingId,
      startDate: new Date(year - Math.floor(elapsed / 12), (new Date().getMonth() - (elapsed % 12) + 12) % 12).toISOString().split('T')[0],
      termMonths: term,
      enabled: true,
    });
  }

  if (loans.length > 0) {
    const annualBillTotal = bills.reduce((s, b) => s + b.amount * 12, 0);
    const annualLoanTotal = loans.reduce((s, l) => s + (l.monthlyPayment ?? 0) * 12, 0);
    const maxTotal = estimatedAnnualNet * 0.92;
    if (annualBillTotal + annualLoanTotal > maxTotal) {
      const maxLoan = Math.max(0, maxTotal - annualBillTotal);
      const scale = annualLoanTotal > 0 ? maxLoan / annualLoanTotal : 1;
      if (scale < 1) {
        loans.forEach((l) => { l.monthlyPayment = roundToCents(Math.max(10, (l.monthlyPayment ?? 0) * scale)); });
      }
    }
  }

  return {
    id: crypto.randomUUID(),
    name: `${year} Demo Plan`,
    year,
    paySettings: {
      payType,
      ...(payType === 'salary' && { annualSalary }),
      ...(payType === 'hourly' && { hourlyRate, hoursPerPayPeriod }),
      payFrequency,
    },
    preTaxDeductions: [],
    otherIncome: [],
    taxSettings,
    accounts,
    bills,
    loans,
    benefits,
    retirement,
    savingsContributions,
    settings: {
      currency,
      locale: 'en-US',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
