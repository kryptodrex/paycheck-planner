// Agent Context Service — Serializes the user's plan into a structured text
// block that is included as the system message in every Ollama chat request.
// No file paths, encryption keys, or account numbers are included.

import type { BudgetData } from '../types/budget';
import type { PaycheckBreakdown } from '../types/payroll';
import { getPaychecksPerYear } from '../utils/payPeriod';

/** Frequency labels for human-readable output. */
const FREQ_LABELS: Record<string, string> = {
  weekly: 'weekly',
  'bi-weekly': 'bi-weekly',
  'semi-monthly': 'semi-monthly',
  monthly: 'monthly',
  quarterly: 'quarterly',
  'semi-annually': 'semi-annually',
  annually: 'annually',
  custom: 'custom',
};

/** Rough monthly multiplier for a given bill frequency. */
function toMonthlyFactor(frequency: string): number {
  switch (frequency) {
    case 'weekly': return 52 / 12;
    case 'bi-weekly': return 26 / 12;
    case 'semi-monthly': return 2;
    case 'monthly': return 1;
    case 'quarterly': return 1 / 3;
    case 'semi-annually': return 1 / 6;
    case 'annually': return 1 / 12;
    default: return 1;
  }
}

/**
 * Builds a plain-text financial summary of the user's plan suitable for
 * inclusion as an LLM system message.
 */
