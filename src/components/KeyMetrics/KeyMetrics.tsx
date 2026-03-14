import React from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { calculateAnnualizedPaySummary } from '../../services/budgetCalculations';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { roundUpToCent } from '../../utils/money';
import { getPaychecksPerYear } from '../../utils/payPeriod';
import { convertBillToYearly } from '../../utils/billFrequency';
import { PageHeader } from '../shared';
import { GlossaryTerm } from '../Glossary';
import './KeyMetrics.css';

interface KeyMetricsProps {
  onNavigateToTaxes?: () => void;
  onNavigateToNetPay?: () => void;
  onNavigateToSavings?: () => void;
  onNavigateToBills?: () => void;
  onNavigateToRemaining?: () => void;
}

interface MetricCardProps {
  className: string;
  icon: string;
  title: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
  children: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ className, icon, title, ariaLabel, onClick, children }) => {
  const isInteractive = Boolean(onClick);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) return;

    const target = event.target as HTMLElement;
    if (target.closest('.glossary-term-button')) {
      return;
    }

    onClick();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`metric-card ${className} ${isInteractive ? 'metric-card-interactive' : ''}`.trim()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? ariaLabel : undefined}
    >
      <div className="metric-icon">{icon}</div>
      <h3>{title}</h3>
      <div className="metric-values">{children}</div>
    </div>
  );
};

const KeyMetrics: React.FC<KeyMetricsProps> = ({
  onNavigateToTaxes,
  onNavigateToNetPay,
  onNavigateToSavings,
  onNavigateToBills,
  onNavigateToRemaining,
}) => {
  const { budgetData, calculatePaycheckBreakdown, calculateRetirementContributions } = useBudget();

  if (!budgetData) return null;

  const breakdown = calculatePaycheckBreakdown();

  // Calculate annualized values
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  const {
    annualGross,
    annualNet,
    annualTaxes,
    monthlyGross,
    monthlyNet,
    monthlyTaxes,
  } = calculateAnnualizedPaySummary(breakdown, paychecksPerYear);

  // Calculate total bills (annualized)
  const annualBills = roundUpToCent(budgetData.bills.reduce((sum, bill) => {
    return sum + convertBillToYearly(bill.amount, bill.frequency);
  }, 0));

  // Calculate monthly averages
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
  const effectiveTaxRate = annualGross > 0 ? (annualTaxes / annualGross) * 100 : 0;
  const remainingShareOfNet = annualNet > 0 ? (annualRemaining / annualNet) * 100 : 0;

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
        <MetricCard 
          className="income-card" 
          icon="💰" 
          title="Total Income" 
          ariaLabel="Total income overview"
          onClick={onNavigateToNetPay}
        >
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
        </MetricCard>

        {/* Taxes Card */}
        <MetricCard
          className="taxes-card"
          icon="🏛️"
          title={<>Total <GlossaryTerm termId="withholding">Taxes</GlossaryTerm></>}
          ariaLabel="Open taxes tab"
          onClick={onNavigateToTaxes}
        >
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
              <span className="value">{effectiveTaxRate.toFixed(1)}%</span>
            </div>
        </MetricCard>

        {/* Net Pay Card */}
        <MetricCard
          className="net-card"
          icon="✅"
          title={<>Total <GlossaryTerm termId="net-pay">Take Home Pay</GlossaryTerm></>}
          ariaLabel="Open pay breakdown tab"
          onClick={onNavigateToNetPay}
        >
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
        </MetricCard>

        {/* Bills Card */}
        <MetricCard
          className="bills-card"
          icon="📋"
          title="Total Bills"
          ariaLabel="Open bills tab"
          onClick={onNavigateToBills}
        >
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
        </MetricCard>

        {/* Savings Rate Card */}
        <MetricCard
          className="savings-card"
          icon="🏦"
          title={<>Your <GlossaryTerm termId="allocation">Savings Rate</GlossaryTerm></>}
          ariaLabel="Open savings tab"
          onClick={onNavigateToSavings}
        >
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
        </MetricCard>

        {/* Remaining Card */}
        <MetricCard
          className="remaining-card"
          icon="💵"
          title={<><GlossaryTerm termId="residual-amount">Remaining</GlossaryTerm> for Spending</>}
          ariaLabel="Open pay breakdown tab and scroll to remaining spending"
          onClick={onNavigateToRemaining}
        >
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
              <span className="value">{remainingShareOfNet.toFixed(1)}%</span>
            </div>
        </MetricCard>
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
