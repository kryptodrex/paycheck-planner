import React from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { roundUpToCent } from '../../utils/money';
import { getPaychecksPerYear } from '../../utils/payPeriod';
import { convertBillToYearly } from '../../utils/billFrequency';
import { PageHeader } from '../shared';
import { GlossaryTerm } from '../Glossary';
import './KeyMetrics.css';

const KeyMetrics: React.FC = () => {
  const { budgetData, calculatePaycheckBreakdown, calculateRetirementContributions } = useBudget();

  if (!budgetData) return null;

  const breakdown = calculatePaycheckBreakdown();

  // Calculate annualized values
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  const annualGross = roundUpToCent(breakdown.grossPay * paychecksPerYear);
  const annualNet = roundUpToCent(breakdown.netPay * paychecksPerYear);
  const annualTaxes = roundUpToCent(breakdown.totalTaxes * paychecksPerYear);

  // Calculate total bills (annualized)
  const annualBills = roundUpToCent(budgetData.bills.reduce((sum, bill) => {
    return sum + convertBillToYearly(bill.amount, bill.frequency);
  }, 0));

  // Calculate monthly averages
  const monthlyGross = roundUpToCent(annualGross / 12);
  const monthlyNet = roundUpToCent(annualNet / 12);
  const monthlyTaxes = roundUpToCent(annualTaxes / 12);
  const monthlyBills = roundUpToCent(annualBills / 12);

  // Calculate remaining/free money
  const annualRemaining = roundUpToCent(annualNet - annualBills);
  const monthlyRemaining = roundUpToCent(annualRemaining / 12);

  // Calculate savings rate (savings-account allocations + retirement contributions)
  const savingsAccounts = budgetData.accounts.filter(a => a.type === 'savings');
  const annualSavingsFromAccounts = roundUpToCent(savingsAccounts.reduce((sum, account) => {
    // Use category-based allocations
    const categories = account.allocationCategories || [];
    const accountTotal = categories.reduce((catSum, cat) => catSum + cat.amount, 0);
    return sum + (accountTotal * paychecksPerYear);
  }, 0));

  const annualSavingsFromRetirement = roundUpToCent((budgetData.retirement || []).reduce((sum, election) => {
    const { employeeAmount } = calculateRetirementContributions(election);
    return sum + (employeeAmount * paychecksPerYear);
  }, 0));

  const annualSavings = roundUpToCent(annualSavingsFromAccounts + annualSavingsFromRetirement);
  const savingsRate = annualGross > 0 ? (annualSavings / annualGross) * 100 : 0;

  // Get currency from budget settings
  const currency = budgetData.settings.currency || 'USD';

  return (
    <div className="key-metrics">
      <PageHeader
        title="Key Metrics"
        subtitle="Your financial overview at a glance"
      />
      <div className="metrics-grid">
        {/* Income Card */}
        <div className="metric-card income-card">
          <div className="metric-icon">💰</div>
          <h3>Total Income</h3>
          <div className="metric-values">
            <div className="metric-primary">
              <span className="label">Yearly</span>
              <span className="value">{formatWithSymbol(annualGross, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">{formatWithSymbol(monthlyGross, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Per Paycheck</span>
              <span className="value">{formatWithSymbol(breakdown.grossPay, currency, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Taxes Card */}
        <div className="metric-card taxes-card">
          <div className="metric-icon">🏛️</div>
          <h3><GlossaryTerm termId="withholding">Taxes</GlossaryTerm></h3>
          <div className="metric-values">
            <div className="metric-primary">
              <span className="label">Yearly</span>
              <span className="value">{formatWithSymbol(annualTaxes, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">{formatWithSymbol(monthlyTaxes, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Effective Rate</span>
              <span className="value">{((annualTaxes / annualGross) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Net Pay Card */}
        <div className="metric-card net-card">
          <div className="metric-icon">✅</div>
          <h3><GlossaryTerm termId="net-pay">Net Pay</GlossaryTerm> (Take Home)</h3>
          <div className="metric-values">
            <div className="metric-primary">
              <span className="label">Yearly</span>
              <span className="value">{formatWithSymbol(annualNet, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">{formatWithSymbol(monthlyNet, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Per Paycheck</span>
              <span className="value">{formatWithSymbol(breakdown.netPay, currency, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Bills Card */}
        <div className="metric-card bills-card">
          <div className="metric-icon">📋</div>
          <h3>Total Bills</h3>
          <div className="metric-values">
            <div className="metric-primary">
              <span className="label">Yearly</span>
              <span className="value">{formatWithSymbol(annualBills, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">{formatWithSymbol(monthlyBills, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Count</span>
              <span className="value">{budgetData.bills.length} bills</span>
            </div>
          </div>
        </div>

        {/* Remaining Card */}
        <div className="metric-card remaining-card">
          <div className="metric-icon">💵</div>
          <h3><GlossaryTerm termId="residual-amount">Remaining</GlossaryTerm> (After Bills)</h3>
          <div className="metric-values">
            <div className="metric-primary">
              <span className="label">Yearly</span>
              <span className="value">{formatWithSymbol(annualRemaining, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly</span>
              <span className="value">{formatWithSymbol(monthlyRemaining, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">% of Net</span>
              <span className="value">{((annualRemaining / annualNet) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="metric-card savings-card">
          <div className="metric-icon">🏦</div>
          <h3><GlossaryTerm termId="allocation">Savings Rate</GlossaryTerm></h3>
          <div className="metric-values">
            <div className="metric-primary">
              <span className="label">Rate</span>
              <span className="value">{savingsRate.toFixed(1)}%</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Yearly Savings</span>
              <span className="value">{formatWithSymbol(annualSavings, currency, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="metric-secondary">
              <span className="label">Monthly Savings</span>
              <span className="value">{formatWithSymbol(annualSavings / 12, currency, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="summary-bar">
        <h3>Money Flow Summary</h3>
        <div className="flow-visual">
          <div 
            className="flow-segment income-segment" 
            style={{ width: '100%' }}
            title={`Gross Income: ${formatWithSymbol(annualGross, currency, { maximumFractionDigits: 0 })}`}
          >
            <span><GlossaryTerm termId="gross-pay">Gross</GlossaryTerm>: {getCurrencySymbol(currency)}{(annualGross / 1000).toFixed(0)}k</span>
          </div>
          <div className="flow-arrow">→</div>
          <div 
            className="flow-segment taxes-segment" 
            style={{ width: `${(annualTaxes / annualGross) * 100}%` }}
            title={`Taxes: ${formatWithSymbol(annualTaxes, currency, { maximumFractionDigits: 0 })}`}
          >
            <span><GlossaryTerm termId="withholding">Taxes</GlossaryTerm>: {getCurrencySymbol(currency)}{(annualTaxes / 1000).toFixed(0)}k</span>
          </div>
          <div className="flow-arrow">→</div>
          <div 
            className="flow-segment net-segment" 
            style={{ width: `${(annualNet / annualGross) * 100}%` }}
            title={`Net Pay: ${formatWithSymbol(annualNet, currency, { maximumFractionDigits: 0 })}`}
          >
            <span><GlossaryTerm termId="net-pay">Net</GlossaryTerm>: {getCurrencySymbol(currency)}{(annualNet / 1000).toFixed(0)}k</span>
          </div>
          <div className="flow-arrow">→</div>
          <div 
            className="flow-segment bills-segment" 
            style={{ width: `${(annualBills / annualGross) * 100}%` }}
            title={`Bills: ${formatWithSymbol(annualBills, currency, { maximumFractionDigits: 0 })}`}
          >
            <span>Bills: {getCurrencySymbol(currency)}{(annualBills / 1000).toFixed(0)}k</span>
          </div>
          <div className="flow-arrow">→</div>
          <div 
            className="flow-segment remaining-segment" 
            style={{ width: `${(annualRemaining / annualGross) * 100}%` }}
            title={`Remaining: ${formatWithSymbol(annualRemaining, currency, { maximumFractionDigits: 0 })}`}
          >
            <span>Left: {getCurrencySymbol(currency)}{(annualRemaining / 1000).toFixed(0)}k</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyMetrics;