export function buildAgentContext(budget: BudgetData, breakdown: PaycheckBreakdown): string {
  const currency = budget.settings.currency ?? 'USD';
  const locale = budget.settings.locale ?? 'en-US';
  const paychecksPerYear = getPaychecksPerYear(budget.paySettings.payFrequency);

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

  const lines: string[] = [];

  // ── Header ──────────────────────────────────────────────────────────────────
  lines.push(`Plan: ${budget.name} (${budget.year})`);
  lines.push(`Pay frequency: ${FREQ_LABELS[budget.paySettings.payFrequency] ?? budget.paySettings.payFrequency} (${paychecksPerYear} paychecks/year)`);
  lines.push(`Gross pay per paycheck: ${fmt(breakdown.grossPay)}`);
  lines.push(`Net pay per paycheck: ${fmt(breakdown.netPay)}`);
  lines.push(`Annual gross (estimated): ${fmt(breakdown.grossPay * paychecksPerYear)}`);
  lines.push('');

  // ── Taxes ───────────────────────────────────────────────────────────────────
  if (breakdown.taxLineAmounts.length > 0 || breakdown.additionalWithholding > 0) {
    lines.push('Tax withholdings per paycheck:');
    for (const line of breakdown.taxLineAmounts) {
      lines.push(`  - ${line.label}: ${fmt(line.amount)}`);
    }
    if (breakdown.additionalWithholding > 0) {
      lines.push(`  - Additional withholding: ${fmt(breakdown.additionalWithholding)}`);
    }
    lines.push(`  Total taxes: ${fmt(breakdown.totalTaxes)}`);
    lines.push('');
  }

  // ── Pre-tax deductions ───────────────────────────────────────────────────────
  if (breakdown.preTaxDeductions > 0) {
    lines.push(`Pre-tax deductions per paycheck: ${fmt(breakdown.preTaxDeductions)}`);
    lines.push('');
  }

  // ── Benefits ─────────────────────────────────────────────────────────────────
  const enabledBenefits = budget.benefits.filter((b) => b.enabled !== false);
  if (enabledBenefits.length > 0) {
    lines.push('Benefits/deductions per paycheck:');
    for (const b of enabledBenefits) {
      const amt = b.isPercentage ? (breakdown.grossPay * b.amount) / 100 : b.amount;
      const taxLabel = b.isTaxable ? 'taxable' : 'pre-tax';
      lines.push(`  - ${b.name}: ${fmt(amt)} (${taxLabel})`);
    }
    lines.push('');
  }

  // ── Retirement ───────────────────────────────────────────────────────────────
  const enabledRetirement = budget.retirement.filter((r) => r.enabled !== false);
  if (enabledRetirement.length > 0) {
    lines.push('Retirement contributions per paycheck:');
    for (const r of enabledRetirement) {
      const empAmt = r.employeeContributionIsPercentage
        ? (breakdown.grossPay * r.employeeContribution) / 100
        : r.employeeContribution;
      const matchNote = r.hasEmployerMatch
        ? `, employer match up to ${r.employerMatchCapIsPercentage ? `${r.employerMatchCap}%` : fmt(r.employerMatchCap)}`
        : '';
      const label = r.customLabel ?? r.type;
      lines.push(`  - ${label}: Employee ${fmt(empAmt)}${matchNote}`);
      if (r.yearlyLimit) {
        lines.push(`    Annual limit: ${fmt(r.yearlyLimit)}`);
      }
    }
    lines.push('');
  }

  // ── Bills ────────────────────────────────────────────────────────────────────
  const enabledBills = budget.bills.filter((b) => b.enabled !== false);
  let totalBillsPerPaycheck = 0;
  if (enabledBills.length > 0) {
    lines.push('Recurring bills:');
    for (const b of enabledBills) {
      const monthlyAmt = b.amount * toMonthlyFactor(b.frequency);
      const perPaycheck = (monthlyAmt * 12) / paychecksPerYear;
      totalBillsPerPaycheck += perPaycheck;
      const freqLabel = FREQ_LABELS[b.frequency] ?? b.frequency;
      const discretionary = b.discretionary ? ' (discretionary)' : '';
      lines.push(
        `  - ${b.name}: ${fmt(b.amount)}/${freqLabel}${discretionary} (~${fmt(perPaycheck)}/paycheck)`,
      );
    }
    lines.push(`  Total bills per paycheck: ~${fmt(totalBillsPerPaycheck)}`);
    lines.push('');
  }

  // ── Loans ─────────────────────────────────────────────────────────────────────
  let totalLoansPerPaycheck = 0;
  const enabledLoans = budget.loans.filter((l) => l.enabled !== false);
  if (enabledLoans.length > 0) {
    lines.push('Loans / debt payments:');
    for (const l of enabledLoans) {
      const perPaycheck = (l.monthlyPayment * 12) / paychecksPerYear;
      totalLoansPerPaycheck += perPaycheck;
      const balance = l.currentBalance > 0 ? `, balance: ${fmt(l.currentBalance)}` : '';
      const rate = l.interestRate > 0 ? ` at ${l.interestRate}% APR` : '';
      lines.push(`  - ${l.name} (${l.type}): ${fmt(l.monthlyPayment)}/month${rate}${balance} (~${fmt(perPaycheck)}/paycheck)`);
    }
    lines.push(`  Total loan payments per paycheck: ~${fmt(totalLoansPerPaycheck)}`);
    lines.push('');
  }

  // ── Savings ──────────────────────────────────────────────────────────────────
  let totalSavingsPerPaycheck = 0;
  const enabledSavings = (budget.savingsContributions ?? []).filter((s) => s.enabled !== false);
  if (enabledSavings.length > 0) {
    lines.push('Savings contributions:');
    for (const s of enabledSavings) {
      const monthlyAmt = s.amount * toMonthlyFactor(s.frequency);
      const perPaycheck = (monthlyAmt * 12) / paychecksPerYear;
      totalSavingsPerPaycheck += perPaycheck;
      const freqLabel = FREQ_LABELS[s.frequency] ?? s.frequency;
      lines.push(`  - ${s.name}: ${fmt(s.amount)}/${freqLabel} (~${fmt(perPaycheck)}/paycheck)`);
    }
    lines.push(`  Total savings per paycheck: ~${fmt(totalSavingsPerPaycheck)}`);
    lines.push('');
  }

  // ── Spending summary ─────────────────────────────────────────────────────────
  // Retirement contributions reduce take-home even if they come from gross.
  let totalRetirementPerPaycheck = 0;
  for (const r of budget.retirement.filter((r) => r.enabled !== false)) {
    const empAmt = r.employeeContributionIsPercentage
      ? (breakdown.grossPay * r.employeeContribution) / 100
      : r.employeeContribution;
    totalRetirementPerPaycheck += empAmt;
  }

  const totalObligationsPerPaycheck =
    totalBillsPerPaycheck + totalLoansPerPaycheck + totalSavingsPerPaycheck + totalRetirementPerPaycheck;
  const remainingForSpending = breakdown.netPay - totalBillsPerPaycheck - totalLoansPerPaycheck - totalSavingsPerPaycheck;

  lines.push('Per-paycheck spending summary:');
  lines.push(`  Net pay:                   ${fmt(breakdown.netPay)}`);
  if (totalBillsPerPaycheck > 0)     lines.push(`  Bills:                    -${fmt(totalBillsPerPaycheck)}`);
  if (totalLoansPerPaycheck > 0)     lines.push(`  Loan payments:            -${fmt(totalLoansPerPaycheck)}`);
  if (totalSavingsPerPaycheck > 0)   lines.push(`  Savings:                  -${fmt(totalSavingsPerPaycheck)}`);
  lines.push(`  Total obligations:        -${fmt(totalObligationsPerPaycheck)}`);
  lines.push(`  Remaining for spending:    ${fmt(remainingForSpending)}`);
  lines.push('');

  return lines.join('\n');
}

/** The system prompt wrapping the financial context. */
export function buildSystemPrompt(agentContext: string): string {
  return `You are a helpful financial planning assistant embedded in Paycheck Planner, a desktop budgeting app.

You have access to the user's current financial plan (provided below). Use it to give accurate, personalized, and concise advice. Focus on actionable insights.

--- CURRENT PLAN ---
${agentContext}
--- END PLAN ---

Guidelines:
- Use the plan numbers as the baseline for all calculations.
- For hypothetical questions (e.g. "what if my rent went up to $X"), do the arithmetic: adjust the specific line item, recalculate affected totals, and show the updated figures clearly.
- When recalculating a hypothetical, always restate the new per-paycheck total for the changed category and the new remaining amount after all obligations.
- Keep responses concise and practical (2-4 sentences for simple questions, more detail when needed).
- If asked about something not covered in the plan, say so clearly and apologize for not being able to assist.
- IMPORTANT: Do not ask for social security numbers, bank account numbers, or other sensitive identifiers! If a user gives these, respond with a warning about sharing sensitive information and do not include them in any calculations or summaries.
- All amounts are in the user's selected currency unless otherwise noted.`;
}
