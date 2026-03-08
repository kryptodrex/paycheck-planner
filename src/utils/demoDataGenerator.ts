import type { BudgetData, Account, Bill, Benefit, RetirementElection, PayFrequency, Loan } from '../types/auth';
import { getPaychecksPerYear } from './payPeriod';

/**
 * Generate realistic demo budget data for app demonstration
 */
export function generateDemoBudgetData(year: number, currency: string = 'USD'): BudgetData {
  const payFrequencies: PayFrequency[] = ['weekly', 'bi-weekly', 'semi-monthly', 'monthly'];
  const payFrequency = payFrequencies[Math.floor(Math.random() * payFrequencies.length)];
  const paychecksPerYear = getPaychecksPerYear(payFrequency);

  const isHourly = Math.random() > 0.6; // 40% hourly, 60% salary

  let payType: 'salary' | 'hourly' = 'salary';
  let annualSalary: number | undefined;
  let hourlyRate: number | undefined;
  let hoursPerPayPeriod: number | undefined;
  let annualGrossPay = 0;

  if (isHourly) {
    payType = 'hourly';
    const hourlyRates = [16, 18, 20, 22, 24, 27, 30, 34, 38, 42, 48];
    hourlyRate = hourlyRates[Math.floor(Math.random() * hourlyRates.length)];

    const weeklyHoursOptions = [25, 30, 35, 40];
    const weeklyHours = weeklyHoursOptions[Math.floor(Math.random() * weeklyHoursOptions.length)];
    const weeksPerPaycheck = 52 / paychecksPerYear;
    hoursPerPayPeriod = Math.round(weeklyHours * weeksPerPaycheck);

    annualGrossPay = hourlyRate * weeklyHours * 52;
  } else {
    const salaryOptions = [32000, 38000, 45000, 52000, 60000, 70000, 82000, 92000, 98000];
    annualSalary = salaryOptions[Math.floor(Math.random() * salaryOptions.length)];
    annualGrossPay = annualSalary;
  }

  let federalTaxRate = 10;
  if (annualGrossPay > 50000) federalTaxRate = 12;
  if (annualGrossPay > 80000) federalTaxRate = 18;
  federalTaxRate += Math.random() * 2;
  const stateTaxRate = Math.random() < 0.25 ? 0 : 3 + Math.random() * 4;

  const checkingId = crypto.randomUUID();
  const accounts: Account[] = [
    {
      id: checkingId,
      name: 'My Checking',
      type: 'checking',
      icon: '💳',
      color: '#667eea',
    },
  ];

  const additionalAccountTypes: Array<'savings' | 'investment'> = ['savings', 'investment'];
  const numAdditionalAccounts = Math.floor(Math.random() * 3); // 0-2, total remains 1-3
  if (numAdditionalAccounts > 0) {
    const shuffled = [...additionalAccountTypes].sort(() => Math.random() - 0.5);
    const accountNames = {
      savings: 'Emergency Fund',
      investment: 'Investment Account',
    };
    const accountIcons = {
      savings: '💰',
      investment: '📈',
    };
    const accountColors = {
      savings: '#f093fb',
      investment: '#4facfe',
    };
    for (let i = 0; i < numAdditionalAccounts; i++) {
      const type = shuffled[i];
      accounts.push({
        id: crypto.randomUUID(),
        name: accountNames[type],
        type,
        icon: accountIcons[type],
        color: accountColors[type],
      });
    }
  }

  const grossPerPaycheck = roundToCents(annualGrossPay / paychecksPerYear);

  const benefits: Benefit[] = [];
  if (Math.random() > 0.12) {
    const healthPercent = randomBetween(4.5, 7.5) / 100;
    const healthPerPaycheck = roundToCents(Math.max(45, grossPerPaycheck * healthPercent));
    benefits.push({
      id: crypto.randomUUID(),
      name: 'Health Insurance',
      amount: healthPerPaycheck,
      isTaxable: false,
      deductionSource: 'paycheck',
    });
  }

  if (Math.random() > 0.65) {
    const dentalPerPaycheck = roundToCents(Math.max(10, grossPerPaycheck * randomBetween(0.7, 1.6) / 100));
    benefits.push({
      id: crypto.randomUUID(),
      name: 'Dental & Vision',
      amount: dentalPerPaycheck,
      isTaxable: false,
      deductionSource: 'paycheck',
    });
  }

  const retirement: RetirementElection[] = [];
  const shouldAdd401k = annualGrossPay >= 42000 && (payType === 'salary' ? Math.random() > 0.25 : Math.random() > 0.7);
  if (shouldAdd401k) {
    const employeeContribution = annualGrossPay >= 70000 ? randomBetween(4, 6) : randomBetween(3, 5);
    retirement.push({
      id: crypto.randomUUID(),
      type: '401k',
      employeeContribution: roundToCents(employeeContribution),
      employeeContributionIsPercentage: true,
      isPreTax: true,
      deductionSource: 'paycheck',
      hasEmployerMatch: Math.random() > 0.3,
      employerMatchCap: 4,
      employerMatchCapIsPercentage: true,
    });
  }

  const estimatedAnnualNet = estimateAnnualNetPay({
    annualGrossPay,
    paychecksPerYear,
    federalTaxRate,
    stateTaxRate,
    benefits,
    retirement,
  });

  const monthlyGross = annualGrossPay / 12;

  const housingPercent = randomBetween(0.30, 0.40);
  const utilitiesPercent = randomBetween(0.05, 0.08);

  const targetMonthlyBills = [
    { name: 'Rent', category: 'Housing', basePercent: housingPercent },
    { name: 'Utilities', category: 'Utilities', basePercent: utilitiesPercent },
    { name: 'Internet', category: 'Utilities', basePercent: 0.02 },
    { name: 'Insurance', category: 'Insurance', basePercent: 0.05 },
    { name: 'Streaming Service', category: 'Entertainment', basePercent: 0.01 },
  ];

  const bills: Bill[] = targetMonthlyBills.map((billTemplate) => {
    const variance = randomBetween(0.88, 1.12);
    const monthlyAmount = roundToCents(monthlyGross * billTemplate.basePercent * variance);
    return {
      id: crypto.randomUUID(),
      name: billTemplate.name,
      amount: monthlyAmount,
      frequency: 'monthly',
      accountId: checkingId,
      category: billTemplate.category,
    };
  });

  const maxAnnualBills = estimatedAnnualNet * 0.78;
  const currentAnnualBills = bills.reduce((sum, bill) => sum + bill.amount * 12, 0);
  if (currentAnnualBills > maxAnnualBills && maxAnnualBills > 0) {
    const scale = maxAnnualBills / currentAnnualBills;
    bills.forEach((bill) => {
      bill.amount = roundToCents(Math.max(12, bill.amount * scale));
    });
  }

  // Generate demo loans based on income level and random selection
  const loans: Loan[] = [];
  
  // Mortgage (30-40% of monthly gross for higher earners)
  if (annualGrossPay >= 50000 && Math.random() > 0.5) {
    const mortgagePercent = randomBetween(0.25, 0.35);
    const monthlyPayment = roundToCents(monthlyGross * mortgagePercent);
    const interestRate = randomBetween(3.5, 6.5);
    const termMonths = 360; // 30-year mortgage
    const principal = roundToCents(calculatePrincipal(monthlyPayment, interestRate, termMonths));
    const monthsElapsed = Math.floor(Math.random() * 120); // 0-10 years into mortgage
    const currentBalance = roundToCents(calculateRemainingBalance(principal, interestRate, termMonths, monthsElapsed));
    
    loans.push({
      id: crypto.randomUUID(),
      name: 'Home Mortgage',
      type: 'mortgage',
      principal,
      currentBalance,
      interestRate,
      monthlyPayment,
      accountId: checkingId,
      startDate: new Date(year - Math.floor(monthsElapsed / 12), (new Date().getMonth() - (monthsElapsed % 12) + 12) % 12).toISOString().split('T')[0],
      termMonths,
      enabled: true,
    });
  }

  // Auto loan (10-15% of monthly gross)
  if (annualGrossPay >= 35000 && Math.random() > 0.4) {
    const autoPercent = randomBetween(0.08, 0.14);
    const monthlyPayment = roundToCents(monthlyGross * autoPercent);
    const interestRate = randomBetween(3.0, 8.5);
    const termMonths = Math.random() > 0.5 ? 60 : 72; // 5 or 6 years
    const principal = roundToCents(calculatePrincipal(monthlyPayment, interestRate, termMonths));
    const monthsElapsed = Math.floor(Math.random() * (termMonths * 0.7)); // Up to 70% through loan
    const currentBalance = roundToCents(calculateRemainingBalance(principal, interestRate, termMonths, monthsElapsed));
    
    loans.push({
      id: crypto.randomUUID(),
      name: 'Car Loan',
      type: 'auto',
      principal,
      currentBalance,
      interestRate,
      monthlyPayment,
      accountId: checkingId,
      startDate: new Date(year - Math.floor(monthsElapsed / 12), (new Date().getMonth() - (monthsElapsed % 12) + 12) % 12).toISOString().split('T')[0],
      termMonths,
      enabled: true,
    });
  }

  // Student loans (8-12% of monthly gross for younger/mid-career earners)
  if (annualGrossPay >= 30000 && annualGrossPay < 90000 && Math.random() > 0.5) {
    const studentPercent = randomBetween(0.07, 0.12);
    const monthlyPayment = roundToCents(monthlyGross * studentPercent);
    const interestRate = randomBetween(4.5, 7.0);
    const termMonths = 120; // 10-year standard repayment
    const principal = roundToCents(calculatePrincipal(monthlyPayment, interestRate, termMonths));
    const monthsElapsed = Math.floor(Math.random() * 84); // Up to 7 years in
    const currentBalance = roundToCents(calculateRemainingBalance(principal, interestRate, termMonths, monthsElapsed));
    
    loans.push({
      id: crypto.randomUUID(),
      name: 'Student Loans',
      type: 'student',
      principal,
      currentBalance,
      interestRate,
      monthlyPayment,
      accountId: checkingId,
      startDate: new Date(year - Math.floor(monthsElapsed / 12), (new Date().getMonth() - (monthsElapsed % 12) + 12) % 12).toISOString().split('T')[0],
      termMonths,
      enabled: true,
    });
  }

  // Credit card debt (2-5% of monthly gross, higher chance for lower earners)
  const creditCardChance = annualGrossPay < 45000 ? 0.4 : 0.6;
  if (Math.random() > creditCardChance) {
    const ccPercent = randomBetween(0.02, 0.05);
    const monthlyPayment = roundToCents(monthlyGross * ccPercent);
    const interestRate = randomBetween(15.0, 24.9);
    const currentBalance = roundToCents(monthlyPayment * randomBetween(12, 36)); // 1-3 years worth
    const principal = currentBalance; // Credit cards don't have fixed principal
    
    loans.push({
      id: crypto.randomUUID(),
      name: 'Credit Card',
      type: 'credit-card',
      principal,
      currentBalance,
      interestRate,
      monthlyPayment,
      accountId: checkingId,
      startDate: new Date(year - 1, new Date().getMonth()).toISOString().split('T')[0],
      termMonths: Math.ceil(currentBalance / monthlyPayment), // Estimated payoff time
      enabled: true,
    });
  }

  // Personal loan (5-10% of monthly gross, occasional)
  if (Math.random() > 0.75) {
    const personalPercent = randomBetween(0.05, 0.09);
    const monthlyPayment = roundToCents(monthlyGross * personalPercent);
    const interestRate = randomBetween(7.0, 15.0);
    const termMonths = Math.random() > 0.5 ? 36 : 60; // 3 or 5 years
    const principal = roundToCents(calculatePrincipal(monthlyPayment, interestRate, termMonths));
    const monthsElapsed = Math.floor(Math.random() * (termMonths * 0.5)); // Up to halfway through
    const currentBalance = roundToCents(calculateRemainingBalance(principal, interestRate, termMonths, monthsElapsed));
    
    loans.push({
      id: crypto.randomUUID(),
      name: 'Personal Loan',
      type: 'personal',
      principal,
      currentBalance,
      interestRate,
      monthlyPayment,
      accountId: checkingId,
      startDate: new Date(year - Math.floor(monthsElapsed / 12), (new Date().getMonth() - (monthsElapsed % 12) + 12) % 12).toISOString().split('T')[0],
      termMonths,
      enabled: true,
    });
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
    taxSettings: {
      federalTaxRate: Math.round(federalTaxRate * 100) / 100,
      stateTaxRate: Math.round(stateTaxRate * 100) / 100,
      socialSecurityRate: 6.2,
      medicareRate: 1.45,
      additionalWithholding: 0,
    },
    accounts,
    bills,
    loans,
    benefits,
    retirement,
    settings: {
      currency,
      locale: 'en-US',
      encryptionEnabled: false, // Demo plans are unencrypted for simplicity
      encryptionKey: undefined,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function estimateAnnualNetPay(params: {
  annualGrossPay: number;
  paychecksPerYear: number;
  federalTaxRate: number;
  stateTaxRate: number;
  benefits: Benefit[];
  retirement: RetirementElection[];
}): number {
  const grossPerPaycheck = params.annualGrossPay / params.paychecksPerYear;

  let preTaxPerPaycheck = 0;
  params.benefits.forEach((benefit) => {
    if ((benefit.deductionSource || 'paycheck') === 'paycheck' && !benefit.isTaxable) {
      preTaxPerPaycheck += benefit.isPercentage ? (grossPerPaycheck * benefit.amount) / 100 : benefit.amount;
    }
  });
  params.retirement.forEach((election) => {
    if ((election.deductionSource || 'paycheck') === 'paycheck' && election.isPreTax !== false) {
      preTaxPerPaycheck += election.employeeContributionIsPercentage
        ? (grossPerPaycheck * election.employeeContribution) / 100
        : election.employeeContribution;
    }
  });

  const taxableIncome = Math.max(0, grossPerPaycheck - preTaxPerPaycheck);
  const totalTaxRate =
    params.federalTaxRate + params.stateTaxRate + 6.2 + 1.45;
  const taxesPerPaycheck = (taxableIncome * totalTaxRate) / 100;

  const netPerPaycheck = Math.max(0, taxableIncome - taxesPerPaycheck);
  return roundToCents(netPerPaycheck * params.paychecksPerYear);
}

/**
 * Calculate the original principal amount for a loan given monthly payment, rate, and term
 * Uses the loan payment formula: P = M * [(1 + r)^n - 1] / [r * (1 + r)^n]
 */
function calculatePrincipal(monthlyPayment: number, annualInterestRate: number, termMonths: number): number {
  const monthlyRate = annualInterestRate / 100 / 12;
  
  if (monthlyRate === 0) {
    return monthlyPayment * termMonths;
  }
  
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const principal = monthlyPayment * (factor - 1) / (monthlyRate * factor);
  
  return principal;
}

/**
 * Calculate the remaining balance on a loan after a certain number of months
 * Uses amortization formula: B = P * [(1 + r)^n - (1 + r)^p] / [(1 + r)^n - 1]
 */
function calculateRemainingBalance(
  principal: number,
  annualInterestRate: number,
  termMonths: number,
  monthsElapsed: number
): number {
  if (monthsElapsed >= termMonths) return 0;
  if (monthsElapsed === 0) return principal;
  
  const monthlyRate = annualInterestRate / 100 / 12;
  
  if (monthlyRate === 0) {
    return principal * (1 - monthsElapsed / termMonths);
  }
  
  const factorTotal = Math.pow(1 + monthlyRate, termMonths);
  const factorElapsed = Math.pow(1 + monthlyRate, monthsElapsed);
  const balance = principal * (factorTotal - factorElapsed) / (factorTotal - 1);
  
  return Math.max(0, balance);
}
