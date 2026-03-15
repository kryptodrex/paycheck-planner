import React from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import { calculateAnnualizedPayBreakdown, calculateAnnualizedPaySummary } from '../../../services/budgetCalculations';
import { formatWithSymbol } from '../../../utils/currency';
import { roundUpToCent } from '../../../utils/money';
import { getPaychecksPerYear } from '../../../utils/payPeriod';
import { convertBillToYearly } from '../../../utils/billFrequency';
import { PageHeader } from '../../_shared';
import { GlossaryTerm } from '../../modals/GlossaryModal';
import '../tabViews.shared.css';
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
  const annualizedBreakdown = calculateAnnualizedPayBreakdown(breakdown, paychecksPerYear);

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
  const annualPreTaxDeductions = annualizedBreakdown.preTaxDeductions;
  const annualPostTaxDeductions = annualizedBreakdown.postTaxDeductions;

  const toPercentOfGross = (amount: number) => (annualGross > 0 ? (amount / annualGross) * 100 : 0);
  const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

  const preTaxPct = toPercentOfGross(annualPreTaxDeductions);
  const taxPct = toPercentOfGross(annualTaxes);
  const postTaxPct = toPercentOfGross(annualPostTaxDeductions);
  const netPct = toPercentOfGross(annualNet);

  const flowRows = [
    {
      key: 'gross',
      label: 'Gross Income',
      className: 'km-flow-fill-income',
      amount: annualGross,
      percentage: 100,
    },
    {
      key: 'taxes',
      label: 'Taxes',
      className: 'km-flow-fill-taxes',
      amount: annualTaxes,
      percentage: toPercentOfGross(annualTaxes),
    },
    {
      key: 'net',
      label: 'Take Home Pay',
      className: 'km-flow-fill-net',
      amount: annualNet,
      percentage: toPercentOfGross(annualNet),
    },
    {
      key: 'bills',
      label: 'Bills',
      className: 'km-flow-fill-bills',
      amount: annualBills,
      percentage: toPercentOfGross(annualBills),
    },
    {
      key: 'remaining',
      label: annualRemaining >= 0 ? 'Remaining for Flexible Spending' : 'Shortfall vs Bills',
      className: annualRemaining >= 0 ? 'km-flow-fill-remaining' : 'km-flow-fill-shortfall',
      amount: annualRemaining,
      percentage: toPercentOfGross(annualRemaining),
    },
  ];

  // Get currency from budget settings
  const currency = budgetData.settings.currency || 'USD';

  return (
    <div className="tab-view key-metrics">
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
          title={<>Total <GlossaryTerm termId="withholding">TAXES</GlossaryTerm></>}
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
          title={<>Total <GlossaryTerm termId="net-pay">TAKE HOME PAY</GlossaryTerm></>}
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
          title={<>Your <GlossaryTerm termId="allocation">SAVINGS RATE</GlossaryTerm></>}
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
          title={<><GlossaryTerm termId="residual-amount">REMAINING</GlossaryTerm> for Spending</>}
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

      <div className="km-breakdown-bar">
        <h3>Your Pay Breakdown</h3>
        <div className="km-bar-container">
          {annualPreTaxDeductions > 0 && (
            <div
              className="km-bar-segment km-pretax-segment"
              style={{ width: `${clampPercent(preTaxPct)}%` }}
              title={`Pre-Tax: ${formatWithSymbol(annualPreTaxDeductions, currency, { maximumFractionDigits: 0 })} (${preTaxPct.toFixed(1)}%)`}
            >
              {preTaxPct > 7 && <span>{preTaxPct.toFixed(1)}%</span>}
            </div>
          )}
          <div
            className="km-bar-segment km-tax-segment"
            style={{ width: `${clampPercent(taxPct)}%` }}
            title={`Taxes: ${formatWithSymbol(annualTaxes, currency, { maximumFractionDigits: 0 })} (${taxPct.toFixed(1)}%)`}
          >
            {taxPct > 7 && <span>{taxPct.toFixed(1)}%</span>}
          </div>
          {annualPostTaxDeductions > 0 && (
            <div
              className="km-bar-segment km-posttax-segment"
              style={{ width: `${clampPercent(postTaxPct)}%` }}
              title={`Post-Tax: ${formatWithSymbol(annualPostTaxDeductions, currency, { maximumFractionDigits: 0 })} (${postTaxPct.toFixed(1)}%)`}
            >
              {postTaxPct > 7 && <span>{postTaxPct.toFixed(1)}%</span>}
            </div>
          )}
          <div
            className="km-bar-segment km-net-segment"
            style={{ width: `${clampPercent(netPct)}%` }}
            title={`Net Pay: ${formatWithSymbol(annualNet, currency, { maximumFractionDigits: 0 })} (${netPct.toFixed(1)}%)`}
          >
            {netPct > 7 && <span>{netPct.toFixed(1)}%</span>}
          </div>
        </div>
        <div className="km-bar-labels">
          {annualPreTaxDeductions > 0 && (
            <div className="km-bar-label">
              <span className="km-label-dot km-pretax-dot"></span>
              Pre-Tax Deductions
            </div>
          )}
          <div className="km-bar-label">
            <span className="km-label-dot km-tax-dot"></span>
            Taxes
          </div>
          {annualPostTaxDeductions > 0 && (
            <div className="km-bar-label">
              <span className="km-label-dot km-posttax-dot"></span>
              Post-Tax Deductions
            </div>
          )}
          <div className="km-bar-label">
            <span className="km-label-dot km-net-dot"></span>
            Take Home
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="summary-bar">
        <h3>Money Flow Summary</h3>
        <div className="km-flow-summary-list">
          {flowRows.map((row) => {
            const absolutePercent = Math.abs(row.percentage);
            const widthPercent = row.key === 'gross' ? 100 : clampPercent(absolutePercent);

            return (
              <div key={row.key} className="km-flow-summary-row">
                <div className="km-flow-summary-head">
                  <span className="km-flow-summary-label">
                    {row.key === 'gross' && <GlossaryTerm termId="gross-pay">{row.label}</GlossaryTerm>}
                    {row.key === 'taxes' && <GlossaryTerm termId="withholding">{row.label}</GlossaryTerm>}
                    {row.key === 'net' && <GlossaryTerm termId="net-pay">{row.label}</GlossaryTerm>}
                    {row.key !== 'gross' && row.key !== 'taxes' && row.key !== 'net' && row.label}
                  </span>
                  <span className="km-flow-summary-value">
                    {formatWithSymbol(row.amount, currency, { maximumFractionDigits: 0 })}
                    {row.key !== 'gross' && annualGross > 0 && (
                      <span className="km-flow-summary-percent"> ({row.percentage.toFixed(1)}%)</span>
                    )}
                  </span>
                </div>
                <div className="km-flow-track" aria-hidden="true">
                  <div
                    className={`km-flow-fill ${row.className}`}
                    style={{ width: `${widthPercent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KeyMetrics;
