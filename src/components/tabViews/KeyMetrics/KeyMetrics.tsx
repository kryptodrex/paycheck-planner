import React from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import { calculateAnnualizedPayBreakdown, calculateAnnualizedPaySummary } from '../../../services/budgetCalculations';
import { formatWithSymbol } from '../../../utils/currency';
import { roundUpToCent } from '../../../utils/money';
import { getPaychecksPerYear } from '../../../utils/payPeriod';
import { convertBillToYearly } from '../../../utils/billFrequency';
import { buildKeyMetricsSegments } from '../../../utils/keyMetricsSegments';
import type { KeyMetricsBreakdownView } from '../../../types/settings';
import { PageHeader, ViewModeSelector } from '../../_shared';
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

type BreakdownView = 'bars' | 'stacked' | 'pie';

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
  const { budgetData, calculatePaycheckBreakdown, calculateRetirementContributions, updateBudgetSettings } = useBudget();
  const [hoveredPieKey, setHoveredPieKey] = React.useState<string | null>(null);

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

  const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

  // Break net into its real sub-components so every dollar of gross is accounted for in the bar.
  const annualBillsCoveredByNet = roundUpToCent(Math.min(Math.max(annualBills, 0), Math.max(annualNet, 0)));
  const annualRemainingPositive = roundUpToCent(Math.max(annualRemaining, 0));
  const annualShortfall = roundUpToCent(Math.max(-annualRemaining, 0));
  const annualSavingsInBar = roundUpToCent(Math.min(annualSavings, annualRemainingPositive));
  const annualFlexibleRemaining = roundUpToCent(Math.max(annualRemainingPositive - annualSavingsInBar, 0));

  // Ensure tiny non-zero amounts are still visibly represented in UI bars.
  const MIN_VISIBLE_STACKED_BAR_PX = 4;
  const MIN_VISIBLE_SUMMARY_PERCENT = 0.8;
  const MIN_VISIBLE_SUMMARY_BAR_PX = 4;

  const { barSegments, flowRows } = buildKeyMetricsSegments({
    annualGross,
    annualTaxes,
    annualPreTaxDeductions,
    annualPostTaxDeductions,
    annualBillsCoveredByNet,
    annualSavingsInBar,
    annualFlexibleRemaining,
    annualShortfall,
  });

  const breakdownView: BreakdownView = (budgetData.settings.keyMetricsBreakdownView as BreakdownView) || 'bars';

  const handleBreakdownViewChange = (nextView: BreakdownView) => {
    if (nextView === breakdownView) return;
    updateBudgetSettings({
      ...budgetData.settings,
      keyMetricsBreakdownView: nextView as KeyMetricsBreakdownView,
    });
  };

  const pieColorByKey: Record<string, string> = {
    pretax: 'var(--warning-color)',
    taxes: 'var(--error-color)',
    posttax: '#f43f5e',
    bills: '#f97316',
    savings: 'var(--cyan-color)',
    remaining: 'var(--violet-color)',
    shortfall: '#991b1b',
  };

  const pieTotal = barSegments.reduce((sum, segment) => sum + segment.amount, 0);
  const PIE_RADIUS = 38;
  const PIE_CIRCUMFERENCE = 2 * Math.PI * PIE_RADIUS;
  const PIE_GAP = 1.6;
  const PIE_MIN_DASH = 2;

  let pieProgress = 0;
  const pieStrokeSegments = pieTotal > 0
    ? barSegments.map((segment) => {
      const fraction = segment.amount / pieTotal;
      const rawDash = fraction * PIE_CIRCUMFERENCE;
      const dash = Math.min(PIE_CIRCUMFERENCE, Math.max(PIE_MIN_DASH, rawDash - PIE_GAP));
      const dashOffset = -((pieProgress / pieTotal) * PIE_CIRCUMFERENCE);
      pieProgress += segment.amount;

      return {
        key: segment.key,
        label: segment.label,
        amount: segment.amount,
        pct: segment.pct,
        color: pieColorByKey[segment.key] || 'var(--accent-primary)',
        dash,
        dashOffset,
      };
    })
    : [];

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

      <div className="summary-bar">
        <div className="km-breakdown-header">
          <h3>Your Yearly Pay Breakdown</h3>
          <ViewModeSelector
            mode={breakdownView}
            onChange={(mode) => handleBreakdownViewChange(mode as BreakdownView)}
            options={[
              { value: 'bars', label: 'Bars' },
              { value: 'stacked', label: 'Stacked' },
              { value: 'pie', label: 'Pie' },
            ]}
          />
        </div>

        {breakdownView === 'bars' && (
          <div className="km-flow-summary-list">
            {flowRows.map((row) => {
              const absolutePercent = Math.abs(row.percentage);
              const widthPercent = row.key === 'gross'
                ? 100
                : row.amount > 0
                  ? Math.max(clampPercent(absolutePercent), MIN_VISIBLE_SUMMARY_PERCENT)
                  : 0;

              return (
                <div key={row.key} className="km-flow-summary-row">
                  <div className="km-flow-summary-head">
                    <span className="km-flow-summary-label">
                      {row.glossaryTermId ? <GlossaryTerm termId={row.glossaryTermId}>{row.label}</GlossaryTerm> : row.label}
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
                      className={`km-flow-fill ${row.fillClass}`}
                      style={{
                        width: `${widthPercent}%`,
                        minWidth: row.key !== 'gross' && row.amount > 0 ? `${MIN_VISIBLE_SUMMARY_BAR_PX}px` : undefined,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {breakdownView === 'stacked' && (
          <>
            <div className="km-bar-container">
              {barSegments.map((segment) => (
                <div
                  key={segment.key}
                  className={`km-bar-segment ${segment.segmentClass}`}
                  style={{
                    width: `${clampPercent(segment.pct)}%`,
                    minWidth: segment.amount > 0 ? `${MIN_VISIBLE_STACKED_BAR_PX}px` : undefined,
                  }}
                  title={`${segment.label}: ${formatWithSymbol(segment.amount, currency, { maximumFractionDigits: 0 })} (${segment.pct.toFixed(1)}%)`}
                >
                  {segment.pct > 7 && <span>{segment.pct.toFixed(1)}%</span>}
                </div>
              ))}
            </div>
            <div className="km-bar-labels">
              {barSegments.map((segment) => (
                <div key={`legend-${segment.key}`} className="km-bar-label">
                  <span className={`km-label-dot ${segment.dotClass}`}></span>
                  {segment.label}
                </div>
              ))}
            </div>
          </>
        )}

        {breakdownView === 'pie' && (
          <div className="km-pie-view">
            <div
              className="km-pie-chart"
              role="img"
              aria-label="Pay breakdown pie chart"
              onMouseLeave={() => setHoveredPieKey(null)}
            >
              <svg className="km-pie-svg" viewBox="0 0 100 100" aria-hidden="true">
                <circle className="km-pie-ring-base" cx="50" cy="50" r={PIE_RADIUS} />
                {pieStrokeSegments.map((slice) => (
                  <circle
                    key={slice.key}
                    className={`km-pie-segment ${hoveredPieKey && hoveredPieKey !== slice.key ? 'is-dimmed' : ''} ${hoveredPieKey === slice.key ? 'is-active' : ''}`}
                    cx="50"
                    cy="50"
                    r={PIE_RADIUS}
                    stroke={slice.color}
                    strokeDasharray={`${slice.dash} ${PIE_CIRCUMFERENCE - slice.dash}`}
                    strokeDashoffset={slice.dashOffset}
                    onMouseEnter={() => setHoveredPieKey(slice.key)}
                    onFocus={() => setHoveredPieKey(slice.key)}
                    onBlur={() => setHoveredPieKey(null)}
                  />
                ))}
              </svg>
              <div className="km-pie-center">
                <span>Gross Pay</span>
                <strong>{formatWithSymbol(pieTotal, currency, { maximumFractionDigits: 0 })}</strong>
              </div>
            </div>
            <div className="km-pie-legend">
              {barSegments.map((segment) => (
                <div
                  key={`pie-${segment.key}`}
                  className={`km-pie-legend-item ${hoveredPieKey && hoveredPieKey !== segment.key ? 'is-dimmed' : ''} ${hoveredPieKey === segment.key ? 'is-active' : ''}`}
                  onMouseEnter={() => setHoveredPieKey(segment.key)}
                  onMouseLeave={() => setHoveredPieKey(null)}
                >
                  <span className={`km-label-dot ${segment.dotClass}`}></span>
                  <span className="km-pie-legend-label">{segment.label}</span>
                  <span className="km-pie-legend-value">
                    {formatWithSymbol(segment.amount, currency, { maximumFractionDigits: 0 })} ({segment.pct.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyMetrics;
