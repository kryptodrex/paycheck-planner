import type { BudgetData, Account, Bill, Benefit, RetirementElection, PayFrequency } from '../types/auth';

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

function getPaychecksPerYear(frequency: PayFrequency): number {
  switch (frequency) {
    case 'weekly':
      return 52;
    case 'bi-weekly':
      return 26;
    case 'semi-monthly':
      return 24;
    case 'monthly':
      return 12;
    default:
      return 26;
  }
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
